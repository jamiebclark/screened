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
