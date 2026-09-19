import { describe, expect, it } from "vitest";
import { MediaType } from "@/generated/prisma";
import type { ListWatchHistoryRow } from "./list-watch-history";
import {
  buildListTimeline,
  groupEntriesByDay,
  stripWatchers,
  type TimelineItem,
} from "./list-watch-timeline";

type Watcher = { id: string; name: string; avatarUrl: string | null };
const alice: Watcher = { id: "u1", name: "Alice", avatarUrl: null };
const bob: Watcher = { id: "u2", name: "Bob", avatarUrl: "https://x/bob.png" };

function item(
  id: string,
  title: string,
  type: MediaType = MediaType.MOVIE,
): TimelineItem {
  return {
    listItemId: `li-${id}`,
    mediaItemId: id,
    mediaItem: { tmdbId: 1, type, title, poster: null, year: 1999 },
  };
}

function watch(
  mediaItemId: string,
  watchedAt: string,
  user = alice,
  episode?: { season: number; episode: number },
): ListWatchHistoryRow {
  return {
    id: `${mediaItemId}-${watchedAt}-${user.id}`,
    watchedAt: new Date(watchedAt),
    mediaItemId,
    mediaItem: {
      tmdbId: 1,
      type: MediaType.MOVIE,
      title: "x",
      poster: null,
      year: null,
    },
    user,
    ...(episode
      ? { seasonNumber: episode.season, episodeNumber: episode.episode }
      : {}),
  };
}

const noWindow = { startsAt: null, endsAt: null };
const now = new Date("2026-09-19T12:00:00Z");

describe("buildListTimeline", () => {
  it("anchors each title at its latest watch, once", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [
        watch("a", "2026-09-01T20:00:00Z"),
        watch("a", "2026-09-10T20:00:00Z", bob),
      ],
      window: noWindow,
      now,
    });
    expect(t.entries).toHaveLength(1);
    expect(t.entries[0].anchorAt.toISOString()).toBe(
      "2026-09-10T20:00:00.000Z",
    );
    expect(t.unwatched).toEqual([]);
  });

  it("orders entries oldest first, then by title", () => {
    const t = buildListTimeline({
      items: [item("c", "Carrie"), item("a", "Alien"), item("b", "Blade")],
      watches: [
        watch("c", "2026-09-05T10:00:00Z"),
        watch("a", "2026-09-05T10:00:00Z"),
        watch("b", "2026-09-01T10:00:00Z"),
      ],
      window: noWindow,
      now,
    });
    expect(t.entries.map((e) => e.mediaItem.title)).toEqual([
      "Blade",
      "Alien",
      "Carrie",
    ]);
  });

  it("lists watchers on an entry ascending by time", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [
        watch("a", "2026-09-10T20:00:00Z", bob),
        watch("a", "2026-09-01T20:00:00Z"),
      ],
      window: noWindow,
      now,
    });
    expect(t.entries[0].watches.map((w) => w.user.name)).toEqual([
      "Alice",
      "Bob",
    ]);
    expect(t.entries[0].watches.every((w) => w.episodeCount === 0)).toBe(true);
  });

  it("collapses episode rows to one watcher per user per UTC day", () => {
    const t = buildListTimeline({
      items: [item("s", "Severance", MediaType.TV)],
      watches: [
        watch("s", "2026-09-03T22:00:00Z", alice, { season: 1, episode: 1 }),
        watch("s", "2026-09-03T23:00:00Z", alice, { season: 1, episode: 2 }),
        watch("s", "2026-09-04T01:00:00Z", alice, { season: 1, episode: 3 }),
        watch("s", "2026-09-03T22:30:00Z", bob, { season: 1, episode: 1 }),
      ],
      window: noWindow,
      now,
    });
    const w = t.entries[0].watches;
    expect(w).toHaveLength(3);
    expect(w[0]).toMatchObject({
      user: alice,
      episodeCount: 2,
      watchedAt: new Date("2026-09-03T22:00:00Z"),
    });
    expect(w[1]).toMatchObject({ user: bob, episodeCount: 1 });
    expect(w[2]).toMatchObject({ user: alice, episodeCount: 1 });
    expect(t.entries[0].anchorAt.toISOString()).toBe(
      "2026-09-04T01:00:00.000Z",
    );
  });

  it("uses window bounds for the axis when set", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [watch("a", "2026-09-10T20:00:00Z")],
      window: {
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: new Date("2026-10-31T00:00:00Z"),
      },
      now,
    });
    expect(t.axis?.start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(t.axis?.end.toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });

  it("fills an open window side from the watches", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien"), item("b", "Blade")],
      watches: [
        watch("a", "2026-09-10T20:00:00Z"),
        watch("b", "2026-09-14T20:00:00Z"),
      ],
      window: { startsAt: new Date("2026-09-01T00:00:00Z"), endsAt: null },
      now,
    });
    expect(t.axis?.start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(t.axis?.end.toISOString()).toBe("2026-09-14T00:00:00.000Z");
  });

  it("spans the watches when there is no window", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien"), item("b", "Blade")],
      watches: [
        watch("a", "2026-09-10T20:00:00Z"),
        watch("b", "2026-08-02T20:00:00Z"),
        watch("b", "2026-09-14T20:00:00Z"),
      ],
      window: noWindow,
      now,
    });
    expect(t.axis?.start.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    expect(t.axis?.end.toISOString()).toBe("2026-09-14T00:00:00.000Z");
  });

  it("has no axis with no window and no watches", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [],
      window: noWindow,
      now,
    });
    expect(t.axis).toBeNull();
    expect(t.months).toEqual([]);
    expect(t.today).toBeNull();
    expect(t.unwatched).toHaveLength(1);
  });

  it("collapses a single-watch axis to one day", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [watch("a", "2026-09-10T20:00:00Z")],
      window: noWindow,
      now,
    });
    expect(t.axis?.start.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(t.axis?.end.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(t.months).toEqual([]);
  });

  it("emits month markers only across month boundaries", () => {
    const sameMonth = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [watch("a", "2026-09-10T20:00:00Z")],
      window: {
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: new Date("2026-09-30T00:00:00Z"),
      },
      now,
    });
    expect(sameMonth.months).toEqual([]);

    const acrossYear = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [watch("a", "2026-12-10T20:00:00Z")],
      window: {
        startsAt: new Date("2026-09-15T00:00:00Z"),
        endsAt: new Date("2027-01-10T00:00:00Z"),
      },
      now,
    });
    expect(acrossYear.months.map((m) => m.label)).toEqual([
      "October",
      "November",
      "December",
      "January 2027",
    ]);
    expect(acrossYear.months[0].at.toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("sets today only inside the axis span (end day inclusive)", () => {
    const inside = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [],
      window: {
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: new Date("2026-09-19T00:00:00Z"),
      },
      now,
    });
    expect(inside.today).toBe(now);

    const ended = buildListTimeline({
      items: [item("a", "Alien")],
      watches: [],
      window: {
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: new Date("2026-09-18T00:00:00Z"),
      },
      now,
    });
    expect(ended.today).toBeNull();
    expect(ended.windowNotStarted).toBe(false);
  });

  it("flags a window that has not started and keeps every item unwatched", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien"), item("b", "Blade")],
      watches: [],
      window: { startsAt: new Date("2026-10-01T00:00:00Z"), endsAt: null },
      now,
    });
    expect(t.windowNotStarted).toBe(true);
    expect(t.today).toBeNull();
    expect(t.unwatched.map((u) => u.mediaItem.title)).toEqual([
      "Alien",
      "Blade",
    ]);
  });

  it("keeps unwatched items in input order and accounts for every item", () => {
    const items = [item("c", "Carrie"), item("a", "Alien"), item("b", "Blade")];
    const t = buildListTimeline({
      items,
      watches: [watch("a", "2026-09-10T20:00:00Z")],
      window: noWindow,
      now,
    });
    expect(t.unwatched.map((u) => u.mediaItem.title)).toEqual([
      "Carrie",
      "Blade",
    ]);
    expect(t.entries.length + t.unwatched.length).toBe(items.length);
  });
});

