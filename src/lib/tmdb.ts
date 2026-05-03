const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string>,
  revalidate = 3600,
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export function tmdbImage(
  path: string | null | undefined,
  size = "w500",
): string | null {
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
  external_ids?: { imdb_id?: string | null };
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
  external_ids?: {
    imdb_id?: string | null;
  };
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

export async function searchMulti(
  query: string,
  page = 1,
): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function getMovie(tmdbId: number): Promise<TmdbMovie> {
  const data = await tmdbFetch<TmdbMovie>(`/movie/${tmdbId}`, {
    append_to_response: "external_ids",
  });
  const imdb_id = data.external_ids?.imdb_id ?? data.imdb_id ?? null;
  return { ...data, imdb_id, genres: data.genres ?? [] };
}

export async function getTvShow(tmdbId: number): Promise<TmdbTvShow> {
  const data = await tmdbFetch<TmdbTvShow>(`/tv/${tmdbId}`, {
    append_to_response: "external_ids",
  });
  return {
    ...data,
    genres: data.genres ?? [],
    episode_run_time: data.episode_run_time ?? [],
    seasons: data.seasons ?? [],
  };
}

export async function getTvSeason(
  tvId: number,
  seasonNumber: number,
): Promise<TmdbSeasonDetail> {
  return tmdbFetch<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getTrending(
  type: "movie" | "tv" | "all" = "all",
  window: "day" | "week" = "week",
): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>(`/trending/${type}/${window}`);
}

export async function searchMovie(
  query: string,
  year?: number,
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
  const res = await tmdbFetch<{
    results: TmdbSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }>("/movie/popular", { page: String(page) });
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
  };
}

type TmdbMovieListPage = {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
};

export interface TmdbPersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
}

type TmdbPersonSearchResponse = {
  results: TmdbPersonSearchResult[];
  total_results: number;
  total_pages: number;
  page: number;
};

export async function searchPerson(
  query: string,
  page = 1,
): Promise<TmdbPersonSearchResponse> {
  return tmdbFetch<TmdbPersonSearchResponse>("/search/person", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

/** TMDB "Because you liked X" and similar-titles; returns movie-shaped results. */
export async function getMovieRecommendations(
  tmdbId: number,
  page = 1,
): Promise<TmdbMovieListPage> {
  const res = await tmdbFetch<TmdbMovieListPage>(
    `/movie/${tmdbId}/recommendations`,
    { page: String(page) },
  );
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
  };
}

export async function getMovieSimilar(
  tmdbId: number,
  page = 1,
): Promise<TmdbMovieListPage> {
  const res = await tmdbFetch<TmdbMovieListPage>(`/movie/${tmdbId}/similar`, {
    page: String(page),
  });
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
  };
}

export async function getTvSimilar(
  tmdbId: number,
  page = 1,
): Promise<TmdbMovieListPage> {
  const res = await tmdbFetch<TmdbMovieListPage>(`/tv/${tmdbId}/similar`, {
    page: String(page),
  });
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "tv" as const })),
  };
}

interface TmdbCreditsResponse {
  cast: { id: number; name: string; order: number }[];
  crew: { id: number; name: string; job: string }[];
}

interface TmdbMovieKeywordsResponse {
  keywords: { id: number; name: string }[];
}

interface TmdbTvKeywordsResponse {
  results: { id: number; name: string }[];
}

const DIRECTOR_JOBS = new Set(["Director", "Co-Director"]);

export type TmdbMovieCredits = {
  cast: string[];
  /** Primary (first) director for display / DB. */
  director: string | null;
  /** All unique director and co-director names from crew (for person matching). */
  directors: string[];
};

export async function getMovieCredits(
  tmdbId: number,
): Promise<TmdbMovieCredits> {
  const data = await tmdbFetch<TmdbCreditsResponse>(`/movie/${tmdbId}/credits`);
  const cast = data.cast
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)
    .map((c) => c.name);
  const directorNames = data.crew
    .filter((c) => DIRECTOR_JOBS.has(c.job))
    .map((c) => c.name);
  const directors = [...new Set(directorNames)];
  return { cast, director: directors[0] ?? null, directors };
}

export async function getMovieKeywords(tmdbId: number): Promise<string[]> {
  const data = await tmdbFetch<TmdbMovieKeywordsResponse>(
    `/movie/${tmdbId}/keywords`,
  );
  return data.keywords.map((k) => k.name);
}

