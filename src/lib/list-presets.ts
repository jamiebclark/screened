export type ListPreset = "watchlist" | "poll" | "ranked" | "custom";

export type ListFeatureFlags = {
  rankingEnabled: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  displayMode: "GRID" | "LIST";
};

export const LIST_PRESETS: Record<ListPreset, ListFeatureFlags> = {
  watchlist: {
    rankingEnabled: false,
    votingEnabled: false,
    commentsEnabled: true,
    displayMode: "GRID",
  },
  poll: {
    rankingEnabled: false,
    votingEnabled: true,
    commentsEnabled: true,
    displayMode: "GRID",
  },
  ranked: {
    rankingEnabled: true,
    votingEnabled: false,
    commentsEnabled: true,
    displayMode: "LIST",
  },
  custom: {
    rankingEnabled: false,
    votingEnabled: false,
    commentsEnabled: true,
    displayMode: "GRID",
  },
};

export function applyPreset(
  preset: ListPreset,
  overrides?: Partial<ListFeatureFlags>,
): ListFeatureFlags {
  const base = { ...LIST_PRESETS[preset] };
  if (!overrides) return base;
  const merged = { ...base, ...overrides };
  // Enforce mutex: ranking and voting cannot both be true
  if (merged.rankingEnabled && merged.votingEnabled) {
    merged.votingEnabled = false;
  }
  return merged;
}
