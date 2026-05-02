import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

const getTautulliHistory = vi.fn();

vi.mock("@/lib/tautulli", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tautulli")>();
  return { ...actual, getTautulliHistory };
});

const getMovie = vi.fn();
const getTvShow = vi.fn();

vi.mock("@/lib/tmdb", () => ({ getMovie, getTvShow }));

const findMergeCandidateWatchEntry = vi.fn().mockResolvedValue(null);
const mergeTautulliIntoWatchEntry = vi.fn();

vi.mock("@/lib/watch-entry-merge", () => ({
  findMergeCandidateWatchEntry,
  mergeTautulliIntoWatchEntry,
}));

const prismaMock = {
  tautulliConnection: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  mediaItem: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  episodeStatus: {
    upsert: vi.fn().mockResolvedValue({}),
  },
  userMediaStatus: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  watchEntry: {
    create: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const CONNECTION = {
  userId: "user-1",
  tautulliUrl: "http://tautulli.local:8181",
  apiKey: "testkey",
  tautulliUsername: "alice",
};

/** Unix timestamp for 2024-03-15T20:00:00Z */
const SESSION_DATE = 1710532800;

describe("syncTautulliUser — movies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tautulliConnection.findUnique.mockResolvedValue(CONNECTION);
    prismaMock.userMediaStatus.upsert.mockResolvedValue({ id: "ums-1" });
    getTautulliHistory.mockResolvedValue([]);
  });

  it("creates a WatchEntry with TAUTULLI source and correct timestamp", async () => {
    getTautulliHistory.mockImplementation(
      (_url: string, _key: string, type: string) => {
        if (type === "movie") {
          return Promise.resolve([
            {
              id: 1,
              title: "Fight Club",
              year: 1999,
              media_type: "movie",
              guids: ["tmdb://550"],
              date: SESSION_DATE,
              play_duration: 9000,
              percent_complete: 98,
              watched_status: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );

    getMovie.mockResolvedValue({
      title: "Fight Club",
      poster_path: null,
      backdrop_path: null,
      release_date: "1999-10-15",
      overview: "",
      genres: [],
      runtime: 139,
    });
    prismaMock.mediaItem.findUnique.mockResolvedValue(null);
    prismaMock.mediaItem.create.mockResolvedValue({
      id: "media-1",
      tmdbId: 550,
      type: MediaType.MOVIE,
    });

    const { syncTautulliUser } = await import("./tautulli-sync");
    const result = await syncTautulliUser("user-1");

    expect(result.synced).toBe(1);
    expect(result.skipped).toBe(0);

    expect(prismaMock.watchEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: WatchEntrySource.TAUTULLI,
        watchedAt: new Date(SESSION_DATE * 1000),
      }),
    });
  });

  it("skips movies with no TMDB GUID", async () => {
    getTautulliHistory.mockImplementation(
      (_url: string, _key: string, type: string) => {
        if (type === "movie") {
          return Promise.resolve([
            {
              id: 2,
              title: "Unknown",
              year: 2020,
              media_type: "movie",
              guids: ["imdb://tt9999999"],
              date: SESSION_DATE,
              play_duration: 5400,
              percent_complete: 95,
              watched_status: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );

    const { syncTautulliUser } = await import("./tautulli-sync");
    const result = await syncTautulliUser("user-1");

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prismaMock.watchEntry.create).not.toHaveBeenCalled();
  });

  it("calls mergeTautulliIntoWatchEntry when a same-day entry already exists", async () => {
    const existingEntry = {
      id: "existing-1",
      source: WatchEntrySource.PLEX,
    };
    findMergeCandidateWatchEntry.mockResolvedValue(existingEntry);

    getTautulliHistory.mockImplementation(
      (_url: string, _key: string, type: string) => {
        if (type === "movie") {
          return Promise.resolve([
            {
              id: 3,
              title: "The Matrix",
              year: 1999,
              media_type: "movie",
              guids: ["tmdb://603"],
              date: SESSION_DATE,
              play_duration: 8160,
              percent_complete: 100,
              watched_status: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    prismaMock.mediaItem.findUnique.mockResolvedValue({
      id: "media-2",
      tmdbId: 603,
      type: MediaType.MOVIE,
    });

    const { syncTautulliUser } = await import("./tautulli-sync");
    await syncTautulliUser("user-1");

    expect(mergeTautulliIntoWatchEntry).toHaveBeenCalledWith(existingEntry);
    expect(prismaMock.watchEntry.create).not.toHaveBeenCalled();
  });

  it("passes username to getTautulliHistory", async () => {
    const { syncTautulliUser } = await import("./tautulli-sync");
    await syncTautulliUser("user-1");

    expect(getTautulliHistory).toHaveBeenCalledWith(
      CONNECTION.tautulliUrl,
      CONNECTION.apiKey,
      "movie",
      CONNECTION.tautulliUsername,
    );
  });
});

describe("syncTautulliUser — TV episodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tautulliConnection.findUnique.mockResolvedValue(CONNECTION);
    prismaMock.userMediaStatus.upsert.mockResolvedValue({ id: "ums-tv" });
    getTautulliHistory.mockImplementation(
      (_url: string, _key: string, type: string) => {
        if (type === "episode") {
          return Promise.resolve([
            {
              id: 10,
              title: "Pilot",
              year: 2008,
              media_type: "episode",
              guids: ["tmdb://2190825"],
              grandparent_title: "Breaking Bad",
              parent_media_index: 1,
              media_index: 1,
              grandparent_guids: ["tmdb://1396"],
              date: SESSION_DATE,
              play_duration: 2700,
              percent_complete: 97,
              watched_status: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    getTvShow.mockResolvedValue({
      name: "Breaking Bad",
      poster_path: null,
      backdrop_path: null,
      first_air_date: "2008-01-20",
      overview: "",
      genres: [],
      episode_run_time: [47],
    });
    prismaMock.mediaItem.findUnique.mockResolvedValue(null);
    prismaMock.mediaItem.create.mockResolvedValue({
      id: "media-tv-1",
      tmdbId: 1396,
      type: MediaType.TV,
    });
    prismaMock.userMediaStatus.findUnique.mockResolvedValue(null);
    prismaMock.userMediaStatus.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("upserts episode status with correct season/episode and Tautulli timestamp", async () => {
    const { syncTautulliUser } = await import("./tautulli-sync");
    const result = await syncTautulliUser("user-1");

    expect(result.tvShows).toBe(1);
    expect(result.episodes).toBe(1);

    const call = prismaMock.episodeStatus.upsert.mock.calls[0][0] as {
      create: { seasonNumber: number; episodeNumber: number; watchedAt: Date };
      update: { watchedAt: Date };
    };
    expect(call.create.seasonNumber).toBe(1);
    expect(call.create.episodeNumber).toBe(1);
    expect(call.create.watchedAt).toEqual(new Date(SESSION_DATE * 1000));
    expect(call.update.watchedAt).toEqual(new Date(SESSION_DATE * 1000));
  });

  it("creates WATCHING status for the TV title", async () => {
    const { syncTautulliUser } = await import("./tautulli-sync");
    await syncTautulliUser("user-1");

    expect(prismaMock.userMediaStatus.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        mediaItemId: "media-tv-1",
        status: WatchStatus.WATCHING,
      },
    });
  });

  it("skips episodes whose grandparent has no TMDB GUID", async () => {
    getTautulliHistory.mockImplementation(
      (_url: string, _key: string, type: string) => {
        if (type === "episode") {
          return Promise.resolve([
            {
              id: 20,
              title: "Episode 1",
              year: 2020,
              media_type: "episode",
              guids: [],
              grandparent_title: "No GUID Show",
              parent_media_index: 1,
              media_index: 1,
              grandparent_guids: ["imdb://tt9999"],
              date: SESSION_DATE,
              play_duration: 1800,
              percent_complete: 95,
              watched_status: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );

    const { syncTautulliUser } = await import("./tautulli-sync");
    const result = await syncTautulliUser("user-1");

    expect(result.tvShows).toBe(0);
    expect(result.episodesSkipped).toBe(1);
    expect(prismaMock.episodeStatus.upsert).not.toHaveBeenCalled();
  });

  it("skips episodes with missing season or episode coordinates", async () => {
    getTautulliHistory.mockImplementation(
      (_url: string, _key: string, type: string) => {
        if (type === "episode") {
          return Promise.resolve([
            {
              id: 30,
              title: "Special",
              year: 2020,
              media_type: "episode",
              guids: [],
              grandparent_title: "Some Show",
              parent_media_index: undefined,
              media_index: undefined,
              grandparent_guids: ["tmdb://1396"],
              date: SESSION_DATE,
              play_duration: 1800,
              percent_complete: 95,
              watched_status: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    prismaMock.mediaItem.findUnique.mockResolvedValue({
      id: "media-tv-1",
      tmdbId: 1396,
      type: MediaType.TV,
    });

    const { syncTautulliUser } = await import("./tautulli-sync");
    const result = await syncTautulliUser("user-1");

    expect(result.episodes).toBe(0);
    expect(result.episodesSkipped).toBe(1);
    expect(prismaMock.episodeStatus.upsert).not.toHaveBeenCalled();
  });
});
