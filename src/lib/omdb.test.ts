import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  omdbRatingCache: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("getCachedOmdbRatings", () => {
  const originalKey = process.env.OMDB_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.OMDB_API_KEY = originalKey;
  });

  it("returns null when API key is unset", async () => {
    delete process.env.OMDB_API_KEY;
    const { getCachedOmdbRatings } = await import("./omdb");
    await expect(getCachedOmdbRatings("tt1375666")).resolves.toBeNull();
    expect(prismaMock.omdbRatingCache.findUnique).not.toHaveBeenCalled();
  });

  it("returns null for invalid IMDb id", async () => {
    process.env.OMDB_API_KEY = "test-key";
    const { getCachedOmdbRatings } = await import("./omdb");
    await expect(getCachedOmdbRatings("")).resolves.toBeNull();
    await expect(getCachedOmdbRatings("nm0000123")).resolves.toBeNull();
  });
});

describe("buildOmdbSourceHref", () => {
  it("builds IMDb, RT search, and Metacritic paths", async () => {
    const { buildOmdbSourceHref } = await import("./omdb");
    const base = {
      imdbId: "tt1375666",
      linkTitle: "Inception",
      mediaType: "movie" as const,
      rottenTomatoesUrl: null,
    };
    expect(buildOmdbSourceHref("Internet Movie Database", base)).toBe(
      "https://www.imdb.com/title/tt1375666/",
    );
    expect(buildOmdbSourceHref("Rotten Tomatoes", base)).toBe(
      "https://www.rottentomatoes.com/search?search=Inception",
    );
    expect(buildOmdbSourceHref("Metacritic", base)).toBe(
      "https://www.metacritic.com/movie/inception/",
    );
    expect(
      buildOmdbSourceHref("Rotten Tomatoes", {
        ...base,
        rottenTomatoesUrl: "https://www.rottentomatoes.com/m/inception",
      }),
    ).toBe("https://www.rottentomatoes.com/m/inception");
  });
});
