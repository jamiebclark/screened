import { describe, expect, it } from "vitest";
import { normalizePositions, orderListItems } from "./list-item-ordering";
import type { OrderableItem } from "./list-item-ordering";

function d(iso: string) {
  return new Date(iso);
}

function item(
  overrides: Partial<OrderableItem> & { id: string },
): OrderableItem {
  return {
    position: null,
    addedAt: d("2024-01-01T00:00:00Z"),
    mediaItemId: `media-${overrides.id}`,
    mediaItem: { type: "MOVIE", title: overrides.id, year: 2000 },
    votes: [],
    ...overrides,
  };
}

describe("orderListItems", () => {
  it("ranked mode preserves a mixed movie/TV, partly-watched input order with contiguous displayRank", () => {
    const items = [
      item({
        id: "a",
        position: 2,
        mediaItem: { type: "MOVIE", title: "A", year: 2000 },
      }),
      item({
        id: "b",
        position: 1,
        mediaItem: { type: "TV", title: "B", year: 2001 },
      }),
      item({
        id: "c",
        position: 3,
        mediaItem: { type: "MOVIE", title: "C", year: 2002 },
      }),
    ];
    const result = orderListItems(items, {
      rankingEnabled: true,
      sort: "date_added",
      watchedMediaItemIds: new Set(["media-c"]),
    });

    expect(result.mode).toBe("ranked");
    if (result.mode !== "ranked") throw new Error("expected ranked");
    expect(result.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(result.items.map((i) => i.displayRank)).toEqual([1, 2, 3]);
  });

  it("sorts a null position to the end in ranked mode", () => {
    const items = [
      item({ id: "a", position: null, addedAt: d("2024-01-01T00:00:00Z") }),
      item({ id: "b", position: 1, addedAt: d("2024-01-02T00:00:00Z") }),
      item({ id: "c", position: 2, addedAt: d("2024-01-03T00:00:00Z") }),
    ];
    const result = orderListItems(items, {
      rankingEnabled: true,
      sort: "date_added",
      watchedMediaItemIds: new Set(),
    });

    expect(result.mode).toBe("ranked");
    if (result.mode !== "ranked") throw new Error("expected ranked");
    expect(result.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(result.items.map((i) => i.displayRank)).toEqual([1, 2, 3]);
  });

  it("unranked mode reproduces the current four-section partition unchanged", () => {
    const items = [
      item({
        id: "movie1",
        addedAt: d("2024-01-01T00:00:00Z"),
        mediaItem: { type: "MOVIE", title: "Movie 1", year: 2000 },
      }),
      item({
        id: "tv1",
        addedAt: d("2024-01-02T00:00:00Z"),
        mediaItem: { type: "TV", title: "TV 1", year: 2001 },
      }),
      item({
        id: "watchedMovie1",
        addedAt: d("2024-01-03T00:00:00Z"),
        mediaItemId: "media-watchedMovie1",
        mediaItem: { type: "MOVIE", title: "Watched Movie 1", year: 2002 },
      }),
      item({
        id: "watchedTv1",
        addedAt: d("2024-01-04T00:00:00Z"),
        mediaItemId: "media-watchedTv1",
        mediaItem: { type: "TV", title: "Watched TV 1", year: 2003 },
      }),
    ];
    const result = orderListItems(items, {
      rankingEnabled: false,
      sort: "date_added",
      watchedMediaItemIds: new Set(["media-watchedMovie1", "media-watchedTv1"]),
    });

    expect(result.mode).toBe("grouped");
    if (result.mode !== "grouped") throw new Error("expected grouped");
    expect(result.movies.map((i) => i.id)).toEqual(["movie1"]);
    expect(result.tvShows.map((i) => i.id)).toEqual(["tv1"]);
    expect(result.watchedMovies.map((i) => i.id)).toEqual(["watchedMovie1"]);
    expect(result.watchedTv.map((i) => i.id)).toEqual(["watchedTv1"]);
  });
});

describe("normalizePositions", () => {
  it("renumbers [3,2,1] to 1,2,3 in submitted order", () => {
    const result = normalizePositions([
      { id: "c", position: 3 },
      { id: "b", position: 2 },
      { id: "a", position: 1 },
    ]);
    expect(result).toEqual([
      { id: "a", position: 1 },
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ]);
  });

  it("is stable for duplicate position values, breaking ties by id", () => {
    const result = normalizePositions([
      { id: "b", position: 1 },
      { id: "a", position: 1 },
    ]);
    expect(result).toEqual([
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("is a no-op on an already-contiguous ordering", () => {
    const result = normalizePositions([
      { id: "a", position: 1 },
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ]);
    expect(result).toEqual([
      { id: "a", position: 1 },
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ]);
  });
});
