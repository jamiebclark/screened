import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { canViewProfileContent } from "@/lib/profile-visibility";
import { listFriendUserIds } from "@/lib/friendship";

/** One row for the title page: yours plus others with PUBLIC / FRIENDS+friend visibility. */
export type TitlePageWatchEntry = {
  id: string;
  userId: string;
  isViewer: boolean;
  watchedAt: Date;
  review: string | null;
  rating: number | null;
  letterboxdActivityUrl: string | null;
  user: { id: string; name: string; avatarUrl: string | null } | null;
};

/**
 * Watch entries for a title visible to the viewer: always their own, plus others
 * when {@link canViewProfileContent} would allow (same rules as profile + calendar).
 */
export async function fetchTitleWatchHistoryForViewer(
  viewerId: string,
  tmdbId: number,
  type: MediaType,
): Promise<TitlePageWatchEntry[]> {
  const mediaItem = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type } },
    select: { id: true },
  });
  if (!mediaItem) return [];

  const friendIds = new Set(await listFriendUserIds(viewerId));

  const rows = await prisma.watchEntry.findMany({
    where: { mediaItemId: mediaItem.id },
    orderBy: { watchedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          watchHistoryVisibility: true,
        },
      },
    },
  });

  const out: TitlePageWatchEntry[] = [];
  for (const e of rows) {
    const u = e.user;
    if (e.userId === viewerId) {
      out.push({
        id: e.id,
        userId: e.userId,
        isViewer: true,
        watchedAt: e.watchedAt,
        review: e.review,
        rating: e.rating,
        letterboxdActivityUrl: e.letterboxdActivityUrl,
        user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl },
      });
      continue;
    }
    if (
      canViewProfileContent({
        isOwner: false,
        visibility: u.watchHistoryVisibility,
        isFriend: friendIds.has(e.userId),
      })
    ) {
      out.push({
        id: e.id,
        userId: e.userId,
        isViewer: false,
        watchedAt: e.watchedAt,
        review: e.review,
        rating: e.rating,
        letterboxdActivityUrl: e.letterboxdActivityUrl,
        user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl },
      });
    }
  }
  return out;
}

export type WatchEntryWithMedia = {
  id: string;
  watchedAt: Date;
  mediaItem: {
    tmdbId: number;
    type: MediaType;
    title: string;
    poster: string | null;
    year: number | null;
  };
};

const mediaSelect = {
  tmdbId: true,
  type: true,
  title: true,
  poster: true,
  year: true,
} as const;

export async function fetchMyWatchEntriesInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<WatchEntryWithMedia[]> {
  return prisma.watchEntry.findMany({
    where: { userId, watchedAt: { gte: start, lte: end } },
    include: { mediaItem: { select: mediaSelect } },
    orderBy: { watchedAt: "desc" },
  });
}

type FriendWatchEntryRow = WatchEntryWithMedia & {
  user: { id: string; name: string; avatarUrl: string | null };
};

export async function fetchFriendsWatchEntriesInRange(
  viewerId: string,
  start: Date,
  end: Date,
  take = 80,
): Promise<FriendWatchEntryRow[]> {
  const friendIds = await listFriendUserIds(viewerId);
  if (friendIds.length === 0) return [];

  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: { id: true, watchHistoryVisibility: true },
  });

  const visibleIds = friends
    .filter((f) =>
      canViewProfileContent({
        isOwner: false,
        visibility: f.watchHistoryVisibility,
        isFriend: true,
      }),
    )
    .map((f) => f.id);

  if (visibleIds.length === 0) return [];

  return prisma.watchEntry.findMany({
    where: {
      userId: { in: visibleIds },
      watchedAt: { gte: start, lte: end },
    },
    include: {
      mediaItem: { select: mediaSelect },
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: [{ watchedAt: "desc" }],
    take,
  });
}

/** Days in month (1–31) that have at least one watch entry for this user. */
export async function fetchMyWatchDaysInMonth(
  userId: string,
  start: Date,
  end: Date,
): Promise<Set<number>> {
  const rows = await prisma.watchEntry.findMany({
    where: { userId, watchedAt: { gte: start, lte: end } },
    select: { watchedAt: true },
  });
  const days = new Set<number>();
  for (const r of rows) {
    days.add(r.watchedAt.getDate());
  }
  return days;
}
