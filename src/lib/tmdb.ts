const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export function tmdbImage(path: string | null | undefined, size = "w500"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  imdb_id: string | null;
}

export interface TmdbTvShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  seasons: TmdbSeason[];
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
}

export interface TmdbSeasonDetail extends TmdbSeason {
  episodes: TmdbEpisode[];
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type: "movie" | "tv";
  vote_average: number;
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[];
  total_results: number;
  total_pages: number;
  page: number;
}

export async function searchMulti(query: string, page = 1): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function getMovie(tmdbId: number): Promise<TmdbMovie> {
  return tmdbFetch<TmdbMovie>(`/movie/${tmdbId}`);
}

export async function getTvShow(tmdbId: number): Promise<TmdbTvShow> {
  return tmdbFetch<TmdbTvShow>(`/tv/${tmdbId}`);
}

export async function getTvSeason(tvId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
  return tmdbFetch<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getTrending(
  type: "movie" | "tv" | "all" = "all",
  window: "day" | "week" = "week"
): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>(`/trending/${type}/${window}`);
}

export async function searchMovie(
  query: string,
  year?: number
): Promise<TmdbSearchResponse> {
  const params: Record<string, string> = { query, include_adult: "false" };
  if (year) params.primary_release_year = String(year);
  const res = await tmdbFetch<{
    results: TmdbSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }>("/search/movie", params);
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
  };
}

export async function getPopularMovies(page = 1): Promise<TmdbSearchResponse> {
  const res = await tmdbFetch<{ results: TmdbSearchResult[]; total_results: number; total_pages: number; page: number }>(
    "/movie/popular",
    { page: String(page) }
  );
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
  };
}
