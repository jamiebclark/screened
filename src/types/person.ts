// TypeScript types for TMDB Person API and Person Filmography

// TMDB Person API Response Types

export interface TmdbPersonResponse {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  external_ids?: {
    imdb_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
}

export interface TmdbPersonSearchResult {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  popularity: number;
  known_for: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type: "movie" | "tv";
  }>;
}

export interface TmdbPersonSearchResponse {
  page: number;
  results: TmdbPersonSearchResult[];
  total_pages: number;
  total_results: number;
}

// Application Person Types

export interface Person {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  biography: string;
  birthday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string;
  popularity: number;
}

export interface PersonFilmographyItem {
  tmdbId: number;
  type: "MOVIE" | "TV";
  title: string;
  poster: string | null;
  releaseDate: Date | null;
  watchStatus: "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED" | null;
  userRating: number | null;
  role: "cast" | "director" | "creator";
}

export interface PersonFilmography {
  person: Person;
  movies: PersonFilmographyItem[];
  tvShows: PersonFilmographyItem[];
  totalCount: number;
}
