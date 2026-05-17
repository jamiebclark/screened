import type { TmdbGenre } from "@/lib/tmdb";
import type { BrowseSortOrder } from "@/lib/browse-types";

/** Find the TMDB genre ID for a genre name (case-insensitive). */
export function findGenreByName(
  genres: TmdbGenre[],
  name: string,
): number | null {
  const lower = name.toLowerCase();
  return genres.find((g) => g.name.toLowerCase() === lower)?.id ?? null;
}

/** Default sort for a given scope filter: library tabs A-Z, TMDB discovery by popularity. */
export function getDefaultSort(filterParam: string | null): BrowseSortOrder {
  return filterParam === "library" ||
    filterParam === "seen" ||
    filterParam === "friends"
    ? "title"
    : "popularity";
}

/** Map a BrowseSortOrder to a TMDB `sort_by` param value. */
export function buildTmdbSortBy(
  sort: BrowseSortOrder,
  type: "movie" | "tv",
): string {
  switch (sort) {
    case "popularity":
      return "popularity.desc";
    case "title":
      // TMDB Discover supports original_title.asc for movies; TV has no name sort
      return type === "movie" ? "original_title.asc" : "popularity.desc";
    case "year_desc":
      return type === "movie" ? "release_date.desc" : "first_air_date.desc";
    case "year_asc":
      return type === "movie" ? "release_date.asc" : "first_air_date.asc";
    case "rating_desc":
      return "vote_average.desc";
    case "rating_asc":
      return "vote_average.asc";
  }
}

/** Map a BrowseSortOrder to a Prisma orderBy clause for UserMediaStatus queries. */
export function buildPrismaOrderBy(sort: BrowseSortOrder) {
  switch (sort) {
    case "popularity":
      return { updatedAt: "desc" } as const;
    case "title":
      return { mediaItem: { title: "asc" } } as const;
    case "year_desc":
      return { mediaItem: { year: { sort: "desc", nulls: "last" } } } as const;
    case "year_asc":
      return { mediaItem: { year: { sort: "asc", nulls: "last" } } } as const;
    case "rating_desc":
      return { rating: { sort: "desc", nulls: "last" } } as const;
    case "rating_asc":
      return { rating: { sort: "asc", nulls: "last" } } as const;
  }
}

/** Sort friends-path rows in JS (used after dedup since DB sort may be disrupted by distinct). */
export function sortFriendsRows<
  T extends { mediaItem: { title: string; year: number | null } },
>(rows: T[], sort: BrowseSortOrder): T[] {
  switch (sort) {
    case "title":
      return [...rows].sort((a, b) =>
        a.mediaItem.title.localeCompare(b.mediaItem.title),
      );
    case "year_desc":
      return [...rows].sort(
        (a, b) => (b.mediaItem.year ?? 0) - (a.mediaItem.year ?? 0),
      );
    case "year_asc":
      return [...rows].sort(
        (a, b) => (a.mediaItem.year ?? 0) - (b.mediaItem.year ?? 0),
      );
    default:
      // popularity and rating fall back to original updatedAt order
      return rows;
  }
}