export async function getTvCredits(
  tmdbId: number,
): Promise<{ cast: string[]; director: string | null }> {
  const data = await tmdbFetch<TmdbCreditsResponse>(`/tv/${tmdbId}/credits`);
  const cast = data.cast
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)
    .map((c) => c.name);
  const creator =
    data.crew.find((c) => c.job === "Creator" || c.job === "Series Director")
      ?.name ?? null;
  return { cast, director: creator };
}

export async function getTvKeywords(tmdbId: number): Promise<string[]> {
  const data = await tmdbFetch<TmdbTvKeywordsResponse>(
    `/tv/${tmdbId}/keywords`,
  );
  return data.results.map((k) => k.name);
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TmdbWatchProviderResult {
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  link?: string;
}

interface TmdbWatchProvidersResponse {
  results: Record<string, TmdbWatchProviderResult & { link: string }>;
}

export async function getWatchProviders(
  tmdbId: number,
  type: "movie" | "tv",
  countryCode = "US",
): Promise<TmdbWatchProviderResult | null> {
  try {
    const path =
      type === "movie"
        ? `/movie/${tmdbId}/watch/providers`
        : `/tv/${tmdbId}/watch/providers`;
    const data = await tmdbFetch<TmdbWatchProvidersResponse>(path);
    return data.results[countryCode] ?? null;
  } catch {
    return null;
  }
}

// Person API

interface TmdbPersonResponse {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface TmdbPerson {
  id: number;
  name: string;
  profilePath: string | null;
  biography: string;
  birthday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string;
  popularity: number;
}

export async function getPerson(tmdbId: number): Promise<TmdbPerson> {
  const data = await tmdbFetch<TmdbPersonResponse>(
    `/person/${tmdbId}`,
    {},
    604800, // 7 days
  );

  return {
    id: data.id,
    name: data.name,
    profilePath: data.profile_path,
    biography: data.biography || "",
    birthday: data.birthday,
    placeOfBirth: data.place_of_birth,
    knownForDepartment: data.known_for_department || "Unknown",
    popularity: data.popularity,
  };
}

export interface PersonSearchResult {
  tmdbId: number;
  profilePath: string | null;
}

export async function searchPersonByName(
  name: string,
): Promise<PersonSearchResult | null> {
  try {
    const res = await tmdbFetch<TmdbPersonSearchResponse>(
      "/search/person",
      {
        query: name,
        include_adult: "false",
        page: "1",
      },
      604800, // 7 days
    );

    const person = res.results[0];
    if (!person) return null;

    return {
      tmdbId: person.id,
      profilePath: person.profile_path,
    };
  } catch {
    return null;
  }
}

/** Jobs we treat as “directing” for discovery lists (movies + TV). */
const PERSON_DIRECTING_JOBS = new Set([
  "Director",
  "Co-Director",
  "Series Director",
  "Creator",
]);

interface TmdbCombinedCreditsCrew {
  id: number;
  job: string;
  department?: string;
  media_type?: string;
  title?: string;
  original_title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
}

interface TmdbCombinedCreditsResponse {
  crew: TmdbCombinedCreditsCrew[];
}

/** Every movie/TV credit where this person has a directing-style job (TMDB combined_credits). */
export type PersonDirectedCredit = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  /** ISO date string or null when unknown */
  releaseDate: string | null;
  job: string;
};

export async function getPersonDirectedCredits(
  personTmdbId: number,
): Promise<PersonDirectedCredit[]> {
  const data = await tmdbFetch<TmdbCombinedCreditsResponse>(
    `/person/${personTmdbId}/combined_credits`,
    {},
    604800,
  );

  const crew = data.crew ?? [];
  const byKey = new Map<string, PersonDirectedCredit>();

  for (const c of crew) {
    if (!PERSON_DIRECTING_JOBS.has(c.job)) continue;
    const mt = c.media_type;
    if (mt !== "movie" && mt !== "tv") continue;

    const title =
      mt === "movie"
        ? (c.title ?? c.original_title ?? "").trim()
        : (c.name ?? "").trim();
    if (!title) continue;

    const key = `${mt}-${c.id}`;
    if (byKey.has(key)) continue;

    const releaseDate =
      mt === "movie" ? (c.release_date ?? null) : (c.first_air_date ?? null);

    byKey.set(key, {
      tmdbId: c.id,
      mediaType: mt,
      title,
      poster: c.poster_path,
      releaseDate,
      job: c.job,
    });
  }

  const list = [...byKey.values()];
  list.sort((a, b) => {
    const ta = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
    const tb = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
    return tb - ta;
  });

  return list;
}
