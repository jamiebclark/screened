import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaType, WatchEntrySource } from "@/generated/prisma";

type Params = { params: Promise<{ tmdbId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const type = req.nextUrl.searchParams.get("type") as "movie" | "tv" | null;

  if (isNaN(tmdbId) || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const entries = await prisma.watchEntry.findMany({
    where: {
      userId: session.user.id,
      mediaItem: { tmdbId, type: type === "movie" ? MediaType.MOVIE : MediaType.TV },
    },
    orderBy: { watchedAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);
  const body = await req.json() as { type?: string; watchedAt?: string; review?: string | null; rating?: number | null };
  const { type, watchedAt, review, rating } = body;

  if (isNaN(tmdbId) || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: mediaType } },
  });

  if (!mediaItem) {
    return NextResponse.json({ error: "Media not found — set a watch status first" }, { status: 404 });
  }

  const userStatus = await prisma.userMediaStatus.findUnique({
    where: { userId_mediaItemId: { userId: session.user.id, mediaItemId: mediaItem.id } },
  });

  const entry = await prisma.watchEntry.create({
    data: {
      userId: session.user.id,
      mediaItemId: mediaItem.id,
      userMediaStatusId: userStatus?.id ?? null,
      watchedAt: watchedAt ? new Date(watchedAt) : new Date(),
      review: review ?? null,
      rating: rating ?? null,
      source: WatchEntrySource.MANUAL,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
