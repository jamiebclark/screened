import { describe, expect, it } from "vitest";
import { pickClosestByWatchedTime, utcDayEndExclusive, utcDayStart } from "@/lib/watch-entry-merge";

describe("utc day bounds (UTC calendar date)", () => {
  it("builds the UTC day for an afternoon instant", () => {
    const d = new Date("2024-06-10T16:00:00.000Z");
    expect(utcDayStart(d).toISOString()).toBe("2024-06-10T00:00:00.000Z");
    expect(utcDayEndExclusive(d).toISOString()).toBe("2024-06-11T00:00:00.000Z");
  });
});

describe("pickClosestByWatchedTime", () => {
  it("returns the only row", () => {
    const a = { watchedAt: new Date("2024-01-15T12:00:00.000Z") };
    expect(pickClosestByWatchedTime([a], new Date("2024-01-15T20:00:00.000Z"))).toBe(a);
  });

  it("picks the entry nearest in time to the candidate", () => {
    const morning = { watchedAt: new Date("2024-01-15T10:00:00.000Z") };
    const evening = { watchedAt: new Date("2024-01-15T19:00:00.000Z") };
    const candidate = new Date("2024-01-15T18:30:00.000Z");
    expect(
      pickClosestByWatchedTime([morning, evening], candidate),
    ).toBe(evening);
  });
});
