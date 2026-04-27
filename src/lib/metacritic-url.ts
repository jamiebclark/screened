import slugify from "slugify";

/**
 * Metacritic does not publish a stable IMDb-based URL in our data sources; we link to
 * the standard title slug page (may 404 for edge cases; search on Metacritic if needed).
 */
export function metacriticTitlePathUrl(
  title: string,
  type: "movie" | "tv",
): string {
  const slug = slugify(title, { lower: true, strict: true, trim: true });
  if (type === "movie") {
    return `https://www.metacritic.com/movie/${slug}/`;
  }
  return `https://www.metacritic.com/tv/${slug}/`;
}
