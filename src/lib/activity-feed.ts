import { prisma } from "@/lib/prisma";
import { listFriendUserIds } from "@/lib/friendship";

export type WatchedEvent = {
  kind: "watched";
  id: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  mediaItem: {
    tmdbId: number;
    type: "movie" | "tv";
    title: string;
    poster: string | null;
    year: number | null;
  };
  rating: number | null;
  watchedAt: Date;
};

export type ListAddEvent = {
  kind: "list_add";
  id: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  mediaItem: {
    tmdbId: number;
    type: "movie" | "tv";
    title: string;
    poster: string | null;
    year: number | null;
  };
  listName: string;
  listSlug: string;
  addedAt: Date;
};

export type ActivityEvent = WatchedEvent | ListAddEvent;

export async function getFriendActivityFeed(
  viewerId: string,
  take = 50,
): Promise<ActivityEvent[]> {
  const friendIds = await listFriendUserIds(viewerId);
  if (friendIds.length === 0) return [];

  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: { id: true, watchHistoryVisibility: true },
  });

  // FRIENDS visibility still applies to the viewer since they are a friend
  const visibleFriendIds = friends
    .filter(
      (f) =>
        f.watchHistoryVisibility === "PUBLIC" ||
        f.watchHistoryVisibility === "FRIENDS",
    )
    .map((f) => f.id);

  // Lists shared between viewer and at least one friend
  const viewerMemberships = await prisma.listMember.findMany({
    where: { userId: viewerId },
    select: { listId: true },
  });
  const viewerListIds = viewerMemberships.map((m) => m.listId);

  const [watchEntries, listItems] = await Promise.all([
    visibleFriendIds.length > 0
      ? prisma.watchEntry.findMany({
          where: { userId: { in: visibleFriendIds } },
          orderBy: { watchedAt: "desc" },
          take,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            mediaItem: {
              select: {
                tmdbId: true,
                type: true,
                title: true,
                poster: true,
                year: true,
              },
            },
          },
        })
      : [],
    viewerListIds.length > 0
      ? prisma.listItem.findMany({
          where: {
            listId: { in: viewerListIds },
            addedById: { in: friendIds },
          },
          orderBy: { addedAt: "desc" },
          take,
          include: {
            addedBy: { select: { id: true, name: true, avatarUrl: true } },
            mediaItem: {
              select: {
                tmdbId: true,
                type: true,
                title: true,
                poster: true,
                year: true,
              },
            },
            list: { select: { name: true, slug: true } },
          },
        })
      : [],
  ]);

  const events: ActivityEvent[] = [
    ...watchEntries.map(
      (e): WatchedEvent => ({
        kind: "watched",
        id: e.id,
        actorId: e.user.id,
        actorName: e.user.name,
        actorAvatarUrl: e.user.avatarUrl,
        mediaItem: {
          tmdbId: e.mediaItem.tmdbId,
          type: e.mediaItem.type === "MOVIE" ? "movie" : "tv",
          title: e.mediaItem.title,
          poster: e.mediaItem.poster,
          year: e.mediaItem.year,
        },
        rating: e.rating,
        watchedAt: e.watchedAt,
      }),
    ),
    ...listItems.map(
      (item): ListAddEvent => ({
        kind: "list_add",
        id: item.id,
        actorId: item.addedBy.id,
        actorName: item.addedBy.name,
        actorAvatarUrl: item.addedBy.avatarUrl,
        mediaItem: {
          tmdbId: item.mediaItem.tmdbId,
          type: item.mediaItem.type === "MOVIE" ? "movie" : "tv",
          title: item.mediaItem.title,
          poster: item.mediaItem.poster,
          year: item.mediaItem.year,
        },
        listName: item.list.name,
        listSlug: item.list.slug,
        addedAt: item.addedAt,
      }),
    ),
  ];

  events.sort((a, b) => {
    const aMs = a.kind === "watched" ? a.watchedAt.getTime() : a.addedAt.getTime();
    const bMs = b.kind === "watched" ? b.watchedAt.getTime() : b.addedAt.getTime();
    return bMs - aMs;
  });

  return events.slice(0, take);
}
