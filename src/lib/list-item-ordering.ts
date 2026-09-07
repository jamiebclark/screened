import type { HiddenFilter } from "./list-view-params";

/** Minimal shape the ordering functions need — structurally satisfied by the Prisma row. */
export type OrderableItem = {
  id: string;
  position: number | null;
  addedAt: Date;
  mediaItemId: string;
  mediaItem: { type: "MOVIE" | "TV"; title: string; year: number | null };
  votes: { value: number }[];
  isHidden: boolean;
};

/** A ranked list renders as one flat sequence with derived, contiguous ranks. */
export type RankedOrdering<T> = {
  mode: "ranked";
  items: (T & { displayRank: number })[];
};

/** An unranked list keeps today's four sections. */
export type GroupedOrdering<T> = {
  mode: "grouped";
  movies: T[];
  tvShows: T[];
  watchedMovies: T[];
  watchedTv: T[];
};

export type ListOrdering<T> = RankedOrdering<T> | GroupedOrdering<T>;

type SortField = "date_added" | "title" | "votes" | "release";

function sortByField<T extends OrderableItem>(
  items: T[],
  sort: SortField,
): T[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "title":
        return a.mediaItem.title.localeCompare(b.mediaItem.title);
      case "votes": {
        const scoreA = a.votes.reduce((s, v) => s + v.value, 0);
        const scoreB = b.votes.reduce((s, v) => s + v.value, 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.addedAt.getTime() - a.addedAt.getTime();
      }
      case "release": {
        const diff = (b.mediaItem.year ?? 0) - (a.mediaItem.year ?? 0);
        if (diff !== 0) return diff;
        return a.mediaItem.title.localeCompare(b.mediaItem.title);
      }
      default:
        return b.addedAt.getTime() - a.addedAt.getTime();
    }
  });
}

export function orderListItems<T extends OrderableItem>(
  items: T[],
  opts: {
    rankingEnabled: boolean;
    sort: SortField;
    watchedMediaItemIds: ReadonlySet<string>;
  },
): ListOrdering<T> {
  if (opts.rankingEnabled) {
    const ranked = [...items].sort((a, b) => {
      const posA = a.position ?? Infinity;
      const posB = b.position ?? Infinity;
      if (posA !== posB) return posA - posB;
      return a.addedAt.getTime() - b.addedAt.getTime();
    });
    return {
      mode: "ranked",
      items: ranked.map((item, index) => ({
        ...item,
        displayRank: index + 1,
      })),
    };
  }

  const sorted = sortByField(items, opts.sort);
  const unwatched = sorted.filter(
    (i) => !opts.watchedMediaItemIds.has(i.mediaItemId),
  );
  const watched = sorted.filter((i) =>
    opts.watchedMediaItemIds.has(i.mediaItemId),
  );

  return {
    mode: "grouped",
    movies: unwatched.filter((i) => i.mediaItem.type === "MOVIE"),
    tvShows: unwatched.filter((i) => i.mediaItem.type === "TV"),
    watchedMovies: watched.filter((i) => i.mediaItem.type === "MOVIE"),
    watchedTv: watched.filter((i) => i.mediaItem.type === "TV"),
  };
}

/**
 * Removes hidden items from an already-computed ordering without renumbering anything.
 * `"include"` is a no-op; `"exclude"` filters ranked items while preserving `displayRank`
 * verbatim, and filters each grouped section independently.
 */
export function filterHiddenFromOrdering<T extends { isHidden: boolean }>(
  ordering: ListOrdering<T>,
  hiddenFilter: HiddenFilter,
): ListOrdering<T> {
  if (hiddenFilter === "include") return ordering;

  if (ordering.mode === "ranked") {
    return {
      mode: "ranked",
      items: ordering.items.filter((item) => !item.isHidden),
    };
  }

  return {
    mode: "grouped",
    movies: ordering.movies.filter((item) => !item.isHidden),
    tvShows: ordering.tvShows.filter((item) => !item.isHidden),
    watchedMovies: ordering.watchedMovies.filter((item) => !item.isHidden),
    watchedTv: ordering.watchedTv.filter((item) => !item.isHidden),
  };
}

/** Maps a submitted ordering onto contiguous 1..n positions. Pure; used by the reorder route. */
export function normalizePositions(
  entries: { id: string; position: number }[],
): { id: string; position: number }[] {
  return [...entries]
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.id.localeCompare(b.id);
    })
    .map((entry, index) => ({ id: entry.id, position: index + 1 }));
}
