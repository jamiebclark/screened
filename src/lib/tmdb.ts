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

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), {
      headers: getHeaders(),
      next: { revalidate },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : (attempt + 1) * 2000;
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error(`TMDB error: ${res.status} ${res.statusText}`);
      continue;
    }

    if (!res.ok) {
      throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  throw lastError ?? new Error("TMDB request failed after retries");
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
  created_by?: { id: number; name: string; profile_path: string | null }[];
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

export type TmdbGenre = { id: number; name: string };

export async function getMovieGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>(
    "/genre/movie/list",
    {},
    86400,
  );
  return data.genres ?? [];
}

export async function getTvGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>(
    "/genre/tv/list",
    {},
    86400,
  );
  return data.genres ?? [];
}

export interface DiscoverOptions {
  /** Genre IDs — joined with commas for TMDB AND logic. */
  genreIds?: number[];
  /** TMDB sort_by string, e.g. "popularity.desc", "vote_average.desc". */
  sortBy?: string;
  yearMin?: number;
  yearMax?: number;
  /** Person IDs for TMDB `with_people` (covers cast + crew). */
  withPersonIds?: number[];
  page?: number;
}

export async function discoverMovies(
  opts: DiscoverOptions = {},
): Promise<TmdbSearchResponse> {
  const { genreIds, sortBy, yearMin, yearMax, withPersonIds, page = 1 } = opts;
  const params: Record<string, string> = {
    sort_by: sortBy ?? "popularity.desc",
    page: String(page),
    include_adult: "false",
  };
  if (genreIds?.length) params.with_genres = genreIds.join(",");
  if (yearMin) params["primary_release_date.gte"] = `${yearMin}-01-01`;
  if (yearMax) params["primary_release_date.lte"] = `${yearMax}-12-31`;
  if (withPersonIds?.length)
    params.with_people = withPersonIds.slice(0, 1).join(",");
  const res = await tmdbFetch<{
    results: TmdbSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }>("/discover/movie", params);
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
  };
}

export async function discoverTv(
  opts: DiscoverOptions = {},
): Promise<TmdbSearchResponse> {
  const { genreIds, sortBy, yearMin, yearMax, withPersonIds, page = 1 } = opts;
  const params: Record<string, string> = {
    sort_by: sortBy ?? "popularity.desc",
    page: String(page),
    include_adult: "false",
  };
  if (genreIds?.length) params.with_genres = genreIds.join(",");
  if (yearMin) params["first_air_date.gte"] = `${yearMin}-01-01`;
  if (yearMax) params["first_air_date.lte"] = `${yearMax}-12-31`;
  if (withPersonIds?.length)
    params.with_people = withPersonIds.slice(0, 1).join(",");
  const res = await tmdbFetch<{
    results: TmdbSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }>("/discover/tv", params);
  return {
    ...res,
    results: res.results.map((r) => ({ ...r, media_type: "tv" as const })),
  };
}

export async function getTrending(
  type: "movie" | "tv" | "all" = "all",
  window: "day" | "week" = "week",
): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>(`/trending/${type}/${window}`);
}

export async function getUpcomingReleasesPage(
  fromDate: string,
  page = 1,
): Promise<{ results: TmdbSearchResult[]; total_pages: number }> {
  const res = await tmdbFetch<{
    results: TmdbSearchResult[];
    total_pages: number;
    total_results: number;
  }>("/discover/movie", {
    sort_by: "popularity.desc",
    "primary_release_date.gte": fromDate,
    with_original_language: "en",
    region: "US",
    include_adult: "false",
    page: String(page),
  });
  return {
    results: res.results.map((r) => ({ ...r, media_type: "movie" as const })),
    total_pages: res.total_pages,
  };
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
  castTmdbIds: number[];
  director: string | null;
  directorTmdbId: number | null;
  directors: string[];
  directorsTmdbIds: number[];
};

