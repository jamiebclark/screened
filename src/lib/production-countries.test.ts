import { describe, expect, it } from "vitest";
import {
  BACKFILL_DEFAULT_LIMIT,
  BACKFILL_MAX_LIMIT,
  countryDisplayName,
  extractProductionCountries,
  formatProductionCountries,
  parseBackfillLimit,
} from "./production-countries";

describe("extractProductionCountries", () => {
  it("reads codes from TMDB's film production_countries objects", () => {
    expect(
      extractProductionCountries([
        { iso_3166_1: "US", name: "United States of America" },
        { iso_3166_1: "GB", name: "United Kingdom" },
      ]),
    ).toEqual(["US", "GB"]);
  });

  it("reads codes from TMDB's TV origin_country string array", () => {
    expect(extractProductionCountries(["JP", "KR"])).toEqual(["JP", "KR"]);
  });

  it("uppercases and trims", () => {
    expect(extractProductionCountries([" us ", "gb"])).toEqual(["US", "GB"]);
  });

  it("dedupes, keeping first-seen order", () => {
    expect(
      extractProductionCountries(["US", { iso_3166_1: "us" }, "GB"]),
    ).toEqual(["US", "GB"]);
  });

  it("drops anything that is not a two-letter code", () => {
    expect(
      extractProductionCountries([
        "USA",
        "",
        "1",
        null,
        undefined,
        42,
        {},
        { iso_3166_1: 7 },
        "GB",
      ]),
    ).toEqual(["GB"]);
  });

  it("returns an empty array for a missing or non-array field", () => {
    expect(extractProductionCountries(undefined)).toEqual([]);
    expect(extractProductionCountries(null)).toEqual([]);
    expect(extractProductionCountries("US")).toEqual([]);
    expect(extractProductionCountries([])).toEqual([]);
  });
});

describe("countryDisplayName", () => {
  it("resolves a code to a readable name", () => {
    expect(countryDisplayName("US")).toBe("United States");
    expect(countryDisplayName("JP")).toBe("Japan");
  });

  it("is case-insensitive", () => {
    expect(countryDisplayName("gb")).toBe("United Kingdom");
  });

  it("falls back to the input when it is not a valid code", () => {
    expect(countryDisplayName("USA")).toBe("USA");
  });
});

describe("formatProductionCountries", () => {
  it("joins display names with commas", () => {
    expect(formatProductionCountries(["US", "GB"])).toBe(
      "United States, United Kingdom",
    );
  });

  it("is empty for no countries", () => {
    expect(formatProductionCountries([])).toBe("");
  });
});

describe("parseBackfillLimit", () => {
  it("defaults when the value is missing or unparseable", () => {
    expect(parseBackfillLimit(undefined)).toBe(BACKFILL_DEFAULT_LIMIT);
    expect(parseBackfillLimit(null)).toBe(BACKFILL_DEFAULT_LIMIT);
    expect(parseBackfillLimit("")).toBe(BACKFILL_DEFAULT_LIMIT);
    expect(parseBackfillLimit("abc")).toBe(BACKFILL_DEFAULT_LIMIT);
    expect(parseBackfillLimit(NaN)).toBe(BACKFILL_DEFAULT_LIMIT);
  });

  it("accepts a numeric or string value", () => {
    expect(parseBackfillLimit(10)).toBe(10);
    expect(parseBackfillLimit("10")).toBe(10);
  });

  it("clamps to at least 1", () => {
    expect(parseBackfillLimit(0)).toBe(1);
    expect(parseBackfillLimit(-5)).toBe(1);
  });

  it("clamps to the maximum", () => {
    expect(parseBackfillLimit(BACKFILL_MAX_LIMIT + 1)).toBe(BACKFILL_MAX_LIMIT);
    expect(parseBackfillLimit(100000)).toBe(BACKFILL_MAX_LIMIT);
  });

  it("floors a fractional value", () => {
    expect(parseBackfillLimit(10.9)).toBe(10);
  });
});
