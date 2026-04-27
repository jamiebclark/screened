import { describe, expect, it } from "vitest";
import {
  adjacentMonthHrefs,
  adjacentYearHrefs,
  dayCanonicalPath,
  historyDayPath,
  isValidCalendarDate,
  localDayRange,
  monthCanonicalPath,
  parseDateOnlyIso,
  parseDaySegment,
  parseMonthSegment,
  parseYearSegment,
  toDateOnlyIso,
} from "./history-calendar";

describe("history-calendar", () => {
  it("parses year segment", () => {
    expect(parseYearSegment("2026")).toBe(2026);
    expect(parseYearSegment("1899")).toBeNull();
    expect(parseYearSegment("2101")).toBeNull();
    expect(parseYearSegment("abc")).toBeNull();
  });

  it("parses month and day segments", () => {
    expect(parseMonthSegment("04")).toBe(4);
    expect(parseMonthSegment("4")).toBe(4);
    expect(parseMonthSegment("13")).toBeNull();
    expect(parseDaySegment("26")).toBe(26);
    expect(parseDaySegment("31")).toBe(31);
    expect(parseDaySegment("32")).toBeNull();
  });

  it("validates calendar dates", () => {
    expect(isValidCalendarDate(2026, 4, 26)).toBe(true);
    expect(isValidCalendarDate(2026, 2, 29)).toBe(false);
    expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
  });

  it("builds day paths", () => {
    expect(historyDayPath(2026, 4, 5)).toBe("/history/2026/04/05");
  });

  it("canonical month/day paths", () => {
    expect(monthCanonicalPath(2026, 4, "4")).toBe("/history/2026/04");
    expect(monthCanonicalPath(2026, 4, "04")).toBeNull();
    expect(dayCanonicalPath(2026, 4, 5, "5")).toBe("/history/2026/04/05");
    expect(dayCanonicalPath(2026, 4, 5, "05")).toBeNull();
  });

  it("localDayRange covers one calendar day", () => {
    const { start, end } = localDayRange(2026, 4, 26);
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(start.getDate()).toBe(26);
    expect(end.getDate()).toBe(26);
  });

  it("parseDateOnlyIso", () => {
    expect(parseDateOnlyIso("2026-04-26")).toBe("2026-04-26");
    expect(parseDateOnlyIso("2026-04-31")).toBeNull();
    expect(parseDateOnlyIso("nope")).toBeNull();
  });

  it("toDateOnlyIso", () => {
    expect(toDateOnlyIso(2026, 4, 5)).toBe("2026-04-05");
  });

  it("adjacentMonthHrefs clamps to min/max year", () => {
    expect(adjacentMonthHrefs(1900, 1).prev).toBeNull();
    expect(adjacentMonthHrefs(1900, 1).next).toEqual({ year: 1900, month: 2 });
    expect(adjacentMonthHrefs(2100, 12).next).toBeNull();
    expect(adjacentMonthHrefs(2100, 12).prev).toEqual({
      year: 2100,
      month: 11,
    });
    expect(adjacentMonthHrefs(2026, 1).prev).toEqual({ year: 2025, month: 12 });
  });

  it("adjacentYearHrefs", () => {
    expect(adjacentYearHrefs(1900).prev).toBeNull();
    expect(adjacentYearHrefs(2100).next).toBeNull();
    expect(adjacentYearHrefs(2026).prev).toBe(2025);
  });
});
