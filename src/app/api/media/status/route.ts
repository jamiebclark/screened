import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovie, getTvShow, getMovieCredits, getMovieKeywords, getTvCredits, getTvKeywords } from "@/lib/tmdb";
import { buildEmbeddingText, generateEmbedding } from "@/lib/embeddings";
import { ensureWatchlistRadarrToken } from "@/lib/ensure-watchlist-radarr-token";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

async function enrichAndEmbed(mediaItemId: string, tmdbId: number, type: "movie" | "tv") {
  try {
    let cast: string[] = [];
    let director: string | null = null;
    let keywords: string[] = [];

    if (type === "movie") {
      const [credits, kws] = await Promise.all([
        getMovieCredits(tmdbId).catch(() => ({ cast: [] as string[], director: null, directors: [] as string[] })),
        getMovieKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      director = credits.director;
      keywords = kws;
    } else {
      const [credits, kws] = await Promise.all([
        getTvCredits(tmdbId).catch(() => ({ cast: [] as string[], director: null })),
        getTvKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      director = credits.director;
      keywords = kws;
    }

    const updated = await prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: { cast, director, keywords },
    });

    const text = buildEmbeddingText({
      title: updated.title,
      year: updated.year,
      overview: updated.overview,
      genres: updated.genres,
      cast,
      director,
      keywords,
    });

    const embedding = await generateEmbedding(text);
    if (embedding) {
      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { embedding },
      });
    }
  } catch (err) {
    console.error("[enrichAndEmbed] failed for", mediaItemId, err);
  }
}

async function getOrCreateMediaItem(tmdbId: number, type: "movie" | "tv") {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: type === "movie" ? MediaType.MOVIE : MediaType.TV } },
  });
  if (existing) return existing;

  if (type === "movie") {
    const movie = await getMovie(tmdbId);
    const mediaItem = await prisma.mediaItem.create({
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
    after(() => enrichAndEmbed(mediaItem.id, tmdbId, "movie"));
    return mediaItem;
  } else {
    const show = await getTvShow(tmdbId);
    const mediaItem = await prisma.mediaItem.create({
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
    after(() => enrichAndEmbed(mediaItem.id, tmdbId, "tv"));
    return mediaItem;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { tmdbId?: number; type?: string; status?: string | null; rating?: number | null };
  const { tmdbId, type, status, rating } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const mediaType = type as "movie" | "tv";

  if (status === null && rating === undefined) {
    const mediaItem = await prisma.mediaItem.findUnique({
      where: { tmdbId_type: { tmdbId, type: mediaType === "movie" ? MediaType.MOVIE : MediaType.TV } },
    });
    if (mediaItem) {
      await prisma.userMediaStatus.deleteMany({
        where: { userId: session.user.id, mediaItemId: mediaItem.id },
      });
    }
    return NextResponse.json({ success: true });
  }

  const mediaItem = await getOrCreateMediaItem(tmdbId, mediaType);

  const previous = await prisma.userMediaStatus.findUnique({
    where: { userId_mediaItemId: { userId: session.user.id, mediaItemId: mediaItem.id } },
  });

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status as WatchStatus;
  if (rating !== undefined) data.rating = rating;

  const result = await prisma.userMediaStatus.upsert({
    where: { userId_mediaItemId: { userId: session.user.id, mediaItemId: mediaItem.id } },
    update: data,
    create: {
      userId: session.user.id,
      mediaItemId: mediaItem.id,
      status: (status as WatchStatus) ?? WatchStatus.WATCHLIST,
      ...data,
    },
  });

  if (mediaItem.type === MediaType.MOVIE && result.status === WatchStatus.WATCHLIST) {
    await ensureWatchlistRadarrToken(session.user.id);
  }

  if (result.status === WatchStatus.WATCHED && previous?.status !== WatchStatus.WATCHED) {
    await prisma.watchEntry.create({
      data: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
        userMediaStatusId: result.id,
        source: WatchEntrySource.MANUAL,
      },
    });
  }

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tmdbId = parseInt(searchParams.get("tmdbId") ?? "");
  const type = searchParams.get("type") as "movie" | "tv" | null;

  if (!tmdbId || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: type === "movie" ? MediaType.MOVIE : MediaType.TV } },
  });

  if (!mediaItem) return NextResponse.json(null);

  const status = await prisma.userMediaStatus.findUnique({
    where: { userId_mediaItemId: { userId: session.user.id, mediaItemId: mediaItem.id } },
  });

  return NextResponse.json(status);
}
