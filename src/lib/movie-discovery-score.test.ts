import { describe, it, expect } from "vitest";
import {
  yearFromTmdbDate,
  yearInRange,
  matchesPerson,
} from "./movie-discovery-score";

describe("yearFromTmdbDate", () => {
  it("parses a full ISO date string", () => {
    expect(yearFromTmdbDate("2010-07-16")).toBe(2010);
  });

  it("parses a mid-year date string", () => {
    expect(yearFromTmdbDate("1994-07-15")).toBe(1994);
  });

  it("returns null for null input", () => {
    expect(yearFromTmdbDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(yearFromTmdbDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(yearFromTmdbDate("")).toBeNull();
  });

  it("returns null for an unparseable string", () => {
    expect(yearFromTmdbDate("not-a-date")).toBeNull();
  });
});

describe("yearInRange", () => {
  it("passes when year is within min and max", () => {
    expect(yearInRange(2010, 2000, 2020)).toBe(true);
  });

  it("passes when year equals min boundary", () => {
    expect(yearInRange(2000, 2000, 2020)).toBe(true);
  });

  it("passes when year equals max boundary", () => {
    expect(yearInRange(2020, 2000, 2020)).toBe(true);
  });

  it("fails when year is below min", () => {
    expect(yearInRange(1999, 2000, 2020)).toBe(false);
  });

  it("fails when year is above max", () => {
    expect(yearInRange(2021, 2000, 2020)).toBe(false);
  });

  it("passes when only min is set and year is >= min", () => {
    expect(yearInRange(2010, 2000, undefined)).toBe(true);
    expect(yearInRange(1999, 2000, undefined)).toBe(false);
  });

  it("passes when only max is set and year is <= max", () => {
    expect(yearInRange(2010, undefined, 2020)).toBe(true);
    expect(yearInRange(2021, undefined, 2020)).toBe(false);
  });

  it("always passes when year is null (unknown release)", () => {
    expect(yearInRange(null, 2000, 2020)).toBe(true);
  });

  it("passes when no bounds are given", () => {
    expect(yearInRange(1900, undefined, undefined)).toBe(true);
  });
});

describe("matchesPerson", () => {
  const cast = ["Tom Hanks", "Robin Wright", "Gary Sinise"];
  const director = "Robert Zemeckis";

  it("matches a cast member by full name (case-insensitive)", () => {
    expect(matchesPerson(cast, director, "tom hanks")).toBe(true);
  });

  it("matches a cast member by partial name", () => {
    expect(matchesPerson(cast, director, "sinise")).toBe(true);
  });

  it("matches the director", () => {
    expect(matchesPerson(cast, director, "zemeckis")).toBe(true);
  });

  it("returns false when name does not match anyone", () => {
    expect(matchesPerson(cast, director, "kubrick")).toBe(false);
  });

  it("uses directors array instead of director string when provided", () => {
    const directors = ["Christopher Nolan"];
    expect(matchesPerson([], null, "nolan", directors)).toBe(true);
    expect(matchesPerson([], null, "zemeckis", directors)).toBe(false);
  });

  it("handles null director gracefully", () => {
    expect(matchesPerson(cast, null, "tom hanks")).toBe(true);
    expect(matchesPerson(cast, null, "zemeckis")).toBe(false);
  });

  it("handles empty cast and no director", () => {
    expect(matchesPerson([], null, "anyone")).toBe(false);
  });
});
