import { describe, it, expect } from "vitest";
import { passesGenreFilters, shouldExcludeByGenres, passesIncludeGenres, matchesGenreToken } from "./genre-filters";

describe("matchesGenreToken", () => {
  it("matches TMDB Animation with user token animation", () => {
    expect(matchesGenreToken("Animation", "animation")).toBe(true);
  });

  it("matches partial token", () => {
    expect(matchesGenreToken("Horror", "horr")).toBe(true);
  });
});

describe("shouldExcludeByGenres", () => {
  it("is false when no exclude list", () => {
    expect(shouldExcludeByGenres(["Drama", "Horror"], undefined)).toBe(false);
  });

  it("excludes when any genre matches a token", () => {
    expect(shouldExcludeByGenres(["Drama", "Animation"], ["animation"])).toBe(true);
  });

  it("keeps when no overlap", () => {
    expect(shouldExcludeByGenres(["Drama", "Comedy"], ["Horror"])).toBe(false);
  });
});

describe("passesIncludeGenres", () => {
  it("is true when include list is empty", () => {
    expect(passesIncludeGenres([], [])).toBe(true);
  });

  it("requires at least one OR match", () => {
    expect(passesIncludeGenres(["Drama", "Comedy"], ["Action"])).toBe(false);
    expect(passesIncludeGenres(["Drama", "Comedy"], ["Drama"])).toBe(true);
  });
});

describe("passesGenreFilters", () => {
  it("applies exclude then include", () => {
    expect(passesGenreFilters(["Action", "Horror"], ["Action"], ["Horror"])).toBe(false);
  });

  it("include only", () => {
    expect(passesGenreFilters(["Comedy"], ["Drama"], undefined)).toBe(false);
    expect(passesGenreFilters(["Comedy"], ["comedy"], undefined)).toBe(true);
  });
});
