/**
 * Plex PMS JSON sometimes encodes season/episode as strings, or uses alternate
 * key casing. Sync must coerce these or every episode is dropped and the DB
 * stays empty while the sync summary still counts “shows processed”.
 */
export function normalizePlexEpisodeSeasonAndIndex(
  ep: Record<string, unknown>,
): { seasonNumber: number; episodeNumber: number } | null {
  const pickNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const seasonNumber = pickNum(ep["parentIndex"]) ?? pickNum(ep["ParentIndex"]);
  const episodeNumber = pickNum(ep["index"]) ?? pickNum(ep["Index"]);
  if (seasonNumber === null || episodeNumber === null) return null;
  return { seasonNumber, episodeNumber };
}
