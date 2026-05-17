import type { TmdbGenre } from "@/lib/tmdb";

/** Find the TMDB genre ID for a genre name (case-insensitive). */
export function findGenreByName(
  genres: TmdbGenre[],
  name: string,
): number | null {
  const lower = name.toLowerCase();
  return genres.find((g) => g.name.toLowerCase() === lower)?.id ?? null;
}
