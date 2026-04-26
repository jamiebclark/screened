export type ReferenceItem = { mediaItemId: string; weight: number };

export type ScoredRow = {
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

export type HardFilterInput = {
  participantIds: string[];
  minYear?: number;
  maxYear?: number;
  maxRuntime?: number;
  vetoIds?: string[];
  requirePeople?: string[];
  excludePeople?: string[];
  /** At least one token must match a genre name (OR). Uses substring match; TMDB names e.g. "Animation". */
  includeGenres?: string[];
  /** Drop titles where any token matches any genre. */
  excludeGenres?: string[];
  hideAllLogged?: boolean;
};
