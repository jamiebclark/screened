import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTvShow } from "@/lib/tmdb";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ tmdbId: string }> };

async function getOrCreateTvItem(tmdbId: number) {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: MediaType.TV } },
  });
  if (existing) return existing;

  const show = await getTvShow(tmdbId);
  return prisma.mediaItem.create({
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
}

async function markEpisodesWatched(
  userId: string,
  mediaItemId: string,
  episodes: { seasonNumber: number; episodeNumber: number }[],
) {
  for (const e of episodes) {
    const existing = await prisma.episodeStatus.findUnique({
      where: {
        userId_mediaItemId_seasonNumber_episodeNumber: {
          userId,
          mediaItemId,
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
        },
      },
    });

    if (existing?.isWatched) {
      continue;
    }

    if (existing && !existing.isWatched) {
      await prisma.episodeStatus.update({
        where: { id: existing.id },
        data: { isWatched: true },
      });
      continue;
    }

    if (!existing) {
      await prisma.episodeStatus.create({
        data: {
          userId,
          mediaItemId,
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
          watchedAt: new Date(),
          isWatched: true,
        },
      });
    }
  }
}

async function markEpisodesUnwatched(
  userId: string,
  mediaItemId: string,
  episodes: { seasonNumber: number; episodeNumber: number }[],
) {
  for (const e of episodes) {
    await prisma.episodeStatus.updateMany({
      where: {
        userId,
        mediaItemId,
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
      },
      data: { isWatched: false },
    });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const body = (await req.json()) as {
    seasonNumber?: number;
    episodeNumber?: number;
    episodes?: { seasonNumber: number; episodeNumber: number }[];
  };

  const mediaItem = await getOrCreateTvItem(tmdbId).catch(() => null);

  if (!mediaItem) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const episodes = body.episodes ?? [
    { seasonNumber: body.seasonNumber!, episodeNumber: body.episodeNumber! },
  ];

  await markEpisodesWatched(session.user.id, mediaItem.id, episodes);

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const body = (await req.json()) as {
    seasonNumber?: number;
    episodeNumber?: number;
    watchedAt?: string;
    review?: string | null;
  };

  if (
    body.seasonNumber == null ||
    body.episodeNumber == null ||
    typeof body.seasonNumber !== "number" ||
    typeof body.episodeNumber !== "number"
  ) {
    return NextResponse.json(
      { error: "seasonNumber and episodeNumber are required" },
      { status: 400 },
    );
  }

  const mediaItem = await getOrCreateTvItem(tmdbId).catch(() => null);
  if (!mediaItem) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const watchedAt = body.watchedAt ? new Date(body.watchedAt) : new Date();
  if (isNaN(watchedAt.getTime())) {
    return NextResponse.json({ error: "Invalid watchedAt" }, { status: 400 });
  }

  const review =
    body.review === undefined
      ? undefined
      : body.review === null || body.review.trim() === ""
        ? null
        : body.review.trim();

  const row = await prisma.episodeStatus.upsert({
    where: {
      userId_mediaItemId_seasonNumber_episodeNumber: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
        seasonNumber: body.seasonNumber,
        episodeNumber: body.episodeNumber,
      },
    },
    create: {
      userId: session.user.id,
      mediaItemId: mediaItem.id,
      seasonNumber: body.seasonNumber,
      episodeNumber: body.episodeNumber,
      watchedAt,
      isWatched: true,
      ...(review !== undefined ? { review } : {}),
    },
    update: {
      watchedAt,
      isWatched: true,
      ...(review !== undefined ? { review } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    episode: {
      seasonNumber: row.seasonNumber,
      episodeNumber: row.episodeNumber,
      watchedAt: row.watchedAt.toISOString(),
      review: row.review,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const body = (await req.json()) as {
    seasonNumber?: number;
    episodeNumber?: number;
    episodes?: { seasonNumber: number; episodeNumber: number }[];
  };

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: MediaType.TV } },
  });

  if (!mediaItem) {
    return NextResponse.json({ success: true });
  }

  const episodes = body.episodes ?? [
    { seasonNumber: body.seasonNumber!, episodeNumber: body.episodeNumber! },
  ];

  await markEpisodesUnwatched(session.user.id, mediaItem.id, episodes);

  return NextResponse.json({ success: true });
}
