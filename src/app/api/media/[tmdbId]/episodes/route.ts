import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ tmdbId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
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

  if (!mediaItem) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
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
