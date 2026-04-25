import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovie, getTvShow, searchMovie } from "@/lib/tmdb";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ slug: string }> };

export interface ImportResult {
  slug: string;
  title: string;
  year: number | null;
  status: "added" | "already_exists" | "failed";
  error?: string;
}

export interface ImportResponse {
  added: number;
  alreadyExisted: number;
  failed: number;
  total: number;
  results: ImportResult[];
}

async function getOrCreateMediaItem(tmdbId: number, type: "movie" | "tv") {
  const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: mediaType } },
  });
  if (existing) return existing;

  if (type === "movie") {
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
  } else {
    const show = await getTvShow(tmdbId);
    return prisma.mediaItem.create({
      data: {
        tmdbId,
        type: MediaType.TV,
        title: show.name,
        poster: show.poster_path,
        backdrop: show.backdrop_path,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
        overview: show.overview,
        genres: show.genres.map((g) => g.name),
        runtime: show.episode_run_time[0] ?? null,
      },
    });
  }
}

async function fetchLetterboxdHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from Letterboxd`);
  return res.text();
}

interface LetterboxdFilm {
  slug: string;
  title: string;
  year: number | null;
}

function parseFilms(html: string): LetterboxdFilm[] {
  const seen = new Set<string>();
  const films: LetterboxdFilm[] = [];

  // Match both attributes together from the same element. They appear as:
  //   data-item-slug="the-dark-knight" ... data-item-name="The Dark Knight (2008)"
  // Attributes may appear in either order so we check both orderings.
  const jointRegex =
    /data-item-slug="([^"]+)"[^>]*?data-item-name="([^"]+)"|data-item-name="([^"]+)"[^>]*?data-item-slug="([^"]+)"/g;

  let m: RegExpExecArray | null;
  while ((m = jointRegex.exec(html)) !== null) {
    const slug = m[1] ?? m[4];
    const rawName = m[2] ?? m[3];
    if (!slug || !rawName || seen.has(slug)) continue;
    seen.add(slug);

    // "The Dark Knight (2008)" → title="The Dark Knight", year=2008
    const yearMatch = rawName.match(/^(.*)\s+\((\d{4})\)$/);
    const title = yearMatch ? yearMatch[1] : rawName;
    const year = yearMatch ? parseInt(yearMatch[2], 10) : null;

    films.push({ slug, title, year });
  }

  return films;
}

function hasNextPage(html: string): boolean {
  return html.includes('class="next"');
}

async function scrapeLetterboxdList(rawUrl: string): Promise<LetterboxdFilm[]> {
  const base = rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`;
  const allFilms: LetterboxdFilm[] = [];

  // Max 15 pages ≈ 420 items (Letterboxd shows 28 per page)
  for (let page = 1; page <= 15; page++) {
    const pageUrl = page === 1 ? base : `${base}page/${page}/`;
    const html = await fetchLetterboxdHtml(pageUrl);
    const films = parseFilms(html);
    allFilms.push(...films);
    if (!hasNextPage(html) || films.length === 0) break;
  }

  return allFilms;
}

async function resolveToTmdb(
  film: LetterboxdFilm
): Promise<{ tmdbId: number; type: "movie" | "tv" } | null> {
  try {
    // Search TMDB movies with title + year for high accuracy
    const results = await searchMovie(film.title, film.year ?? undefined);
    if (results.results.length > 0) {
      return { tmdbId: results.results[0].id, type: "movie" };
    }
    // If no year match, try without year
    if (film.year) {
      const fallback = await searchMovie(film.title);
      if (fallback.results.length > 0) {
        return { tmdbId: fallback.results[0].id, type: "movie" };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await req.json()) as { letterboxdUrl?: string };
  const { letterboxdUrl } = body;

  if (!letterboxdUrl?.includes("letterboxd.com")) {
    return NextResponse.json(
      { error: "A valid Letterboxd URL is required" },
      { status: 400 }
    );
  }

  const list = await prisma.list.findUnique({
    where: { slug },
    include: { members: true },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = list.members.some((m) => m.userId === session.user.id);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let films: LetterboxdFilm[];
  try {
    films = await scrapeLetterboxdList(letterboxdUrl);
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not fetch the Letterboxd list. Make sure the URL is correct and the list is public.",
      },
      { status: 400 }
    );
  }

  if (films.length === 0) {
    return NextResponse.json(
      { error: "No films found in the Letterboxd list." },
      { status: 400 }
    );
  }

  const results: ImportResult[] = [];

  // Process 5 films concurrently (TMDB search is fast; no individual Letterboxd fetches needed)
  const BATCH_SIZE = 5;
  for (let i = 0; i < films.length; i += BATCH_SIZE) {
    const batch = films.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (film): Promise<ImportResult> => {
        try {
          const tmdbData = await resolveToTmdb(film);
          if (!tmdbData) {
            return {
              slug: film.slug,
              title: film.title,
              year: film.year,
              status: "failed",
              error: "No TMDB match found",
            };
          }

          const mediaItem = await getOrCreateMediaItem(tmdbData.tmdbId, tmdbData.type);

          const existing = await prisma.listItem.findUnique({
            where: { listId_mediaItemId: { listId: list.id, mediaItemId: mediaItem.id } },
          });

          await prisma.listItem.upsert({
            where: { listId_mediaItemId: { listId: list.id, mediaItemId: mediaItem.id } },
            update: {},
            create: {
              listId: list.id,
              mediaItemId: mediaItem.id,
              addedById: session.user.id,
            },
          });

          return {
            slug: film.slug,
            title: mediaItem.title,
            year: mediaItem.year,
            status: existing ? "already_exists" : "added",
          };
        } catch (err) {
          return {
            slug: film.slug,
            title: film.title,
            year: film.year,
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      })
    );
    results.push(...batchResults);
  }

  await prisma.list.update({ where: { id: list.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({
    added: results.filter((r) => r.status === "added").length,
    alreadyExisted: results.filter((r) => r.status === "already_exists").length,
    failed: results.filter((r) => r.status === "failed").length,
    total: films.length,
    results,
  } satisfies ImportResponse);
}
