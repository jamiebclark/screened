import { getUpcomingReleasesPage } from "@/lib/tmdb";
import { getListMembershipsForTmdbIds } from "@/lib/upcoming-queries";

export type ReleaseItem = {
  tmdbId: number;
  title: string;
  poster: string | null;
  releaseDate: string; // YYYY-MM-DD
  onList: boolean;
};

/**
 * Fetches 3 consecutive TMDB pages starting at `startPage` from `fromDate`.
 * If `toDate` is given (past-month queries), fetches 2 pages and applies an
 * upper-bound filter on release_date so results stay within the target month.
 */
export async function getReleasesFromDate(
  fromDate: string,
  startPage: number,
  userId?: string,
  toDate?: string,
): Promise<{ items: ReleaseItem[]; hasMore: boolean }> {
  const pageCount = toDate ? 2 : 3;

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      getUpcomingReleasesPage(fromDate, startPage + i, toDate),
    ),
  );

  const totalPages = pages[0].total_pages;
  const hasMore = startPage + pageCount - 1 < totalPages;

  const allResults = pages.flatMap((p) => p.results);
  const tmdbIds = allResults.map((r) => r.id);
  const onListIds = userId
    ? await getListMembershipsForTmdbIds(userId, tmdbIds)
    : new Set<number>();

  const seen = new Set<number>();
  const items = allResults
    .filter((r) => {
      if (!r.release_date || !r.title || seen.has(r.id)) return false;
      if (r.release_date < fromDate) return false;
      if (toDate && r.release_date > toDate) return false;
      seen.add(r.id);
      return true;
    })
    .map((r) => ({
      tmdbId: r.id,
      title: r.title!,
      poster: r.poster_path,
      releaseDate: r.release_date!,
      onList: onListIds.has(r.id),
    }))
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  return { items, hasMore };
}
