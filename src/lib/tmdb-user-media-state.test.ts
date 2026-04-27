import { describe, expect, it } from "vitest";
import { tmdbRefKey } from "./tmdb-user-media-state";

describe("tmdbRefKey", () => {
  it("builds a stable string key for movie and tv", () => {
    expect(tmdbRefKey("movie", 42)).toBe("movie:42");
    expect(tmdbRefKey("tv", 1)).toBe("tv:1");
  });
});