describe("stripWatchers", () => {
  it("removes every identity and reports raw watch counts", () => {
    const full = buildListTimeline({
      items: [item("a", "Alien"), item("s", "Severance", MediaType.TV)],
      watches: [
        watch("a", "2026-09-01T20:00:00Z"),
        watch("a", "2026-09-10T20:00:00Z", bob),
        watch("s", "2026-09-03T22:00:00Z", alice, { season: 1, episode: 1 }),
        watch("s", "2026-09-03T23:00:00Z", alice, { season: 1, episode: 2 }),
      ],
      window: noWindow,
      now,
    });
    const anon = stripWatchers(full);
    expect(anon.entries.map((e) => e.watchCount)).toEqual([2, 2]);
    expect(anon.entries.map((e) => e.anchorAt)).toEqual(
      full.entries.map((e) => e.anchorAt),
    );
    const json = JSON.stringify(anon);
    expect(json).not.toContain('"user"');
    expect(json).not.toContain('"name"');
    expect(json).not.toContain('"avatarUrl"');
    expect(json).not.toContain("Alice");
    expect(json).not.toContain("Bob");
    expect(json).not.toContain('"watches"');
  });
});

describe("groupEntriesByDay", () => {
  it("yields one group per UTC day in entry order", () => {
    const t = buildListTimeline({
      items: [item("a", "Alien"), item("b", "Blade"), item("c", "Carrie")],
      watches: [
        watch("a", "2026-09-05T01:00:00Z"),
        watch("b", "2026-09-05T23:30:00Z"),
        watch("c", "2026-09-06T00:10:00Z"),
      ],
      window: noWindow,
      now,
    });
    const groups = groupEntriesByDay(t.entries);
    expect(groups.map((g) => g.dayKey)).toEqual(["2026-09-05", "2026-09-06"]);
    expect(groups[0].entries.map((e) => e.mediaItem.title)).toEqual([
      "Alien",
      "Blade",
    ]);
    expect(groups[0].date.toISOString()).toBe("2026-09-05T00:00:00.000Z");
  });
});
