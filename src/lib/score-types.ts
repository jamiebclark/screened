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
  hideAllLogged?: boolean;
};
