import { describe, it, expect } from "vitest";
import {
  parseBrowseFilter,
  serializeBrowseFilter,
  isFilterActive,
  type BrowseFilter,
} from "./browse-types";

const emptyFilter: BrowseFilter = {
  genreIds: [],
  sortOrder: null,
  yearMin: null,
  yearMax: null,
  includePersons: [],
  excludePersons: [],
};

describe("parseBrowseFilter", () => {
  describe("genres", () => {
    it("parses comma-separated genre IDs", () => {
      expect(parseBrowseFilter({ genres: "28,35" }).genreIds).toEqual([28, 35]);
    });

    it("falls back to legacy genre param when genres absent", () => {
      expect(parseBrowseFilter({ genre: "28" }).genreIds).toEqual([28]);
    });

    it("prefers genres over legacy genre", () => {
      expect(
        parseBrowseFilter({ genres: "35,27", genre: "28" }).genreIds,
      ).toEqual([35, 27]);
    });

    it("ignores NaN or zero genre values", () => {
      expect(parseBrowseFilter({ genres: "28,abc,0,35" }).genreIds).toEqual([
        28, 35,
      ]);
    });

    it("returns empty array when absent", () => {
      expect(parseBrowseFilter({}).genreIds).toEqual([]);
    });
  });

  describe("sortOrder", () => {
    it("returns null when absent", () => {
      expect(parseBrowseFilter({}).sortOrder).toBeNull();
    });

    it("returns null for invalid sort value", () => {
      expect(parseBrowseFilter({ sort: "bogus" }).sortOrder).toBeNull();
    });

    it.each([
      "popularity",
      "title",
      "year_desc",
      "year_asc",
      "rating_desc",
      "rating_asc",
    ] as const)("parses valid sort %s", (sort) => {
      expect(parseBrowseFilter({ sort }).sortOrder).toBe(sort);
    });
  });

  describe("year range", () => {
    it("parses yearMin and yearMax", () => {
      const f = parseBrowseFilter({ yearMin: "1970", yearMax: "1990" });
      expect(f.yearMin).toBe(1970);
      expect(f.yearMax).toBe(1990);
    });

    it("returns null for absent year params", () => {
      const f = parseBrowseFilter({});
      expect(f.yearMin).toBeNull();
      expect(f.yearMax).toBeNull();
    });

    it("returns null for out-of-range years", () => {
      expect(parseBrowseFilter({ yearMin: "1700" }).yearMin).toBeNull();
      expect(parseBrowseFilter({ yearMax: "3000" }).yearMax).toBeNull();
    });

    it("returns null for non-numeric year", () => {
      expect(parseBrowseFilter({ yearMin: "abc" }).yearMin).toBeNull();
    });

    it("does NOT swap yearMin/yearMax when inverted (page.tsx detects error)", () => {
      const f = parseBrowseFilter({ yearMin: "1990", yearMax: "1970" });
      expect(f.yearMin).toBe(1990);
      expect(f.yearMax).toBe(1970);
    });
  });

  describe("persons", () => {
    it("parses id:name pairs for includePersons", () => {
      const f = parseBrowseFilter({
        includePersons: "1334:Denis%20Villeneuve,5678:Tilda%20Swinton",
      });
      expect(f.includePersons).toEqual([
        { id: 1334, name: "Denis Villeneuve" },
        { id: 5678, name: "Tilda Swinton" },
      ]);
    });

    it("parses excludePersons independently", () => {
      const f = parseBrowseFilter({ excludePersons: "9012:Adam%20Sandler" });
      expect(f.excludePersons).toEqual([{ id: 9012, name: "Adam Sandler" }]);
    });

    it("truncates person lists to 5", () => {
      const raw = "1:A,2:B,3:C,4:D,5:E,6:F";
      expect(
        parseBrowseFilter({ includePersons: raw }).includePersons,
      ).toHaveLength(5);
    });

    it("skips malformed pairs (missing colon, non-numeric id, empty name)", () => {
      const f = parseBrowseFilter({ includePersons: "abc,0:Valid,1234:Real" });
      expect(f.includePersons).toEqual([{ id: 1234, name: "Real" }]);
    });

    it("returns empty arrays when absent", () => {
      const f = parseBrowseFilter({});
      expect(f.includePersons).toEqual([]);
      expect(f.excludePersons).toEqual([]);
    });
  });
});

