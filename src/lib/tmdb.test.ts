import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? "OK" : "Internal Server Error",
      json: () => Promise.resolve(body),
    }),
  );
}

beforeEach(() => {
  process.env.TMDB_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getMovie", () => {
  it("passes through genres when present", async () => {
    mockFetch({ id: 1, genres: [{ id: 28, name: "Action" }], imdb_id: "tt1" });
    const { getMovie } = await import("./tmdb");
    const movie = await getMovie(1);
    expect(movie.genres).toEqual([{ id: 28, name: "Action" }]);
  });

  it("normalizes missing genres to []", async () => {
    mockFetch({ id: 1, imdb_id: "tt1" });
    const { getMovie } = await import("./tmdb");
    const movie = await getMovie(1);
    expect(movie.genres).toEqual([]);
  });

  it("normalizes null genres to []", async () => {
    mockFetch({ id: 1, genres: null, imdb_id: "tt1" });
    const { getMovie } = await import("./tmdb");
    const movie = await getMovie(1);
    expect(movie.genres).toEqual([]);
  });

  it("prefers external_ids imdb_id over top-level", async () => {
    mockFetch({
      id: 1,
      genres: [],
      imdb_id: "tt-top",
      external_ids: { imdb_id: "tt-ext" },
    });
    const { getMovie } = await import("./tmdb");
    const movie = await getMovie(1);
    expect(movie.imdb_id).toBe("tt-ext");
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, false);
    const { getMovie } = await import("./tmdb");
    await expect(getMovie(1)).rejects.toThrow("TMDB error");
  });
});

describe("getTvShow", () => {
  it("passes through genres when present", async () => {
    mockFetch({
      id: 1,
      genres: [{ id: 18, name: "Drama" }],
      episode_run_time: [45],
      seasons: [{ id: 10, season_number: 1 }],
    });
    const { getTvShow } = await import("./tmdb");
    const show = await getTvShow(1);
    expect(show.genres).toEqual([{ id: 18, name: "Drama" }]);
    expect(show.episode_run_time).toEqual([45]);
    expect(show.seasons).toEqual([{ id: 10, season_number: 1 }]);
  });

  it("normalizes missing genres, episode_run_time, and seasons to []", async () => {
    mockFetch({ id: 1 });
    const { getTvShow } = await import("./tmdb");
    const show = await getTvShow(1);
    expect(show.genres).toEqual([]);
    expect(show.episode_run_time).toEqual([]);
    expect(show.seasons).toEqual([]);
  });

  it("normalizes null array fields to []", async () => {
    mockFetch({ id: 1, genres: null, episode_run_time: null, seasons: null });
    const { getTvShow } = await import("./tmdb");
    const show = await getTvShow(1);
    expect(show.genres).toEqual([]);
    expect(show.episode_run_time).toEqual([]);
    expect(show.seasons).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, false);
    const { getTvShow } = await import("./tmdb");
    await expect(getTvShow(1)).rejects.toThrow("TMDB error");
  });
});
