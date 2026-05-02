import { describe, expect, it } from "vitest";
import { extractTmdbIdFromTautulliGuids } from "@/lib/tautulli";

describe("extractTmdbIdFromTautulliGuids", () => {
  it("extracts tmdb id from a string GUID", () => {
    expect(
      extractTmdbIdFromTautulliGuids(["imdb://tt1234567", "tmdb://278"]),
    ).toBe(278);
  });

  it("extracts tmdb id from object GUIDs ({id} format)", () => {
    expect(
      extractTmdbIdFromTautulliGuids([
        { id: "imdb://tt1234567" },
        { id: "tmdb://550" },
        { id: "tvdb://81189" },
      ]),
    ).toBe(550);
  });

  it("handles mixed string and object GUIDs", () => {
    expect(
      extractTmdbIdFromTautulliGuids([
        "imdb://tt0111161",
        { id: "tmdb://278" },
      ]),
    ).toBe(278);
  });

  it("returns null when no tmdb GUID is present", () => {
    expect(
      extractTmdbIdFromTautulliGuids(["imdb://tt1234567", "tvdb://81189"]),
    ).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(extractTmdbIdFromTautulliGuids([])).toBeNull();
  });

  it("ignores partial matches (no trailing digits after tmdb://)", () => {
    expect(
      extractTmdbIdFromTautulliGuids(["tmdb://", "imdb://tt1"]),
    ).toBeNull();
  });

  it("parses the first tmdb GUID when multiple are present", () => {
    expect(extractTmdbIdFromTautulliGuids(["tmdb://100", "tmdb://200"])).toBe(
      100,
    );
  });
});
