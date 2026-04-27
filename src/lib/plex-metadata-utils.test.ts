import { describe, it, expect } from "vitest";
import {
  extractTmdbIdFromGuid,
  plexWebAppMovieUrl,
  watchedAtFromPlexLastViewed,
} from "./plex-metadata-utils";

describe("extractTmdbIdFromGuid", () => {
  it("finds tmdb:// from Guid array", () => {
    expect(
      extractTmdbIdFromGuid([{ id: "imdb://tt123" }, { id: "tmdb://27205" }]),
    ).toBe(27205);
  });

  it("returns null when no tmdb guid", () => {
    expect(extractTmdbIdFromGuid([{ id: "imdb://tt123" }])).toBeNull();
    expect(extractTmdbIdFromGuid(undefined)).toBeNull();
    expect(extractTmdbIdFromGuid([])).toBeNull();
  });

  it("returns null for malformed tmdb id", () => {
    expect(extractTmdbIdFromGuid([{ id: "tmdb://notanumber" }])).toBeNull();
  });
});

describe("watchedAtFromPlexLastViewed", () => {
  it("maps Unix seconds to UTC Date", () => {
    const d = watchedAtFromPlexLastViewed(1577836800);
    expect(d.toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });

  it("accepts numeric string seconds from PMS JSON", () => {
    const d = watchedAtFromPlexLastViewed("1577836800");
    expect(d.toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });

  it("uses fallback when missing, non-finite, or non-positive", () => {
    const fallback = new Date("2026-06-15T12:00:00.000Z");
    expect(watchedAtFromPlexLastViewed(undefined, fallback)).toBe(fallback);
    expect(watchedAtFromPlexLastViewed(null, fallback)).toBe(fallback);
    expect(watchedAtFromPlexLastViewed(NaN, fallback)).toBe(fallback);
    expect(watchedAtFromPlexLastViewed(0, fallback)).toBe(fallback);
    expect(watchedAtFromPlexLastViewed("", fallback)).toBe(fallback);
  });
});

describe("plexWebAppMovieUrl", () => {
  it("includes server id and encoded metadata key", () => {
    const machineId = "abc-machine-id";
    const ratingKey = "4815162342";
    const url = plexWebAppMovieUrl(machineId, ratingKey);
    expect(url).toContain(machineId);
    expect(url).toContain(encodeURIComponent(`/library/metadata/${ratingKey}`));
  });
});
