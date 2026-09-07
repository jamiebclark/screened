import { describe, expect, it } from "vitest";
import {
  mergeListWatchRows,
  type ListWatchHistoryRow,
} from "./list-watch-history";
import { MediaType } from "@/generated/prisma";

function row(
  overrides: Partial<ListWatchHistoryRow> & { watchedAt: Date },
): ListWatchHistoryRow {
  return {
    id: overrides.id ?? "id",
    watchedAt: overrides.watchedAt,
    mediaItemId: overrides.mediaItemId ?? "media-1",
    mediaItem: overrides.mediaItem ?? {
      tmdbId: 1,
      type: MediaType.MOVIE,
      title: "Title",
      poster: null,
      year: 1985,
    },
    user: overrides.user ?? { id: "u1", name: "Alice", avatarUrl: null },
    ...(overrides.seasonNumber != null
      ? { seasonNumber: overrides.seasonNumber }
      : {}),
    ...(overrides.episodeNumber != null
      ? { episodeNumber: overrides.episodeNumber }
      : {}),
  };
}

describe("mergeListWatchRows", () => {
  it("merges two arrays into newest-first order", () => {
    const a = [row({ id: "a1", watchedAt: new Date("2026-09-05") })];
    const b = [row({ id: "b1", watchedAt: new Date("2026-09-10") })];
    const merged = mergeListWatchRows(a, b);
    expect(merged.map((r) => r.id)).toEqual(["b1", "a1"]);
  });

  it("preserves the es: id prefix on episode-sourced rows", () => {
    const a = [row({ id: "a1", watchedAt: new Date("2026-09-05") })];
    const b = [
      row({
        id: "es:e1",
        watchedAt: new Date("2026-09-01"),
        seasonNumber: 1,
        episodeNumber: 4,
      }),
    ];
    const merged = mergeListWatchRows(a, b);
    expect(merged.map((r) => r.id)).toEqual(["a1", "es:e1"]);
    expect(merged[1].seasonNumber).toBe(1);
    expect(merged[1].episodeNumber).toBe(4);
  });

  it("interleaves film and episode rows purely by watchedAt", () => {
    const a = [
      row({ id: "film-old", watchedAt: new Date("2026-09-01") }),
      row({ id: "film-new", watchedAt: new Date("2026-09-09") }),
    ];
    const b = [
      row({
        id: "es:ep-mid",
        watchedAt: new Date("2026-09-05"),
        seasonNumber: 2,
        episodeNumber: 1,
      }),
    ];
    const merged = mergeListWatchRows(a, b);
    expect(merged.map((r) => r.id)).toEqual([
      "film-new",
      "es:ep-mid",
      "film-old",
    ]);
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(mergeListWatchRows([], [])).toEqual([]);
  });
});
