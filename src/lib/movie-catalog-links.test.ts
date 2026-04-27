import { describe, it, expect } from "vitest";
import {
  buildMovieCatalogLinks,
  buildTvCatalogLinks,
  imdbTitleUrl,
} from "./movie-catalog-links";

describe("imdbTitleUrl", () => {
  it("returns IMDb title URL for tt ids", () => {
    expect(imdbTitleUrl("tt0111161")).toBe(
      "https://www.imdb.com/title/tt0111161/",
    );
  });

  it("trims whitespace", () => {
    expect(imdbTitleUrl("  tt123  ")).toBe("https://www.imdb.com/title/tt123/");
  });

  it("rejects non-tt ids", () => {
    expect(imdbTitleUrl("nm0000123")).toBeNull();
    expect(imdbTitleUrl("27205")).toBeNull();
  });

  it("handles nullish", () => {
    expect(imdbTitleUrl(null)).toBeNull();
    expect(imdbTitleUrl(undefined)).toBeNull();
    expect(imdbTitleUrl("")).toBeNull();
  });
});

describe("buildMovieCatalogLinks", () => {
  it("includes TMDB, Letterboxd, and IMDb when imdb id present", () => {
    const links = buildMovieCatalogLinks(27205, "tt1375666");
    expect(links.tmdbUrl).toBe("https://www.themoviedb.org/movie/27205");
    expect(links.letterboxdFilmUrl).toBe("https://letterboxd.com/tmdb/27205/");
    expect(links.imdbUrl).toBe("https://www.imdb.com/title/tt1375666/");
  });

  it("omits imdb when invalid", () => {
    const links = buildMovieCatalogLinks(1, null);
    expect(links.imdbUrl).toBeNull();
    expect(links.letterboxdFilmUrl).toBeDefined();
  });
});

describe("buildTvCatalogLinks", () => {
  it("uses TV TMDB path and skips Letterboxd film URL", () => {
    const links = buildTvCatalogLinks(1396, "tt0944947");
    expect(links.tmdbUrl).toBe("https://www.themoviedb.org/tv/1396");
    expect(links.letterboxdFilmUrl).toBeUndefined();
    expect(links.imdbUrl).toBe("https://www.imdb.com/title/tt0944947/");
  });
});
