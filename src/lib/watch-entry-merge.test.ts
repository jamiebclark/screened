import { describe, expect, it, vi } from "vitest";
import {
  pickClosestByWatchedTime,
  utcDayEndExclusive,
  utcDayStart,
} from "@/lib/watch-entry-merge";
import { WatchEntrySource } from "@/generated/prisma";

const mockUpdate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { watchEntry: { update: mockUpdate } },
}));

describe("utc day bounds (UTC calendar date)", () => {
  it("builds the UTC day for an afternoon instant", () => {
    const d = new Date("2024-06-10T16:00:00.000Z");
    expect(utcDayStart(d).toISOString()).toBe("2024-06-10T00:00:00.000Z");
    expect(utcDayEndExclusive(d).toISOString()).toBe(
      "2024-06-11T00:00:00.000Z",
    );
  });
});

describe("pickClosestByWatchedTime", () => {
  it("returns the only row", () => {
    const a = { watchedAt: new Date("2024-01-15T12:00:00.000Z") };
    expect(
      pickClosestByWatchedTime([a], new Date("2024-01-15T20:00:00.000Z")),
    ).toBe(a);
  });

  it("picks the entry nearest in time to the candidate", () => {
    const morning = { watchedAt: new Date("2024-01-15T10:00:00.000Z") };
    const evening = { watchedAt: new Date("2024-01-15T19:00:00.000Z") };
    const candidate = new Date("2024-01-15T18:30:00.000Z");
    expect(pickClosestByWatchedTime([morning, evening], candidate)).toBe(
      evening,
    );
  });
});

describe("mergeTautulliIntoWatchEntry", () => {
  it("upgrades an UNKNOWN entry to TAUTULLI", async () => {
    const { mergeTautulliIntoWatchEntry } =
      await import("@/lib/watch-entry-merge");
    await mergeTautulliIntoWatchEntry({
      id: "e1",
      source: WatchEntrySource.UNKNOWN,
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { source: WatchEntrySource.TAUTULLI },
    });
  });

  it("upgrades a PLEX entry to TAUTULLI", async () => {
    mockUpdate.mockClear();
    const { mergeTautulliIntoWatchEntry } =
      await import("@/lib/watch-entry-merge");
    await mergeTautulliIntoWatchEntry({
      id: "e2",
      source: WatchEntrySource.PLEX,
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "e2" },
      data: { source: WatchEntrySource.TAUTULLI },
    });
  });

  it("does not overwrite a MANUAL entry", async () => {
    mockUpdate.mockClear();
    const { mergeTautulliIntoWatchEntry } =
      await import("@/lib/watch-entry-merge");
    await mergeTautulliIntoWatchEntry({
      id: "e3",
      source: WatchEntrySource.MANUAL,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not overwrite a LETTERBOXD entry", async () => {
    mockUpdate.mockClear();
    const { mergeTautulliIntoWatchEntry } =
      await import("@/lib/watch-entry-merge");
    await mergeTautulliIntoWatchEntry({
      id: "e4",
      source: WatchEntrySource.LETTERBOXD,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
