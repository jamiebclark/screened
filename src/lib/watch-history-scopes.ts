export const WATCH_ENTRY_SCOPES = [
  "plex_movie",
  "plex_tv",
  "letterboxd",
  "manual_movie",
  "manual_tv",
  "unknown_movie",
  "unknown_tv",
] as const;

export type WatchEntryScope = (typeof WATCH_ENTRY_SCOPES)[number];

export const PLEX_EPISODES_SCOPE = "plex_episodes" as const;

export type WatchHistoryResetScope = WatchEntryScope | typeof PLEX_EPISODES_SCOPE;

export interface WatchImportCounts {
  plexMovie: number;
  plexTv: number;
  letterboxd: number;
  manualMovie: number;
  manualTv: number;
  unknownMovie: number;
  unknownTv: number;
  plexEpisodes: number;
}

export function isWatchHistoryResetScope(s: string): s is WatchHistoryResetScope {
  if (s === PLEX_EPISODES_SCOPE) return true;
  return (WATCH_ENTRY_SCOPES as readonly string[]).includes(s);
}
