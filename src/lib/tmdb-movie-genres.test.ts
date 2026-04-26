import { describe, it, expect } from "vitest";
import { filterTmdbMovieGenres, TMDB_MOVIE_GENRE_NAMES } from "./tmdb-movie-genres";

describe("filterTmdbMovieGenres", () => {
  it("returns first N alphabetically when query empty", () => {
    const r = filterTmdbMovieGenres("", 3);
    expect(r).toEqual(["Action", "Adventure", "Animation"]);
  });

  it("matches substring (Horror)", () => {
    expect(filterTmdbMovieGenres("horr", 5)).toContain("Horror");
  });

  it("includes Science Fiction", () => {
    expect(TMDB_MOVIE_GENRE_NAMES).toContain("Science Fiction");
  });
});
