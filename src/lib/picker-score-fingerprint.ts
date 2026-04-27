import type { PickerRoomState } from "./picker-room-state";

function parseOptionalYear(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Stable fingerprint of picker inputs sent to `/api/session/score`.
 * Used to detect when criteria changed since the last successful run.
 */
export function computePickerScoreFingerprint(state: PickerRoomState): string {
  const maxRuntimeRaw = state.maxRuntime.trim();
  const maxRuntimeParsed = maxRuntimeRaw
    ? parseInt(maxRuntimeRaw, 10)
    : undefined;
  const hardFilters = {
    minYear: parseOptionalYear(state.minYear),
    maxYear: parseOptionalYear(state.maxYear),
    maxRuntime:
      maxRuntimeRaw && Number.isFinite(maxRuntimeParsed)
        ? maxRuntimeParsed
        : undefined,
    vetoIds:
      state.vetoIds.length > 0
        ? [...state.vetoIds].sort((a, b) => a.localeCompare(b))
        : undefined,
    requirePeople:
      state.requirePeople.length > 0 ? [...state.requirePeople] : undefined,
    excludePeople:
      state.excludePeople.length > 0 ? [...state.excludePeople] : undefined,
    includeGenres:
      state.includeGenres.length > 0 ? [...state.includeGenres] : undefined,
    excludeGenres:
      state.excludeGenres.length > 0 ? [...state.excludeGenres] : undefined,
    hideAllLogged: state.hideAllLogged,
  };
  const payload = {
    participantIds: [...state.participants.map((p) => p.id)].sort((a, b) =>
      a.localeCompare(b),
    ),
    attractors: [...state.attractors]
      .map((a) => ({ mediaItemId: a.mediaItemId, weight: a.weight }))
      .sort((a, b) => a.mediaItemId.localeCompare(b.mediaItemId)),
    repellers: [...state.repellers]
      .map((r) => ({ mediaItemId: r.mediaItemId, weight: r.weight }))
      .sort((a, b) => a.mediaItemId.localeCompare(b.mediaItemId)),
    hardFilters,
    plexLibraryOnly: state.plexLibraryOnly,
  };
  return JSON.stringify(payload);
}

/**
 * Backfill `lastScoreFingerprint` for room rows that have ranked results but
 * predate fingerprint storage, so “criteria dirty” UX works after reload.
 */
export function hydratePickerFingerprintIfNeeded(
  state: PickerRoomState,
): PickerRoomState {
  if (state.lastScoreFingerprint != null) return state;
  if (state.scoringResults == null || state.scoringResults.length === 0) {
    return state;
  }
  return {
    ...state,
    lastScoreFingerprint: computePickerScoreFingerprint(state),
  };
}