export async function getMovieCredits(
  tmdbId: number,
): Promise<TmdbMovieCredits> {
  const data = await tmdbFetch<TmdbCreditsResponse>(`/movie/${tmdbId}/credits`);
  const sortedCast = data.cast.sort((a, b) => a.order - b.order).slice(0, 8);
  const cast = sortedCast.map((c) => c.name);
  const castTmdbIds = sortedCast.map((c) => c.id);

  const seen = new Set<string>();
  const uniqueDirectors: { id: number; name: string }[] = [];
  for (const c of data.crew) {
    if (DIRECTOR_JOBS.has(c.job) && !seen.has(c.name)) {
      seen.add(c.name);
      uniqueDirectors.push(c);
    }
  }
  const directors = uniqueDirectors.map((c) => c.name);
  const directorsTmdbIds = uniqueDirectors.map((c) => c.id);

  return {
    cast,
    castTmdbIds,
    director: directors[0] ?? null,
    directorTmdbId: directorsTmdbIds[0] ?? null,
    directors,
    directorsTmdbIds,
  };
}

export async function getMovieKeywords(tmdbId: number): Promise<string[]> {
  const data = await tmdbFetch<TmdbMovieKeywordsResponse>(
    `/movie/${tmdbId}/keywords`,
  );
  return data.keywords.map((k) => k.name);
}

type TmdbMovieWithDetailsResponse = TmdbMovie & {
  credits: TmdbCreditsResponse;
  keywords: TmdbMovieKeywordsResponse;
};

export type MovieWithDetails = {
  movie: TmdbMovie;
  credits: TmdbMovieCredits;
  keywords: string[];
};

/** Fetches movie details, credits, and keywords in a single TMDB request. */
export async function getMovieWithDetails(
  tmdbId: number,
): Promise<MovieWithDetails> {
  const data = await tmdbFetch<TmdbMovieWithDetailsResponse>(
    `/movie/${tmdbId}`,
    {
      append_to_response: "credits,keywords,external_ids",
    },
  );

  const imdb_id = data.external_ids?.imdb_id ?? data.imdb_id ?? null;
  const movie: TmdbMovie = { ...data, imdb_id, genres: data.genres ?? [] };

  const rawCast = data.credits?.cast ?? [];
  const rawCrew = data.credits?.crew ?? [];
  const sortedCast = [...rawCast].sort((a, b) => a.order - b.order).slice(0, 8);
  const cast = sortedCast.map((c) => c.name);
  const castTmdbIds = sortedCast.map((c) => c.id);

  const seen = new Set<string>();
  const uniqueDirectors: { id: number; name: string }[] = [];
  for (const c of rawCrew) {
    if (DIRECTOR_JOBS.has(c.job) && !seen.has(c.name)) {
      seen.add(c.name);
      uniqueDirectors.push(c);
    }
  }
  const directors = uniqueDirectors.map((c) => c.name);
  const directorsTmdbIds = uniqueDirectors.map((c) => c.id);

  return {
    movie,
    credits: {
      cast,
      castTmdbIds,
      director: directors[0] ?? null,
      directorTmdbId: directorsTmdbIds[0] ?? null,
      directors,
      directorsTmdbIds,
    },
    keywords: (data.keywords?.keywords ?? []).map((k) => k.name),
  };
}

export type TmdbTvCredits = {
  cast: string[];
  castTmdbIds: number[];
  creatorName: string | null;
  creatorTmdbId: number | null;
};

type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  official: boolean;
};

export async function getMovieTrailerKey(
  tmdbId: number,
): Promise<string | null> {
  const data = await tmdbFetch<{ results: TmdbVideo[] }>(
    `/movie/${tmdbId}/videos`,
  ).catch(() => null);
  if (!data) return null;

  const youtube = data.results.filter((v) => v.site === "YouTube");
  const pick =
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser" && v.official) ??
    youtube.find((v) => v.type === "Teaser") ??
    null;

  return pick?.key ?? null;
}

