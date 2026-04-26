/**
 * Order `UserMediaStatus`-shaped rows by recency of watch activity (title-level
 * `WatchEntry` and `EpisodeStatus` max `watchedAt`), falling back to `updatedAt`
 * when there is no watch/episode data for that title.
 */
export function buildLastWatchedMsByMediaItemId(
  watchAgg: { mediaItemId: string; _max: { watchedAt: Date | null } }[],
  episodeAgg: { mediaItemId: string; _max: { watchedAt: Date | null } }[],
): Map<string, number> {
  const map = new Map<string, number>();
  const bump = (mediaItemId: string, d: Date | null | undefined) => {
    const t = d?.getTime();
    if (t == null || Number.isNaN(t)) return;
    map.set(mediaItemId, Math.max(map.get(mediaItemId) ?? 0, t));
  };
  for (const row of watchAgg) bump(row.mediaItemId, row._max.watchedAt);
  for (const row of episodeAgg) bump(row.mediaItemId, row._max.watchedAt);
  return map;
}

export function sortByLastWatchedDesc<
  T extends { mediaItemId: string; updatedAt: Date },
>(items: T[], lastWatchedMs: Map<string, number>): T[] {
  return [...items].sort((a, b) => {
    const tb = lastWatchedMs.get(b.mediaItemId) ?? b.updatedAt.getTime();
    const ta = lastWatchedMs.get(a.mediaItemId) ?? a.updatedAt.getTime();
    return tb - ta;
  });
}
