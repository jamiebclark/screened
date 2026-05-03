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
  /** Set for TV episode watches (in-app or Plex); diary lines omit these. */
  seasonNumber?: number;
  episodeNumber?: number;
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

/** One row on global Watch History: a movie/TV diary line or a TV episode (Plex / in-app). */
export type WatchHistoryListItem = {
  id: string;
  watchedAt: Date;
  mediaItem: {
    tmdbId: number;
    type: MediaType;
    title: string;
    poster: string | null;
    year: number | null;
  };
  seasonNumber?: number;
  episodeNumber?: number;
};

/** @deprecated Use WatchHistoryListItem */
export type WatchEntryWithMedia = WatchHistoryListItem;

export type FriendWatchHistoryRow = WatchHistoryListItem & {
  user: { id: string; name: string; avatarUrl: string | null };
};

const mediaSelect = {
  tmdbId: true,
  type: true,
  title: true,
  poster: true,
  year: true,
} as const;

export function mergeWatchHistorySources(
  a: WatchHistoryListItem[],
  b: WatchHistoryListItem[],
): WatchHistoryListItem[] {
  return [...a, ...b].sort(
    (x, y) => y.watchedAt.getTime() - x.watchedAt.getTime(),
  );
}

function mergeFriendWatchHistoryRows(
  a: FriendWatchHistoryRow[],
  b: FriendWatchHistoryRow[],
): FriendWatchHistoryRow[] {
  return [...a, ...b].sort(
    (x, y) => y.watchedAt.getTime() - x.watchedAt.getTime(),
  );
}

function watchEntryRowToHistoryItem(row: {
  id: string;
  watchedAt: Date;
  mediaItem: WatchHistoryListItem["mediaItem"];
}): WatchHistoryListItem {
  return {
    id: row.id,
    watchedAt: row.watchedAt,
    mediaItem: row.mediaItem,
  };
}

function episodeStatusRowToHistoryItem(row: {
  id: string;
  watchedAt: Date;
  seasonNumber: number;
  episodeNumber: number;
  mediaItem: WatchHistoryListItem["mediaItem"];
}): WatchHistoryListItem {
  return {
    id: `es:${row.id}`,
    watchedAt: row.watchedAt,
    mediaItem: row.mediaItem,
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
  };
}

/** Movies and TV diary lines plus TV episode watches in a calendar range, newest first. */
export async function fetchMyWatchHistoryInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<WatchHistoryListItem[]> {
  const [entries, episodes] = await Promise.all([
    prisma.watchEntry.findMany({
      where: { userId, watchedAt: { gte: start, lte: end } },
      include: { mediaItem: { select: mediaSelect } },
    }),
    prisma.episodeStatus.findMany({
      where: {
        userId,
        isWatched: true,
        watchedAt: { gte: start, lte: end },
      },
      include: { mediaItem: { select: mediaSelect } },
    }),
  ]);
  return mergeWatchHistorySources(
    entries.map((e) =>
      watchEntryRowToHistoryItem({
        id: e.id,
        watchedAt: e.watchedAt,
        mediaItem: e.mediaItem,
      }),
    ),
    episodes.map((e) =>
      episodeStatusRowToHistoryItem({
        id: e.id,
        watchedAt: e.watchedAt,
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
        mediaItem: e.mediaItem,
      }),
    ),
  );
}

/**
 * Global feed: merged movies, TV diary lines, and TV episodes. Fetches a buffer from each source
 * then merges so the top `take` rows match true global ordering for typical libraries.
 */
export async function fetchMyWatchHistoryRecent(
  userId: string,
  take: number,
): Promise<WatchHistoryListItem[]> {
  const buffer = Math.min(Math.max(take * 3, take), 600);
  const [entries, episodes] = await Promise.all([
    prisma.watchEntry.findMany({
      where: { userId },
      orderBy: { watchedAt: "desc" },
      take: buffer,
      include: { mediaItem: { select: mediaSelect } },
    }),
    prisma.episodeStatus.findMany({
      where: { userId, isWatched: true },
      orderBy: { watchedAt: "desc" },
      take: buffer,
      include: { mediaItem: { select: mediaSelect } },
    }),
  ]);
  return mergeWatchHistorySources(
    entries.map((e) =>
      watchEntryRowToHistoryItem({
        id: e.id,
        watchedAt: e.watchedAt,
        mediaItem: e.mediaItem,
      }),
    ),
    episodes.map((e) =>
      episodeStatusRowToHistoryItem({
        id: e.id,
        watchedAt: e.watchedAt,
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
        mediaItem: e.mediaItem,
      }),
    ),
  ).slice(0, take);
}