export async function getTvCredits(tmdbId: number): Promise<TmdbTvCredits> {
  const data = await tmdbFetch<TmdbCreditsResponse>(`/tv/${tmdbId}/credits`);
  const sortedCast = data.cast.sort((a, b) => a.order - b.order).slice(0, 8);
  const cast = sortedCast.map((c) => c.name);
  const castTmdbIds = sortedCast.map((c) => c.id);
  const creatorCrew = data.crew.find(
    (c) => c.job === "Creator" || c.job === "Series Director",
  );
  return {
    cast,
    castTmdbIds,
    creatorName: creatorCrew?.name ?? null,
    creatorTmdbId: creatorCrew?.id ?? null,
  };
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

interface TmdbCombinedCreditsCast {
  id: number;
  character: string;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  popularity: number;
}

interface TmdbCombinedCreditsResponse {
  cast: TmdbCombinedCreditsCast[];
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

/** Fetch TMDB profile paths for a batch of person IDs. Cached 7 days. */
export async function getPersonProfilePaths(
  tmdbIds: number[],
): Promise<Map<number, string | null>> {
  if (tmdbIds.length === 0) return new Map();
  const entries = await Promise.all(
    tmdbIds.map(async (id) => {
      try {
        const person = await getPerson(id);
        return [id, person.profilePath] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );
  return new Map(entries);
}

export interface ResolvedPerson {
  name: string;
  tmdbId: number | null;
  profilePath: string | null;
}

/**
 * Build a ResolvedPerson list from parallel name + tmdbId arrays (e.g.
 * MediaItem.cast + castTmdbIds). Falls back to TMDB name search when the
 * id arrays are empty (items not yet enriched).
 */
export async function resolvePersonList(
  names: string[],
  tmdbIds: number[],
): Promise<ResolvedPerson[]> {
  if (names.length === 0) return [];
  const hasIds =
    tmdbIds.length === names.length && tmdbIds.some((id) => id > 0);

  if (hasIds) {
    const validIds = tmdbIds.filter((id) => id > 0);
    const profileMap = await getPersonProfilePaths(validIds);
    return names.map((name, i) => {
      const id = tmdbIds[i] ?? 0;
      return {
        name,
        tmdbId: id > 0 ? id : null,
        profilePath: id > 0 ? (profileMap.get(id) ?? null) : null,
      };
    });
  }

  // Fallback: parallel name searches (cached 7 days)
  return Promise.all(
    names.map(async (name) => {
      const result = await searchPersonByName(name);
      return {
        name,
        tmdbId: result?.tmdbId ?? null,
        profilePath: result?.profilePath ?? null,
      };
    }),
  );
}

export type PersonActingCredit = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  character: string;
  poster: string | null;
  releaseDate: string | null;
};

/** Top acting credits from TMDB combined_credits, sorted by popularity. Capped at 40. */
export async function getPersonActingCredits(
  personTmdbId: number,
): Promise<PersonActingCredit[]> {
  const data = await tmdbFetch<TmdbCombinedCreditsResponse>(
    `/person/${personTmdbId}/combined_credits`,
    {},
    604800,
  );

  const castEntries = data.cast ?? [];
  const byKey = new Map<string, PersonActingCredit & { popularity: number }>();

  for (const c of castEntries) {
    const mt = c.media_type;
    if (mt !== "movie" && mt !== "tv") continue;
    const title =
      mt === "movie" ? (c.title ?? "").trim() : (c.name ?? "").trim();
    if (!title) continue;
    const key = `${mt}-${c.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      tmdbId: c.id,
      mediaType: mt,
      title,
      character: c.character || "",
      poster: c.poster_path,
      releaseDate:
        mt === "movie" ? (c.release_date ?? null) : (c.first_air_date ?? null),
      popularity: c.popularity,
    });
  }

  const list = [...byKey.values()];
  list.sort((a, b) => b.popularity - a.popularity);
  return list.slice(0, 40).map((c) => ({
    tmdbId: c.tmdbId,
    mediaType: c.mediaType,
    title: c.title,
    character: c.character,
    poster: c.poster,
    releaseDate: c.releaseDate,
  }));
}

/**
 * Returns all TMDB IDs from a person's combined credits for the given media type.
 * Includes both acting and crew credits. Used for reliable DB-side person filtering
 * that doesn't depend on MediaItem enrichment status.
 */
export async function getPersonCreditTmdbIds(
  personTmdbId: number,
  mediaType: "movie" | "tv",
): Promise<number[]> {
  const data = await tmdbFetch<TmdbCombinedCreditsResponse>(
    `/person/${personTmdbId}/combined_credits`,
    {},
    604800,
  );
  const ids = new Set<number>();
  for (const c of data.cast ?? []) {
    if (c.media_type === mediaType) ids.add(c.id);
  }
  for (const c of data.crew ?? []) {
    if (c.media_type === mediaType) ids.add(c.id);
  }
  return [...ids];
}
