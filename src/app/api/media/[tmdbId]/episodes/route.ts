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
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
      overview: show.overview,
      genres: show.genres.map((g) => g.name),
      runtime: show.episode_run_time[0] ?? null,
    },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const body = await req.json() as { seasonNumber?: number; episodeNumber?: number; episodes?: { seasonNumber: number; episodeNumber: number }[] };

  const mediaItem = await getOrCreateTvItem(tmdbId).catch(() => null);

  if (!mediaItem) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const episodes = body.episodes ?? [
    { seasonNumber: body.seasonNumber!, episodeNumber: body.episodeNumber! },
  ];

  await prisma.episodeStatus.createMany({
    data: episodes.map((e) => ({
      userId: session.user.id,
      mediaItemId: mediaItem.id,
      seasonNumber: e.seasonNumber,
      episodeNumber: e.episodeNumber,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const body = await req.json() as { seasonNumber?: number; episodeNumber?: number; episodes?: { seasonNumber: number; episodeNumber: number }[] };

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: MediaType.TV } },
  });

  // Nothing to delete if media item doesn't exist yet
  if (!mediaItem) {
    return NextResponse.json({ success: true });
  }

  const episodes = body.episodes ?? [
    { seasonNumber: body.seasonNumber!, episodeNumber: body.episodeNumber! },
  ];

  for (const e of episodes) {
    await prisma.episodeStatus.deleteMany({
      where: {
        userId: session.user.id,
        mediaItemId: mediaItem.id,
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
      },
    });
  }

  return NextResponse.json({ success: true });
}