export async function fetchFriendsWatchHistoryInRange(
  viewerId: string,
  start: Date,
  end: Date,
  take = 80,
): Promise<FriendWatchHistoryRow[]> {
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

  const [entryRows, episodeRows] = await Promise.all([
    prisma.watchEntry.findMany({
      where: {
        userId: { in: visibleIds },
        watchedAt: { gte: start, lte: end },
      },
      include: {
        mediaItem: { select: mediaSelect },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.episodeStatus.findMany({
      where: {
        userId: { in: visibleIds },
        isWatched: true,
        watchedAt: { gte: start, lte: end },
      },
      include: {
        mediaItem: { select: mediaSelect },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
  ]);

  const fromEntries: FriendWatchHistoryRow[] = entryRows.map((e) => ({
    id: e.id,
    watchedAt: e.watchedAt,
    mediaItem: e.mediaItem,
    user: e.user,
  }));

  const fromEpisodes: FriendWatchHistoryRow[] = episodeRows.map((e) => ({
    id: `es:${e.id}`,
    watchedAt: e.watchedAt,
    mediaItem: e.mediaItem,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    user: e.user,
  }));

  return mergeFriendWatchHistoryRows(fromEntries, fromEpisodes).slice(0, take);
}

/** @deprecated Use fetchMyWatchHistoryInRange */
export async function fetchMyWatchEntriesInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<WatchHistoryListItem[]> {
  return fetchMyWatchHistoryInRange(userId, start, end);
}

/** @deprecated Use fetchFriendsWatchHistoryInRange */
export async function fetchFriendsWatchEntriesInRange(
  viewerId: string,
  start: Date,
  end: Date,
  take?: number,
): Promise<FriendWatchHistoryRow[]> {
  return fetchFriendsWatchHistoryInRange(viewerId, start, end, take);
}

/** Days in month (1–31) that have at least one movie/TV diary line or TV episode watch. */
export async function fetchMyWatchDaysInMonth(
  userId: string,
  start: Date,
  end: Date,
): Promise<Set<number>> {
  const [entryRows, episodeRows] = await Promise.all([
    prisma.watchEntry.findMany({
      where: { userId, watchedAt: { gte: start, lte: end } },
      select: { watchedAt: true },
    }),
    prisma.episodeStatus.findMany({
      where: {
        userId,
        isWatched: true,
        watchedAt: { gte: start, lte: end },
      },
      select: { watchedAt: true },
    }),
  ]);
  const days = new Set<number>();
  for (const r of entryRows) {
    days.add(r.watchedAt.getDate());
  }
  for (const r of episodeRows) {
    days.add(r.watchedAt.getDate());
  }
  return days;
}

export interface CalendarReleaseItem {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  poster: string | null;
  releaseDate: Date;
}

/** WATCHLIST/WATCHING items whose release date falls within [start, end]. */
export async function fetchReleasesInMonth(
  userId: string,
  start: Date,
  end: Date,
): Promise<CalendarReleaseItem[]> {
  const statuses = await prisma.userMediaStatus.findMany({
    where: {
      userId,
      status: { in: ["WATCHLIST", "WATCHING"] },
      mediaItem: { releaseDate: { gte: start, lte: end } },
    },
    select: {
      mediaItem: {
        select: {
          id: true,
          tmdbId: true,
          type: true,
          title: true,
          poster: true,
          releaseDate: true,
        },
      },
    },
    orderBy: { mediaItem: { releaseDate: "asc" } },
  });
  return statuses
    .filter((s) => s.mediaItem.releaseDate != null)
    .map((s) => ({ ...s.mediaItem, releaseDate: s.mediaItem.releaseDate! }));
}

/**
 * Recently watched titles for the home grid: one card per title, ordered by latest watch
 * (movie diary, TV diary, or any episode of that show).
 */
export async function fetchHomeRecentWatchedTitles(
  userId: string,
  opts: { titleLimit: number; fetchPerSource: number },
): Promise<string[]> {
  const { titleLimit, fetchPerSource } = opts;
  const [entries, episodes] = await Promise.all([
    prisma.watchEntry.findMany({
      where: { userId },
      orderBy: { watchedAt: "desc" },
      take: fetchPerSource,
      select: { mediaItemId: true, watchedAt: true },
    }),
    prisma.episodeStatus.findMany({
      where: { userId, isWatched: true },
      orderBy: { watchedAt: "desc" },
      take: fetchPerSource,
      select: { mediaItemId: true, watchedAt: true },
    }),
  ]);
  type Row = { mediaItemId: string; watchedAt: Date };
  const rows: Row[] = [
    ...entries.map((e) => ({
      mediaItemId: e.mediaItemId,
      watchedAt: e.watchedAt,
    })),
    ...episodes.map((e) => ({
      mediaItemId: e.mediaItemId,
      watchedAt: e.watchedAt,
    })),
  ];
  rows.sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime());
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const r of rows) {
    if (seen.has(r.mediaItemId)) continue;
    seen.add(r.mediaItemId);
    orderedIds.push(r.mediaItemId);
    if (orderedIds.length >= titleLimit) break;
  }
  return orderedIds;
}
