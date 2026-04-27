import { describe, it, expect } from "vitest";
import {
  extractTmdbIdFromGuid,
  plexWebAppMovieUrl,
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

describe("plexWebAppMovieUrl", () => {
  it("includes server id and encoded metadata key", () => {
    const machineId = "abc-machine-id";
    const ratingKey = "4815162342";
    const url = plexWebAppMovieUrl(machineId, ratingKey);
    expect(url).toContain(machineId);
    expect(url).toContain(encodeURIComponent(`/library/metadata/${ratingKey}`));
  });
});
