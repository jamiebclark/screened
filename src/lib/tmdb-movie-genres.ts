/**
 * TMDB movie genre names (English), same strings as /genre/movie/list and movie details.
 * Used for Picker filters and autocomplete.
 */
export const TMDB_MOVIE_GENRE_NAMES: readonly string[] = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "TV Movie",
  "Thriller",
  "War",
  "Western",
] as const;

/** Case-insensitive substring match; empty query returns the start of the sorted list. */
export function filterTmdbMovieGenres(query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase();
  const pool = [...TMDB_MOVIE_GENRE_NAMES].sort((a, b) => a.localeCompare(b));
  if (!q) return pool.slice(0, limit);
  return pool.filter((name) => name.toLowerCase().includes(q)).slice(0, limit);
}
