import { describe, expect, it } from "vitest";
import {
  TITLE_SEARCH_DEFAULT_LIMIT,
  TITLE_SEARCH_MIN_YEAR,
  buildTitleSearchQuery,
  parseTitleSearchParams,
} from "./title-search-params";

const NOW = new Date("2026-09-06T00:00:00Z");
const MAX_YEAR = NOW.getFullYear() + 10;

function params(entries: Record<string, string>) {
  return new URLSearchParams(entries);
}

describe("parseTitleSearchParams", () => {
  it("defaults type to movie, page to 1, limit to 8, year to null when absent", () => {
    const result = parseTitleSearchParams(params({ q: "House" }), NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        q: "House",
        mediaType: "movie",
        year: null,
        page: 1,
        limit: TITLE_SEARCH_DEFAULT_LIMIT,
      },
    });
  });

  it("treats empty/absent q as valid, trimmed to empty string", () => {
    expect(parseTitleSearchParams(params({}), NOW)).toEqual({
      ok: true,
      value: { q: "", mediaType: "movie", year: null, page: 1, limit: 8 },
    });
    expect(parseTitleSearchParams(params({ q: "   " }), NOW)).toEqual({
      ok: true,
      value: { q: "", mediaType: "movie", year: null, page: 1, limit: 8 },
    });
  });

  it("accepts tv and multi types", () => {
    expect(parseTitleSearchParams(params({ q: "x", type: "tv" }), NOW).ok).toBe(
      true,
    );
    expect(
      parseTitleSearchParams(params({ q: "x", type: "multi" }), NOW).ok,
    ).toBe(true);
  });

  it("rejects an invalid type", () => {
    expect(
      parseTitleSearchParams(params({ q: "x", type: "person" }), NOW),
    ).toEqual({ ok: false, error: "Search type must be movie, tv or multi" });
  });

  it("accepts the year lower boundary", () => {
    const result = parseTitleSearchParams(
      params({ q: "x", year: String(TITLE_SEARCH_MIN_YEAR) }),
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        q: "x",
        mediaType: "movie",
        year: TITLE_SEARCH_MIN_YEAR,
        page: 1,
        limit: 8,
      },
    });
  });

  it("rejects one year below the lower boundary", () => {
    const result = parseTitleSearchParams(
      params({ q: "x", year: String(TITLE_SEARCH_MIN_YEAR - 1) }),
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      error: `Year must be a whole number between ${TITLE_SEARCH_MIN_YEAR} and ${MAX_YEAR}`,
    });
  });

  it("accepts the year upper boundary (currentYear + 10)", () => {
    const result = parseTitleSearchParams(
      params({ q: "x", year: String(MAX_YEAR) }),
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      value: { q: "x", mediaType: "movie", year: MAX_YEAR, page: 1, limit: 8 },
    });
  });

  it("rejects one year above the upper boundary", () => {
    const result = parseTitleSearchParams(
      params({ q: "x", year: String(MAX_YEAR + 1) }),
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      error: `Year must be a whole number between ${TITLE_SEARCH_MIN_YEAR} and ${MAX_YEAR}`,
    });
  });

  it("rejects a non-numeric year", () => {
    expect(
      parseTitleSearchParams(params({ q: "x", year: "abc" }), NOW),
    ).toEqual({
      ok: false,
      error: `Year must be a whole number between ${TITLE_SEARCH_MIN_YEAR} and ${MAX_YEAR}`,
    });
  });

  it("rejects a non-numeric page", () => {
    expect(
      parseTitleSearchParams(params({ q: "x", page: "abc" }), NOW),
    ).toEqual({
      ok: false,
      error: "Page must be a whole number between 1 and 500",
    });
  });

  it("accepts page boundaries and rejects outside them", () => {
    expect(parseTitleSearchParams(params({ q: "x", page: "1" }), NOW).ok).toBe(
      true,
    );
    expect(
      parseTitleSearchParams(params({ q: "x", page: "500" }), NOW).ok,
    ).toBe(true);
    expect(parseTitleSearchParams(params({ q: "x", page: "0" }), NOW)).toEqual({
      ok: false,
      error: "Page must be a whole number between 1 and 500",
    });
    expect(
      parseTitleSearchParams(params({ q: "x", page: "501" }), NOW),
    ).toEqual({
      ok: false,
      error: "Page must be a whole number between 1 and 500",
    });
  });

  it("rejects a non-numeric limit", () => {
    expect(
      parseTitleSearchParams(params({ q: "x", limit: "abc" }), NOW),
    ).toEqual({
      ok: false,
      error: "Limit must be a whole number between 1 and 20",
    });
  });

  it("accepts limit boundaries and rejects outside them", () => {
    expect(parseTitleSearchParams(params({ q: "x", limit: "1" }), NOW).ok).toBe(
      true,
    );
    expect(
      parseTitleSearchParams(params({ q: "x", limit: "20" }), NOW).ok,
    ).toBe(true);
    expect(parseTitleSearchParams(params({ q: "x", limit: "0" }), NOW)).toEqual(
      {
        ok: false,
        error: "Limit must be a whole number between 1 and 20",
      },
    );
    expect(
      parseTitleSearchParams(params({ q: "x", limit: "21" }), NOW),
    ).toEqual({
      ok: false,
      error: "Limit must be a whole number between 1 and 20",
    });
  });
});

describe("buildTitleSearchQuery", () => {
  it("round-trips through parseTitleSearchParams", () => {
    const built = buildTitleSearchQuery({
      q: "House",
      mediaType: "tv",
      year: 1985,
      page: 2,
      limit: 20,
    });
    const parsed = parseTitleSearchParams(new URLSearchParams(built), NOW);
    expect(parsed).toEqual({
      ok: true,
      value: { q: "House", mediaType: "tv", year: 1985, page: 2, limit: 20 },
    });
  });

  it("omits absent optional params", () => {
    const built = buildTitleSearchQuery({ q: "House" });
    expect(new URLSearchParams(built).toString()).toBe(
      new URLSearchParams({ q: "House" }).toString(),
    );
  });
});
