import { prisma } from "@/lib/prisma";
import { normalizeLetterboxdActivityUrl } from "@/lib/letterboxd-url";
import { getMovie, searchMovie } from "@/lib/tmdb";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

export interface LetterboxdSyncResult {
  synced: number;
  skipped: number;
  alreadyWatched: number;
}

interface DiaryEntry {
  filmTitle: string;
  filmYear: number | null;
  watchedDate: Date | null;
  rating: number | null;
  tmdbMovieId: number | null;
  /** RSS item link (user film / diary page on Letterboxd). */
  activityUrl: string | null;
}

async function fetchRss(username: string): Promise<string> {
  const res = await fetch(`https://letterboxd.com/${username}/rss/`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching Letterboxd RSS`);
  return res.text();
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
  return match ? match[1].trim() : null;
}

function parseDiaryEntries(xml: string): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const filmTitle = extractTag(block, "letterboxd:filmTitle");
    if (!filmTitle) continue;

    const filmYearStr = extractTag(block, "letterboxd:filmYear");
    const filmYear = filmYearStr ? parseInt(filmYearStr, 10) : null;

    const watchedDateStr = extractTag(block, "letterboxd:watchedDate");
    const watchedDate = watchedDateStr ? new Date(watchedDateStr) : null;

    const ratingStr = extractTag(block, "letterboxd:memberRating");
    const rating = ratingStr ? parseFloat(ratingStr) : null;

    const tmdbIdStr = extractTag(block, "tmdb:movieId");
    const tmdbMovieId = tmdbIdStr ? parseInt(tmdbIdStr, 10) : null;

    const linkRaw = extractTag(block, "link");
    const activityUrl = normalizeLetterboxdActivityUrl(linkRaw);

    entries.push({ filmTitle, filmYear, watchedDate, rating, tmdbMovieId, activityUrl });
  }

  return entries;
}

async function resolveToTmdb(entry: DiaryEntry): Promise<number | null> {
  if (entry.tmdbMovieId) return entry.tmdbMovieId;
  try {
    const results = await searchMovie(entry.filmTitle, entry.filmYear ?? undefined);
    if (results.results.length > 0) return results.results[0].id;
    if (entry.filmYear) {
      const fallback = await searchMovie(entry.filmTitle);
      if (fallback.results.length > 0) return fallback.results[0].id;
    }
  } catch {
    // ignore individual resolution failures
  }
  return null;
}

async function ensureMediaItem(tmdbId: number) {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: MediaType.MOVIE } },
  });
  if (existing) return existing;

  const movie = await getMovie(tmdbId);
  return prisma.mediaItem.create({
    data: {
      tmdbId,
      type: MediaType.MOVIE,
      title: movie.title,
      poster: movie.poster_path,
      backdrop: movie.backdrop_path,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      overview: movie.overview,
      genres: movie.genres.map((g) => g.name),
      runtime: movie.runtime,
    },
  });
}

export async function syncLetterboxdUser(userId: string): Promise<LetterboxdSyncResult> {
  const connection = await prisma.letterboxdConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Letterboxd not connected");

  const xml = await fetchRss(connection.letterboxdUsername);
  const entries = parseDiaryEntries(xml);

  let synced = 0;
  let skipped = 0;
  let alreadyWatched = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (entry) => {
        try {
          const tmdbId = await resolveToTmdb(entry);
          if (!tmdbId) { skipped++; return; }

          const mediaItem = await ensureMediaItem(tmdbId);
          const watchedAt = entry.watchedDate ?? new Date();

          const userMedia = await prisma.userMediaStatus.upsert({
            where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
            update: {
              status: WatchStatus.WATCHED,
              ...(entry.rating !== null ? { rating: entry.rating } : {}),
            },
            create: {
              userId,
              mediaItemId: mediaItem.id,
              status: WatchStatus.WATCHED,
              ...(entry.rating !== null ? { rating: entry.rating } : {}),
            },
          });

          const duplicate = await prisma.watchEntry.findFirst({
            where: { userId, mediaItemId: mediaItem.id, watchedAt },
          });

          if (duplicate) {
            const data: {
              rating?: number;
              source?: WatchEntrySource;
              letterboxdActivityUrl?: string;
            } = {};
            if (entry.rating !== null && duplicate.rating === null) {
              data.rating = entry.rating;
              data.source = WatchEntrySource.LETTERBOXD;
            } else if (duplicate.source === WatchEntrySource.UNKNOWN) {
              data.source = WatchEntrySource.LETTERBOXD;
            }
            if (entry.activityUrl) {
              data.letterboxdActivityUrl = entry.activityUrl;
            }
            if (Object.keys(data).length > 0) {
              await prisma.watchEntry.update({
                where: { id: duplicate.id },
                data,
              });
            }
            alreadyWatched++;
            return;
          }

          await prisma.watchEntry.create({
            data: {
              userId,
              mediaItemId: mediaItem.id,
              userMediaStatusId: userMedia.id,
              watchedAt,
              rating: entry.rating,
              source: WatchEntrySource.LETTERBOXD,
              ...(entry.activityUrl ? { letterboxdActivityUrl: entry.activityUrl } : {}),
            },
          });

          synced++;
        } catch {
          skipped++;
        }
      })
    );
  }

  await prisma.letterboxdConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return { synced, skipped, alreadyWatched };
}
