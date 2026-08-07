import { describe, it, expect } from "vitest";
import { mediaItemsToRadarrJson } from "./radarr-export";

describe("mediaItemsToRadarrJson", () => {
  it("exposes the tmdb id as `id`, the field Radarr's Custom Lists parser reads", () => {
    const result = mediaItemsToRadarrJson([
      { tmdbId: 9820, title: "The Parent Trap", year: 1998 },
    ]);

    expect(result).toEqual([
      { id: 9820, title: "The Parent Trap", year: 1998, adult: false },
    ]);
  });

  it("preserves input order", () => {
    const result = mediaItemsToRadarrJson([
      { tmdbId: 14035, title: "Meatballs", year: 1979 },
      { tmdbId: 13567, title: "Sleepaway Camp", year: 1983 },
    ]);

    expect(result.map((entry) => entry.id)).toEqual([14035, 13567]);
  });

  it("allows a null year", () => {
    const result = mediaItemsToRadarrJson([
      { tmdbId: 1, title: "Untitled", year: null },
    ]);

    expect(result[0].year).toBeNull();
  });

  it("drops items without a usable tmdb id, which Radarr would discard anyway", () => {
    const result = mediaItemsToRadarrJson([
      { tmdbId: 0, title: "Missing metadata", year: null },
      { tmdbId: 550, title: "Fight Club", year: 1999 },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(550);
  });

  it("returns an empty array for an empty list", () => {
    expect(mediaItemsToRadarrJson([])).toEqual([]);
  });
});