describe("serializeBrowseFilter", () => {
  it("returns /browse with no active filters and no preserve", () => {
    expect(serializeBrowseFilter(emptyFilter, {})).toBe("/browse");
  });

  it("omits type=movie (default)", () => {
    expect(serializeBrowseFilter(emptyFilter, { type: "movie" })).toBe(
      "/browse",
    );
  });

  it("includes non-default type", () => {
    expect(serializeBrowseFilter(emptyFilter, { type: "tv" })).toContain(
      "type=tv",
    );
  });

  it("includes filter (scope) param", () => {
    expect(serializeBrowseFilter(emptyFilter, { filter: "library" })).toContain(
      "filter=library",
    );
  });

  it("serializes genres as comma-joined IDs", () => {
    const url = serializeBrowseFilter(
      { ...emptyFilter, genreIds: [28, 35] },
      {},
    );
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("genres")).toBe("28,35");
  });

  it("serializes sort", () => {
    const url = serializeBrowseFilter(
      { ...emptyFilter, sortOrder: "rating_desc" },
      {},
    );
    expect(url).toContain("sort=rating_desc");
  });

  it("omits sort when null", () => {
    expect(serializeBrowseFilter(emptyFilter, {})).not.toContain("sort");
  });

  it("omits page — resets to 1 on filter changes", () => {
    expect(serializeBrowseFilter(emptyFilter, { page: "5" })).not.toContain(
      "page",
    );
  });

  it("serializes year range", () => {
    const url = serializeBrowseFilter(
      { ...emptyFilter, yearMin: 1970, yearMax: 1990 },
      {},
    );
    expect(url).toContain("yearMin=1970");
    expect(url).toContain("yearMax=1990");
  });

  it("serializes includePersons as id:name pairs", () => {
    const url = serializeBrowseFilter(
      {
        ...emptyFilter,
        includePersons: [{ id: 1334, name: "Denis Villeneuve" }],
      },
      {},
    );
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("includePersons")).toBe("1334:Denis%20Villeneuve");
  });

  it("round-trips a complex filter through parse → serialize → parse", () => {
    const original: BrowseFilter = {
      genreIds: [28, 35],
      sortOrder: "year_desc",
      yearMin: 1990,
      yearMax: 2000,
      includePersons: [{ id: 1334, name: "Denis Villeneuve" }],
      excludePersons: [{ id: 9012, name: "Adam Sandler" }],
    };
    const url = serializeBrowseFilter(original, {
      type: "movie",
      filter: "unseen",
    });
    const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
    const reparsed = parseBrowseFilter(
      Object.fromEntries(new URLSearchParams(qs)),
    );
    expect(reparsed.genreIds).toEqual([28, 35]);
    expect(reparsed.sortOrder).toBe("year_desc");
    expect(reparsed.yearMin).toBe(1990);
    expect(reparsed.yearMax).toBe(2000);
    expect(reparsed.includePersons[0]).toEqual({
      id: 1334,
      name: "Denis Villeneuve",
    });
    expect(reparsed.excludePersons[0]).toEqual({
      id: 9012,
      name: "Adam Sandler",
    });
  });
});

describe("isFilterActive", () => {
  it("returns false for empty filter", () => {
    expect(isFilterActive(emptyFilter)).toBe(false);
  });

  it("returns true when any field is non-default", () => {
    expect(isFilterActive({ ...emptyFilter, genreIds: [28] })).toBe(true);
    expect(isFilterActive({ ...emptyFilter, sortOrder: "title" })).toBe(true);
    expect(isFilterActive({ ...emptyFilter, yearMin: 1990 })).toBe(true);
    expect(
      isFilterActive({
        ...emptyFilter,
        includePersons: [{ id: 1, name: "x" }],
      }),
    ).toBe(true);
  });
});
