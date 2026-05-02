import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friendship";
import { findMergeCandidateWatchEntry } from "@/lib/watch-entry-merge";
import { notifyFriendsOfWatch } from "@/lib/watch-notifications";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

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
      mediaItem: {
        tmdbId,
        type: type === "movie" ? MediaType.MOVIE : MediaType.TV,
      },
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
  const body = (await req.json()) as {
    type?: string;
    watchedAt?: string;
    review?: string | null;
    rating?: number | null;
    /** Friend user ids to log the same viewing for (optional). */
    withUserIds?: unknown;
  };
  const { type, watchedAt, review, rating } = body;
  const withUserIdsRaw = body.withUserIds;
  const withUserIds: string[] = Array.isArray(withUserIdsRaw)
    ? [
        ...new Set(
          withUserIdsRaw.filter(
            (u): u is string => typeof u === "string" && u.trim() !== "",
          ),
        ),
      ]
    : [];

  if (isNaN(tmdbId) || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: mediaType } },
  });

  if (!mediaItem) {
    return NextResponse.json(
      { error: "Media not found — set a watch status first" },
      { status: 404 },
    );
  }

  if (withUserIds.length > 20) {
    return NextResponse.json(
      { error: "At most 20 friends can be tagged per log" },
      { status: 400 },
    );
  }

  for (const uid of withUserIds) {
    if (uid === session.user.id) {
      return NextResponse.json(
        { error: "You cannot include yourself in withUserIds" },
        { status: 400 },
      );
    }
    if (!(await areFriends(session.user.id, uid))) {
      return NextResponse.json(
        { error: "You can only tag people you are friends with" },
        { status: 400 },
      );
    }
  }

  const at = watchedAt ? new Date(watchedAt) : new Date();

  const { entry, taggedCreatedCount } = await prisma.$transaction(
    async (tx) => {
      const userStatus = await tx.userMediaStatus.findUnique({
        where: {
          userId_mediaItemId: {
            userId: session.user.id,
            mediaItemId: mediaItem.id,
          },
        },
      });

      const main = await tx.watchEntry.create({
        data: {
          userId: session.user.id,
          mediaItemId: mediaItem.id,
          userMediaStatusId: userStatus?.id ?? null,
          watchedAt: at,
          review: review ?? null,
          rating: rating ?? null,
          source: WatchEntrySource.MANUAL,
        },
      });

      let taggedCreatedCount = 0;
      for (const friendId of withUserIds) {
        const existing = await findMergeCandidateWatchEntry(
          friendId,
          mediaItem.id,
          at,
          tx,
        );
        if (existing) continue;

        const friendStatus = await tx.userMediaStatus.upsert({
          where: {
            userId_mediaItemId: { userId: friendId, mediaItemId: mediaItem.id },
          },
          update: { status: WatchStatus.WATCHED },
          create: {
            userId: friendId,
            mediaItemId: mediaItem.id,
            status: WatchStatus.WATCHED,
          },
        });

        await tx.watchEntry.create({
          data: {
            userId: friendId,
            mediaItemId: mediaItem.id,
            userMediaStatusId: friendStatus.id,
            watchedAt: at,
            review: review ?? null,
            rating: rating ?? null,
            source: WatchEntrySource.MANUAL,
          },
        });
        taggedCreatedCount += 1;
      }

      return { entry: main, taggedCreatedCount };
    },
  );

  after(() => notifyFriendsOfWatch(session.user.id, mediaItem.id, entry.id));

  return NextResponse.json(
    { ...entry, taggedCreatedCount } as typeof entry & {
      taggedCreatedCount: number;
    },
    { status: 201 },
  );
}
