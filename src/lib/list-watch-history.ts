import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import {
  challengeWindowBounds,
  type ChallengeWindow,
} from "@/lib/list-challenge-window";

/**
 * A list's shared watch history is not filtered by `watchHistoryVisibility` — unlike friends'
 * history, membership in the list is itself the consent to share watches of the list's titles
 * with the other members. See research.md R11.
 */

export type ListWatchHistoryRow = {
  id: string;
  watchedAt: Date;
  mediaItemId: string;
  mediaItem: {
    tmdbId: number;
    type: MediaType;
    title: string;
    poster: string | null;
    year: number | null;
  };
  user: { id: string; name: string; avatarUrl: string | null };
  seasonNumber?: number;
  episodeNumber?: number;
};

const mediaSelect = {
  tmdbId: true,
  type: true,
  title: true,
  poster: true,
  year: true,
} as const;

export function mergeListWatchRows(
  a: ListWatchHistoryRow[],
  b: ListWatchHistoryRow[],
): ListWatchHistoryRow[] {
  return [...a, ...b].sort(
    (x, y) => y.watchedAt.getTime() - x.watchedAt.getTime(),
  );
}

type FetchListWatchHistoryInput = {
  mediaItemIds: string[];
  memberUserIds: string[];
  window: ChallengeWindow;
  take?: number;
};

export async function fetchListWatchHistory({
  mediaItemIds,
  memberUserIds,
  window,
  take = 200,
}: FetchListWatchHistoryInput): Promise<ListWatchHistoryRow[]> {
  if (mediaItemIds.length === 0 || memberUserIds.length === 0) return [];

  const bounds = challengeWindowBounds(window);
  const watchedAtFilter = bounds
    ? { gte: bounds.gte, lt: bounds.lt }
    : undefined;

  const [entryRows, episodeRows] = await Promise.all([
    prisma.watchEntry.findMany({
      where: {
        mediaItemId: { in: mediaItemIds },
        userId: { in: memberUserIds },
        ...(watchedAtFilter ? { watchedAt: watchedAtFilter } : {}),
      },
      include: {
        mediaItem: { select: mediaSelect },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.episodeStatus.findMany({
      where: {
        mediaItemId: { in: mediaItemIds },
        userId: { in: memberUserIds },
        isWatched: true,
        ...(watchedAtFilter ? { watchedAt: watchedAtFilter } : {}),
      },
      include: {
        mediaItem: { select: mediaSelect },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
  ]);

  const fromEntries: ListWatchHistoryRow[] = entryRows.map((e) => ({
    id: e.id,
    watchedAt: e.watchedAt,
    mediaItemId: e.mediaItemId,
    mediaItem: e.mediaItem,
    user: e.user,
  }));

  const fromEpisodes: ListWatchHistoryRow[] = episodeRows.map((e) => ({
    id: `es:${e.id}`,
    watchedAt: e.watchedAt,
    mediaItemId: e.mediaItemId,
    mediaItem: e.mediaItem,
    user: e.user,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
  }));

  return mergeListWatchRows(fromEntries, fromEpisodes).slice(0, take);
}

type FetchListInWindowWatchedMediaItemIdsInput = {
  mediaItemIds: string[];
  memberUserIds: string[];
  window: ChallengeWindow;
};

export async function fetchListInWindowWatchedMediaItemIds({
  mediaItemIds,
  memberUserIds,
  window,
}: FetchListInWindowWatchedMediaItemIdsInput): Promise<Set<string>> {
  if (mediaItemIds.length === 0 || memberUserIds.length === 0) {
    return new Set();
  }

  const bounds = challengeWindowBounds(window);
  const watchedAtFilter = bounds
    ? { gte: bounds.gte, lt: bounds.lt }
    : undefined;

  const [entryRows, episodeRows] = await Promise.all([
    prisma.watchEntry.findMany({
      where: {
        mediaItemId: { in: mediaItemIds },
        userId: { in: memberUserIds },
        ...(watchedAtFilter ? { watchedAt: watchedAtFilter } : {}),
      },
      select: { mediaItemId: true },
    }),
    prisma.episodeStatus.findMany({
      where: {
        mediaItemId: { in: mediaItemIds },
        userId: { in: memberUserIds },
        isWatched: true,
        ...(watchedAtFilter ? { watchedAt: watchedAtFilter } : {}),
      },
      select: { mediaItemId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const row of entryRows) ids.add(row.mediaItemId);
  for (const row of episodeRows) ids.add(row.mediaItemId);
  return ids;
}
