import { prisma } from "@/lib/prisma";
import { MediaType, WatchEntrySource } from "@/generated/prisma";
import type { WatchEntryScope, WatchHistoryResetScope, WatchImportCounts } from "@/lib/watch-history-scopes";
import { PLEX_EPISODES_SCOPE } from "@/lib/watch-history-scopes";

export type { WatchEntryScope, WatchHistoryResetScope, WatchImportCounts } from "@/lib/watch-history-scopes";
export { WATCH_ENTRY_SCOPES, isWatchHistoryResetScope, PLEX_EPISODES_SCOPE } from "@/lib/watch-history-scopes";

function watchEntryWhere(userId: string, scope: WatchEntryScope) {
  switch (scope) {
    case "plex_movie":
      return {
        userId,
        source: WatchEntrySource.PLEX,
        mediaItem: { type: MediaType.MOVIE },
      };
    case "plex_tv":
      return {
        userId,
        source: WatchEntrySource.PLEX,
        mediaItem: { type: MediaType.TV },
      };
    case "letterboxd":
      return { userId, source: WatchEntrySource.LETTERBOXD };
    case "manual_movie":
      return {
        userId,
        source: WatchEntrySource.MANUAL,
        mediaItem: { type: MediaType.MOVIE },
      };
    case "manual_tv":
      return {
        userId,
        source: WatchEntrySource.MANUAL,
        mediaItem: { type: MediaType.TV },
      };
    case "unknown_movie":
      return {
        userId,
        source: WatchEntrySource.UNKNOWN,
        mediaItem: { type: MediaType.MOVIE },
      };
    case "unknown_tv":
      return {
        userId,
        source: WatchEntrySource.UNKNOWN,
        mediaItem: { type: MediaType.TV },
      };
  }
}

export async function getWatchImportCounts(userId: string): Promise<WatchImportCounts> {
  const [
    plexMovie,
    plexTv,
    letterboxd,
    manualMovie,
    manualTv,
    unknownMovie,
    unknownTv,
    plexEpisodes,
  ] = await Promise.all([
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "plex_movie") }),
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "plex_tv") }),
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "letterboxd") }),
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "manual_movie") }),
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "manual_tv") }),
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "unknown_movie") }),
    prisma.watchEntry.count({ where: watchEntryWhere(userId, "unknown_tv") }),
    prisma.episodeStatus.count({ where: { userId } }),
  ]);

  return {
    plexMovie,
    plexTv,
    letterboxd,
    manualMovie,
    manualTv,
    unknownMovie,
    unknownTv,
    plexEpisodes,
  };
}

export async function resetWatchHistoryScope(userId: string, scope: WatchHistoryResetScope) {
  if (scope === PLEX_EPISODES_SCOPE) {
    return prisma.episodeStatus.deleteMany({ where: { userId } });
  }
  return prisma.watchEntry.deleteMany({ where: watchEntryWhere(userId, scope) });
}
