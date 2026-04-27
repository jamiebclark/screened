import { describe, expect, it } from "vitest";
import { normalizePlexEpisodeSeasonAndIndex } from "./plex-episode-utils";

describe("normalizePlexEpisodeSeasonAndIndex", () => {
  it("accepts numeric parentIndex and index", () => {
    expect(
      normalizePlexEpisodeSeasonAndIndex({ parentIndex: 2, index: 5 }),
    ).toEqual({ seasonNumber: 2, episodeNumber: 5 });
  });

  it("coerces string season and episode", () => {
    expect(
      normalizePlexEpisodeSeasonAndIndex({
        parentIndex: "10",
        index: "3",
      }),
    ).toEqual({ seasonNumber: 10, episodeNumber: 3 });
  });

  it("reads PascalCase keys", () => {
    expect(
      normalizePlexEpisodeSeasonAndIndex({ ParentIndex: 1, Index: 2 }),
    ).toEqual({ seasonNumber: 1, episodeNumber: 2 });
  });

  it("returns null when either value is missing", () => {
    expect(normalizePlexEpisodeSeasonAndIndex({ parentIndex: 1 })).toBeNull();
    expect(normalizePlexEpisodeSeasonAndIndex({ index: 1 })).toBeNull();
  });
});
