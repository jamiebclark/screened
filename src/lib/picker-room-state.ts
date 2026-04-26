// Serializable picker session payload stored in PickerRoom.state
export type ReferenceMovieJson = {
  mediaItemId: string;
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  weight: number;
  saved: boolean;
  hasEmbedding: boolean;
};

export type ScoredMovieJson = {
  id: string;
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  runtime: number | null;
  genres: string[];
  overview: string | null;
  cast: string[];
  director: string | null;
  score: number;
  attractorScore: number;
  repellerScore: number;
};

export type PickerRoomState = {
  participants: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  }[];
  attractors: ReferenceMovieJson[];
  repellers: ReferenceMovieJson[];
  minYear: string;
  maxYear: string;
  maxRuntime: string;
  requirePeople: string[];
  excludePeople: string[];
  /** Media item ids hard-excluded from the ranked list and scoring pool */
  vetoIds: string[];
  /** Intersect with Plex library TMDB ids (current user must have Plex linked). */
  plexLibraryOnly: boolean;
  hideAllLogged: boolean;
  filtersOpen: boolean;
  scoringInProgress: boolean;
  scoringError: string | null;
  scoringResults: ScoredMovieJson[] | null;
};

export function defaultPickerState(currentUser: {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}): PickerRoomState {
  return {
    participants: [currentUser],
    attractors: [],
    repellers: [],
    minYear: "",
    maxYear: "",
    maxRuntime: "",
    requirePeople: [],
    excludePeople: [],
    vetoIds: [],
    plexLibraryOnly: false,
    hideAllLogged: false,
    filtersOpen: true,
    scoringInProgress: false,
    scoringError: null,
    scoringResults: null,
  };
}

export function isPickerState(x: unknown): x is PickerRoomState {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    !Array.isArray(o.participants) ||
    !Array.isArray(o.attractors) ||
    !Array.isArray(o.repellers) ||
    typeof o.minYear !== "string" ||
    typeof o.maxRuntime !== "string"
  ) {
    return false;
  }
  if (
    !Array.isArray(o.requirePeople) ||
    !Array.isArray(o.excludePeople) ||
    typeof o.hideAllLogged !== "boolean" ||
    typeof o.filtersOpen !== "boolean"
  ) {
    return false;
  }
  if (o.maxYear !== undefined && typeof o.maxYear !== "string") return false;
  if (o.vetoIds !== undefined) {
    if (!Array.isArray(o.vetoIds) || o.vetoIds.some((id) => typeof id !== "string")) return false;
  }
  if (o.plexLibraryOnly !== undefined && typeof o.plexLibraryOnly !== "boolean") return false;
  if (o.scoringInProgress !== undefined && typeof o.scoringInProgress !== "boolean") return false;
  if (o.scoringError !== undefined && o.scoringError !== null && typeof o.scoringError !== "string") return false;
  if (o.scoringResults !== undefined && o.scoringResults !== null && !Array.isArray(o.scoringResults)) {
    return false;
  }
  return true;
}

/** Ensures scoring fields exist (for legacy DB rows and partial parses). */
export function withScoringDefaults(s: PickerRoomState): PickerRoomState {
  const raw = s as PickerRoomState & { candidateSource?: "tmdb" | "library" };
  const { candidateSource: _legacy, ...rest } = raw;
  return {
    ...rest,
    maxYear: rest.maxYear ?? "",
    vetoIds: rest.vetoIds ?? [],
    plexLibraryOnly: rest.plexLibraryOnly ?? false,
    filtersOpen: rest.filtersOpen ?? true,
    scoringInProgress: rest.scoringInProgress ?? false,
    scoringError: rest.scoringError ?? null,
    scoringResults: rest.scoringResults !== undefined ? rest.scoringResults : null,
  };
}
