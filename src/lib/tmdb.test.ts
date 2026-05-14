import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? "OK" : "Internal Server Error",
      headers: { get: () => null },
      json: () => Promise.resolve(body),
    }),
  );
}

function make429(retryAfter?: string) {
  return {
    ok: false,
    status: 429,
    statusText: "Too Many Requests",
    headers: {
      get: (h: string) => (h === "Retry-After" ? (retryAfter ?? null) : null),
    },
    json: () => Promise.resolve({}),
  };
}

function make200(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  };
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

describe("getPersonDirectedCredits", () => {
  it("returns deduped directing credits sorted by release date", async () => {
    mockFetch({
      crew: [
        {
          id: 100,
          job: "Director",
          media_type: "movie",
          title: "Old Film",
          poster_path: "/a.jpg",
          release_date: "1990-01-01",
        },
        {
          id: 200,
          job: "Director",
          media_type: "movie",
          title: "New Film",
          poster_path: "/b.jpg",
          release_date: "2020-06-15",
        },
        {
          id: 200,
          job: "Producer",
          media_type: "movie",
          title: "New Film",
          poster_path: "/b.jpg",
          release_date: "2020-06-15",
        },
        {
          id: 300,
          job: "Creator",
          media_type: "tv",
          name: "A Show",
          poster_path: null,
          first_air_date: "2015-03-01",
        },
      ],
    });
    const { getPersonDirectedCredits } = await import("./tmdb");
    const credits = await getPersonDirectedCredits(1);
    expect(credits).toHaveLength(3);
    expect(credits[0].title).toBe("New Film");
    expect(credits[1].title).toBe("A Show");
    expect(credits[2].title).toBe("Old Film");
  });

  it("normalizes missing crew to []", async () => {
    mockFetch({});
    const { getPersonDirectedCredits } = await import("./tmdb");
    const credits = await getPersonDirectedCredits(1);
    expect(credits).toEqual([]);
  });
});

describe("getMovieWithDetails", () => {
  it("returns movie, processed credits, and keywords from a single fetch", async () => {
    mockFetch({
      id: 1,
      title: "Avengers",
      genres: [{ id: 28, name: "Action" }],
      imdb_id: null,
      external_ids: { imdb_id: "tt0848228" },
      credits: {
        cast: [
          { id: 10, name: "Robert Downey Jr.", order: 0 },
          { id: 20, name: "Chris Evans", order: 1 },
        ],
        crew: [{ id: 30, name: "Joss Whedon", job: "Director" }],
      },
      keywords: {
        keywords: [
          { id: 1, name: "superhero" },
          { id: 2, name: "marvel" },
        ],
      },
    });
    const { getMovieWithDetails } = await import("./tmdb");
    const result = await getMovieWithDetails(1);

    expect(result.movie.title).toBe("Avengers");
    expect(result.movie.imdb_id).toBe("tt0848228");
    expect(result.credits.cast).toEqual(["Robert Downey Jr.", "Chris Evans"]);
    expect(result.credits.director).toBe("Joss Whedon");
    expect(result.keywords).toEqual(["superhero", "marvel"]);
  });

  it("makes a single fetch call (not three)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      make200({
        id: 1,
        genres: [],
        credits: { cast: [], crew: [] },
        keywords: { keywords: [] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getMovieWithDetails } = await import("./tmdb");
    await getMovieWithDetails(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "append_to_response=credits%2Ckeywords%2Cexternal_ids",
    );
  });

  it("normalizes missing credits and keywords to empty arrays", async () => {
    mockFetch({ id: 1, genres: [] });
    const { getMovieWithDetails } = await import("./tmdb");
    const result = await getMovieWithDetails(1);
    expect(result.credits.cast).toEqual([]);
    expect(result.credits.director).toBeNull();
    expect(result.keywords).toEqual([]);
  });
});

describe("tmdbFetch 429 retry", () => {
  it("retries on 429 and returns the successful response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(make429())
      .mockResolvedValueOnce(make200({ id: 1, genres: [], imdb_id: null }));
    vi.stubGlobal("fetch", fetchMock);

    const { getMovie } = await import("./tmdb");
    const promise = getMovie(1);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.id).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("respects a Retry-After header", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(make429("5"))
      .mockResolvedValueOnce(make200({ id: 1, genres: [], imdb_id: null }));
    vi.stubGlobal("fetch", fetchMock);

    const { getMovie } = await import("./tmdb");
    const promise = getMovie(1);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("throws after 3 consecutive 429s", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(make429());
    vi.stubGlobal("fetch", fetchMock);

    const { getMovie } = await import("./tmdb");
    const promise = getMovie(1);
    const assertion = expect(promise).rejects.toThrow("TMDB error: 429");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
