import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaType, WatchStatus } from "@/generated/prisma";

const getPlexServers = vi.fn();
const getPlexWatchHistory = vi.fn();
const getPlexWatchedEpisodes = vi.fn();
const getPlexItemMetadata = vi.fn();

vi.mock("@/lib/plex", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plex")>();
  return {
    ...actual,
    getPlexServers,
    getPlexWatchHistory,
    getPlexWatchedEpisodes,
    getPlexItemMetadata,
  };
});

const getTvShow = vi.fn();
const getMovie = vi.fn();

vi.mock("@/lib/tmdb", () => ({
  getTvShow,
  getMovie,
}));

vi.mock("@/lib/watch-entry-merge", () => ({
  findMergeCandidateWatchEntry: vi.fn().mockResolvedValue(null),
  mergePlexIntoWatchEntryIfUnknown: vi.fn(),
}));

const prismaMock = {
  plexConnection: {
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
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("syncPlexUser TV episodes", () => {
  const userId = "user_test_1";
  const syncTime = new Date("2026-04-26T18:00:00.000Z");
  /** 2020-01-01T00:00:00.000Z — not sync time */
  const plexLastViewedUnix = 1577836800;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(syncTime);
    vi.clearAllMocks();

    getTvShow.mockResolvedValue({
      name: "Mock Show",
      poster_path: null,
      backdrop_path: null,
      first_air_date: "2020-01-01",
      overview: "",
      genres: [],
      episode_run_time: [],
    });

    prismaMock.plexConnection.findUnique.mockResolvedValue({
      userId,
      plexToken: "token",
      plexServerId: "machine-a",
    });
    getPlexServers.mockResolvedValue([
      {
        machineIdentifier: "machine-a",
        uri: "https://plex.example:32400",
        accessToken: "srv-token",
        name: "Home",
        scheme: "https",
        address: "plex.example",
        port: "32400",
      },
    ]);
    getPlexWatchHistory.mockResolvedValue([]);
    prismaMock.userMediaStatus.upsert.mockResolvedValue({ id: "ums-movie" });
    prismaMock.watchEntry.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("imports episode rows with Plex lastViewedAt, not the sync wall clock", async () => {
    getPlexWatchedEpisodes.mockResolvedValue([
      {
        ratingKey: "ep-1",
        grandparentRatingKey: "show-1",
        grandparentTitle: "Example Show",
        parentIndex: 2,
        index: 5,
        lastViewedAt: plexLastViewedUnix,
        viewCount: 1,
      },
    ]);
    getPlexItemMetadata.mockResolvedValue({
      ratingKey: "show-1",
      title: "Example Show",
      type: "show",
      viewCount: 1,
      lastViewedAt: null,
      guid: "",
      Guid: [{ id: "tmdb://100" }],
    });
    prismaMock.mediaItem.findUnique.mockResolvedValue(null);
    prismaMock.mediaItem.create.mockResolvedValue({
      id: "media-tv-1",
      tmdbId: 100,
      type: MediaType.TV,
    });
    prismaMock.userMediaStatus.findUnique.mockResolvedValue(null);
    prismaMock.userMediaStatus.create.mockResolvedValue({});

    const { syncPlexUser } = await import("./plex-sync");
    const result = await syncPlexUser(userId);

    expect(result.tvShows).toBe(1);
    expect(result.episodes).toBe(1);
    expect(getTvShow).toHaveBeenCalledWith(100);
    expect(prismaMock.episodeStatus.upsert).toHaveBeenCalledTimes(1);
    const payload = prismaMock.episodeStatus.upsert.mock.calls[0][0] as {
      create: { watchedAt: Date };
      update: { watchedAt: Date };
    };
    expect(payload.create.watchedAt.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z",
    );
    expect(payload.update.watchedAt.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z",
    );
    expect(payload.create.watchedAt.getTime()).not.toBe(syncTime.getTime());
  });

  it("uses string lastViewedAt from PMS JSON as historical watch time", async () => {
    getPlexWatchedEpisodes.mockResolvedValue([
      {
        ratingKey: "ep-2",
        grandparentRatingKey: "show-2",
        grandparentTitle: "Other",
        parentIndex: 1,
        index: 1,
        lastViewedAt: String(plexLastViewedUnix),
        viewCount: 1,
      },
    ]);
    getPlexItemMetadata.mockResolvedValue({
      ratingKey: "show-2",
      title: "Other",
      type: "show",
      viewCount: 1,
      lastViewedAt: null,
      guid: "",
      Guid: [{ id: "tmdb://200" }],
    });
    prismaMock.mediaItem.findUnique.mockResolvedValue(null);
    prismaMock.mediaItem.create.mockResolvedValue({
      id: "media-tv-2",
      tmdbId: 200,
      type: MediaType.TV,
    });
    prismaMock.userMediaStatus.findUnique.mockResolvedValue(null);
    prismaMock.userMediaStatus.create.mockResolvedValue({});

    const { syncPlexUser } = await import("./plex-sync");
    await syncPlexUser(userId);

    const payload = prismaMock.episodeStatus.upsert.mock.calls[0][0] as {
      create: { watchedAt: Date };
    };
    expect(payload.create.watchedAt.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z",
    );
  });

  it("falls back to sync time when lastViewedAt is missing", async () => {
    getPlexWatchedEpisodes.mockResolvedValue([
      {
        ratingKey: "ep-3",
        grandparentRatingKey: "show-3",
        grandparentTitle: "No date",
        parentIndex: 1,
        index: 2,
        lastViewedAt: null,
        viewCount: 1,
      },
    ]);
    getPlexItemMetadata.mockResolvedValue({
      ratingKey: "show-3",
      title: "No date",
      type: "show",
      viewCount: 1,
      lastViewedAt: null,
      guid: "",
      Guid: [{ id: "tmdb://300" }],
    });
    prismaMock.mediaItem.findUnique.mockResolvedValue(null);
    prismaMock.mediaItem.create.mockResolvedValue({
      id: "media-tv-3",
      tmdbId: 300,
      type: MediaType.TV,
    });
    prismaMock.userMediaStatus.findUnique.mockResolvedValue(null);
    prismaMock.userMediaStatus.create.mockResolvedValue({});

    const { syncPlexUser } = await import("./plex-sync");
    await syncPlexUser(userId);

    const payload = prismaMock.episodeStatus.upsert.mock.calls[0][0] as {
      create: { watchedAt: Date };
    };
    expect(payload.create.watchedAt.toISOString()).toBe(syncTime.toISOString());
  });

  it("creates Watching status for the TV title when episodes import", async () => {
    getPlexWatchedEpisodes.mockResolvedValue([
      {
        ratingKey: "ep-4",
        grandparentRatingKey: "show-4",
        grandparentTitle: "Status test",
        parentIndex: 1,
        index: 1,
        lastViewedAt: plexLastViewedUnix,
        viewCount: 1,
      },
    ]);
    getPlexItemMetadata.mockResolvedValue({
      ratingKey: "show-4",
      title: "Status test",
      type: "show",
      viewCount: 1,
      lastViewedAt: null,
      guid: "",
      Guid: [{ id: "tmdb://400" }],
    });
    prismaMock.mediaItem.findUnique.mockResolvedValue(null);
    prismaMock.mediaItem.create.mockResolvedValue({
      id: "media-tv-4",
      tmdbId: 400,
      type: MediaType.TV,
    });
    prismaMock.userMediaStatus.findUnique.mockResolvedValue(null);
    prismaMock.userMediaStatus.create.mockResolvedValue({});

    const { syncPlexUser } = await import("./plex-sync");
    await syncPlexUser(userId);

    expect(prismaMock.userMediaStatus.create).toHaveBeenCalledWith({
      data: {
        userId,
        mediaItemId: "media-tv-4",
        status: WatchStatus.WATCHING,
      },
    });
  });
});
