/**
 * Picker hard filters: match user-typed genre tokens against TMDB genre names
 * stored on `MediaItem.genres` (e.g. "Animation", "Horror").
 */
export function matchesGenreToken(
  genreName: string,
  userToken: string,
): boolean {
  const g = genreName.trim().toLowerCase();
  const t = userToken.trim().toLowerCase();
  if (!g || !t) return false;
  return g === t || g.includes(t) || t.includes(g);
}

function genreMatchesAnyToken(genres: string[], token: string): boolean {
  return genres.some((name) => matchesGenreToken(name, token));
}

/** True if the title should be dropped because it matches an excluded genre. */
export function shouldExcludeByGenres(
  genres: string[],
  excludeTokens: string[] | undefined,
): boolean {
  const xs = (excludeTokens ?? []).map((s) => s.trim()).filter(Boolean);
  if (xs.length === 0) return false;
  return xs.some((token) => genreMatchesAnyToken(genres, token));
}

/**
 * If include tokens are set, the title must match at least one (OR).
 * If none are set, any genres pass.
 */
export function passesIncludeGenres(
  genres: string[],
  includeTokens: string[] | undefined,
): boolean {
  const inc = (includeTokens ?? []).map((s) => s.trim()).filter(Boolean);
  if (inc.length === 0) return true;
  return inc.some((token) => genreMatchesAnyToken(genres, token));
}

export function passesGenreFilters(
  genres: string[],
  include?: string[],
  exclude?: string[],
): boolean {
  if (shouldExcludeByGenres(genres, exclude)) return false;
  if (!passesIncludeGenres(genres, include)) return false;
  return true;
}
