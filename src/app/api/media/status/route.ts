import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovie, getTvShow } from "@/lib/tmdb";
import { MediaType, WatchStatus } from "@/generated/prisma";

async function getOrCreateMediaItem(tmdbId: number, type: "movie" | "tv") {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: type === "movie" ? MediaType.MOVIE : MediaType.TV } },
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { tmdbId?: number; type?: string; status?: string | null; rating?: number | null; review?: string };
  const { tmdbId, type, status, rating, review } = body;

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

  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    data.status = status as WatchStatus;
    if (status === "WATCHED") data.watchedAt = new Date();
  }
  if (rating !== undefined) data.rating = rating;
  if (review !== undefined) data.review = review;

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
