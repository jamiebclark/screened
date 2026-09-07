import { describe, expect, it } from "vitest";
import {
  countryDisplayName,
  extractProductionCountries,
  formatProductionCountries,
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
