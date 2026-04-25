import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovie, getTvShow } from "@/lib/tmdb";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ slug: string }> };

export interface ImportResult {
  slug: string;
  title: string;
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

function parseFilmSlugs(html: string): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  const regex = /data-film-slug="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const slug = match[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

function hasNextPage(html: string): boolean {
  return html.includes('class="next"');
}

async function resolveFilmToTmdb(
  filmSlug: string
): Promise<{ tmdbId: number; type: "movie" | "tv" } | null> {
  try {
    const html = await fetchLetterboxdHtml(`https://letterboxd.com/film/${filmSlug}/`);
    const movieMatch = html.match(/themoviedb\.org\/movie\/(\d+)/);
    if (movieMatch) return { tmdbId: parseInt(movieMatch[1], 10), type: "movie" };
    const tvMatch = html.match(/themoviedb\.org\/tv\/(\d+)/);
    if (tvMatch) return { tmdbId: parseInt(tvMatch[1], 10), type: "tv" };
    return null;
  } catch {
    return null;
  }
}

async function scrapeLetterboxdList(rawUrl: string): Promise<string[]> {
  const base = rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`;
  const allSlugs: string[] = [];

  // Max 15 pages = 420 items (Letterboxd shows 28 per page)
  for (let page = 1; page <= 15; page++) {
    const pageUrl = page === 1 ? base : `${base}page/${page}/`;
    const html = await fetchLetterboxdHtml(pageUrl);
    const slugs = parseFilmSlugs(html);
    allSlugs.push(...slugs);
    if (!hasNextPage(html) || slugs.length === 0) break;
  }

  return allSlugs;
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

  let filmSlugs: string[];
  try {
    filmSlugs = await scrapeLetterboxdList(letterboxdUrl);
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not fetch the Letterboxd list. Make sure the URL is correct and the list is public.",
      },
      { status: 400 }
    );
  }

  if (filmSlugs.length === 0) {
    return NextResponse.json(
      { error: "No films found in the Letterboxd list." },
      { status: 400 }
    );
  }

  const results: ImportResult[] = [];

  // Process 5 films concurrently to stay polite to Letterboxd
  const BATCH_SIZE = 5;
  for (let i = 0; i < filmSlugs.length; i += BATCH_SIZE) {
    const batch = filmSlugs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (filmSlug): Promise<ImportResult> => {
        try {
          const tmdbData = await resolveFilmToTmdb(filmSlug);
          if (!tmdbData) {
            return {
              slug: filmSlug,
              title: filmSlug,
              status: "failed",
              error: "TMDB ID not found on Letterboxd film page",
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
            slug: filmSlug,
            title: mediaItem.title,
            status: existing ? "already_exists" : "added",
          };
        } catch (err) {
          return {
            slug: filmSlug,
            title: filmSlug,
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
    total: filmSlugs.length,
    results,
  } satisfies ImportResponse);
}
