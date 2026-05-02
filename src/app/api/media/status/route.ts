import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyFriendsOfWatch } from "@/lib/watch-notifications";
import { notifyWatched } from "@/lib/discord";
import {
  getMovie,
  getTvShow,
  getMovieCredits,
  getMovieKeywords,
  getTvCredits,
  getTvKeywords,
} from "@/lib/tmdb";
import { buildEmbeddingText, generateEmbedding } from "@/lib/embeddings";
import { ensureWatchlistRadarrToken } from "@/lib/ensure-watchlist-radarr-token";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

async function enrichAndEmbed(
  mediaItemId: string,
  tmdbId: number,
  type: "movie" | "tv",
) {
  try {
    let cast: string[] = [];
    let director: string | null = null;
    let keywords: string[] = [];

    if (type === "movie") {
      const [credits, kws] = await Promise.all([
        getMovieCredits(tmdbId).catch(() => ({
          cast: [] as string[],
          director: null,
          directors: [] as string[],
        })),
        getMovieKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      director = credits.director;
      keywords = kws;
    } else {
      const [credits, kws] = await Promise.all([
        getTvCredits(tmdbId).catch(() => ({
          cast: [] as string[],
          director: null,
        })),
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
    where: {
      tmdbId_type: {
        tmdbId,
        type: type === "movie" ? MediaType.MOVIE : MediaType.TV,
      },
    },
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
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
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
        year: show.first_air_date
          ? new Date(show.first_air_date).getFullYear()
          : null,
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

  const body = (await req.json()) as {
    tmdbId?: number;
    type?: string;
    status?: string | null;
    rating?: number | null;
  };
  const { tmdbId, type, status, rating } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const mediaType = type as "movie" | "tv";

  if (status === null && rating === undefined) {
    const mediaItem = await prisma.mediaItem.findUnique({
      where: {
        tmdbId_type: {
          tmdbId,
          type: mediaType === "movie" ? MediaType.MOVIE : MediaType.TV,
        },
      },
    });
    if (mediaItem) {
      const whereUserTitle = {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
      };
      await prisma.$transaction([
        prisma.watchEntry.deleteMany({ where: whereUserTitle }),
        prisma.episodeStatus.deleteMany({ where: whereUserTitle }),
        prisma.userMediaStatus.deleteMany({ where: whereUserTitle }),
      ]);
    }
    return NextResponse.json({ success: true });
  }

  const mediaItem = await getOrCreateMediaItem(tmdbId, mediaType);

  const previous = await prisma.userMediaStatus.findUnique({
    where: {
      userId_mediaItemId: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
      },
    },
  });

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status as WatchStatus;
  if (rating !== undefined) data.rating = rating;

  const result = await prisma.userMediaStatus.upsert({
    where: {
      userId_mediaItemId: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
      },
    },
    update: data,
    create: {
      userId: session.user.id,
      mediaItemId: mediaItem.id,
      status: (status as WatchStatus) ?? WatchStatus.WATCHLIST,
      ...data,
    },
  });

  if (
    mediaItem.type === MediaType.MOVIE &&
    result.status === WatchStatus.WATCHLIST
  ) {
    await ensureWatchlistRadarrToken(session.user.id);
  }

  if (
    result.status === WatchStatus.WATCHED &&
    previous?.status !== WatchStatus.WATCHED
  ) {
    let watchedAtForLog: Date = new Date();
    if (mediaItem.type === MediaType.TV) {
      const lastEpisode = await prisma.episodeStatus.aggregate({
        where: {
          userId: session.user.id,
          mediaItemId: mediaItem.id,
          isWatched: true,
        },
        _max: { watchedAt: true },
      });
      if (lastEpisode._max.watchedAt) {
        watchedAtForLog = lastEpisode._max.watchedAt;
      }
    }
    const entry = await prisma.watchEntry.create({
      data: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
        userMediaStatusId: result.id,
        watchedAt: watchedAtForLog,
        source: WatchEntrySource.MANUAL,
      },
    });
    after(() =>
      notifyFriendsOfWatch(session.user.id, mediaItem.id, entry.id),
    );
    after(async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const listsWithWebhook = await prisma.list.findMany({
        where: {
          discordWebhookUrl: { not: null },
          items: { some: { mediaItemId: mediaItem.id } },
          members: { some: { userId: session.user.id } },
        },
        select: { discordWebhookUrl: true },
      });
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      for (const list of listsWithWebhook) {
        if (list.discordWebhookUrl) {
          await notifyWatched(list.discordWebhookUrl, {
            userName: user?.name ?? "Someone",
            title: mediaItem.title,
            year: mediaItem.year,
            type: mediaItem.type === MediaType.MOVIE ? "movie" : "tv",
            poster: mediaItem.poster,
            rating: result.rating,
            appUrl,
            tmdbId: mediaItem.tmdbId,
          });
        }
      }
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
  const type = searchParams.get("type") as "movie" | "tv" | null;
  const tmdbIdsParam = searchParams.get("tmdbIds");

  if (tmdbIdsParam != null && tmdbIdsParam !== "") {
    if (!type || !["movie", "tv"].includes(type)) {
      return NextResponse.json(
        { error: "Missing or invalid type" },
        { status: 400 },
      );
    }
    const rawIds = tmdbIdsParam
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    const ids = [...new Set(rawIds)];
    if (ids.length === 0) {
      return NextResponse.json({
        statuses: {} as Record<
          string,
          { status: WatchStatus; rating: number | null }
        >,
      });
    }
    if (ids.length > 80) {
      return NextResponse.json({ error: "Too many tmdbIds" }, { status: 400 });
    }
    const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;
    const items = await prisma.mediaItem.findMany({
      where: { tmdbId: { in: ids }, type: mediaType },
      select: { id: true, tmdbId: true },
    });
    if (items.length === 0) {
      return NextResponse.json({
        statuses: {} as Record<
          string,
          { status: WatchStatus; rating: number | null }
        >,
      });
    }
    const statuses = await prisma.userMediaStatus.findMany({
      where: {
        userId: session.user.id,
        mediaItemId: { in: items.map((i) => i.id) },
      },
      select: { mediaItemId: true, status: true, rating: true },
    });
    const mediaIdToTmdb = new Map(items.map((i) => [i.id, i.tmdbId]));
    const byTmdb: Record<
      string,
      { status: WatchStatus; rating: number | null }
    > = {};
    for (const row of statuses) {
      const tmdb = mediaIdToTmdb.get(row.mediaItemId);
      if (tmdb !== undefined) {
        byTmdb[String(tmdb)] = { status: row.status, rating: row.rating };
      }
    }
    return NextResponse.json({ statuses: byTmdb });
  }

  const tmdbId = parseInt(searchParams.get("tmdbId") ?? "");

  if (!tmdbId || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const mediaItem = await prisma.mediaItem.findUnique({
    where: {
      tmdbId_type: {
        tmdbId,
        type: type === "movie" ? MediaType.MOVIE : MediaType.TV,
      },
    },
  });

  if (!mediaItem) return NextResponse.json(null);

  const status = await prisma.userMediaStatus.findUnique({
    where: {
      userId_mediaItemId: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
      },
    },
  });

  return NextResponse.json(status);
}
