import { describe, expect, it } from "vitest";
import { computeListStats } from "./list-stats";

function item(overrides: {
  isHidden?: boolean;
  year?: number | null;
  tags?: string[];
  countries?: string[];
}) {
  return {
    isHidden: overrides.isHidden ?? false,
    mediaItem: {
      year: overrides.year ?? null,
      productionCountries: overrides.countries ?? [],
    },
    tags: (overrides.tags ?? []).map((label) => ({
      label,
      normalized: label.toLocaleLowerCase(),
    })),
  };
}

describe("computeListStats", () => {
  it("counts total and visible items across 12 items with 3 hidden", () => {
    const items = [
      ...Array.from({ length: 9 }, () => item({ isHidden: false })),
      ...Array.from({ length: 3 }, () => item({ isHidden: true })),
    ];
    const stats = computeListStats(items);
    expect(stats.totalItems).toBe(12);
    expect(stats.visibleItems).toBe(9);
  });

  it("computes distinct decades over all items, excluding unknown years", () => {
    const items = [
      item({ year: 1985 }),
      item({ year: 1989 }),
      item({ year: 1994 }),
      item({ year: 2001 }),
      item({ year: null }),
    ];
    expect(computeListStats(items).distinctDecades).toBe(3);
  });

  it("excludes a tag present only on a hidden item from distinctVisibleTags", () => {
    const items = [
      item({ isHidden: true, tags: ["only-hidden"] }),
      item({ isHidden: false, tags: ["shared"] }),
    ];
    expect(computeListStats(items).distinctVisibleTags).toBe(1);
  });

  it("includes a tag present on both a hidden and a visible item", () => {
    const items = [
      item({ isHidden: true, tags: ["shared"] }),
      item({ isHidden: false, tags: ["shared"] }),
    ];
    expect(computeListStats(items).distinctVisibleTags).toBe(1);
  });

  it("returns all zeros for an empty list", () => {
    expect(computeListStats([])).toEqual({
      totalItems: 0,
      visibleItems: 0,
      distinctDecades: 0,
      distinctVisibleTags: 0,
      distinctVisibleCountries: 0,
      tagCounts: [],
      countryCounts: [],
    });
  });
});

describe("computeListStats tagCounts", () => {
  it("counts how many non-hidden items carry each tag", () => {
    const stats = computeListStats([
      item({ tags: ["Tom Savini", "Gore"] }),
      item({ tags: ["Tom Savini"] }),
      item({ tags: ["Gore"] }),
    ]);
    expect(stats.tagCounts).toEqual([
      { label: "Gore", normalized: "gore", count: 2 },
      { label: "Tom Savini", normalized: "tom savini", count: 2 },
    ]);
  });

  it("excludes tags carried only by hidden items", () => {
    const stats = computeListStats([
      item({ isHidden: true, tags: ["Hidden Only"] }),
      item({ tags: ["Tom Savini"] }),
    ]);
    expect(stats.tagCounts).toEqual([
      { label: "Tom Savini", normalized: "tom savini", count: 1 },
    ]);
  });

  it("does not count a hidden item towards a tag it shares with a visible one", () => {
    const stats = computeListStats([
      item({ isHidden: true, tags: ["Tom Savini"] }),
      item({ tags: ["Tom Savini"] }),
    ]);
    expect(stats.tagCounts[0].count).toBe(1);
  });

  it("orders by count descending, then normalized ascending", () => {
    const stats = computeListStats([
      item({ tags: ["Zombie", "Alpha"] }),
      item({ tags: ["Zombie"] }),
    ]);
    expect(stats.tagCounts.map((t) => t.normalized)).toEqual([
      "zombie",
      "alpha",
    ]);
  });

  it("is empty when nothing is tagged", () => {
    expect(computeListStats([item({}), item({})]).tagCounts).toEqual([]);
  });
});

describe("computeListStats countryCounts", () => {
  it("counts how many non-hidden items come from each country", () => {
    const stats = computeListStats([
      item({ countries: ["US"] }),
      item({ countries: ["US"] }),
      item({ countries: ["JP"] }),
    ]);
    expect(stats.countryCounts).toEqual([
      { code: "US", count: 2 },
      { code: "JP", count: 1 },
    ]);
    expect(stats.distinctVisibleCountries).toBe(2);
  });

  it("counts a co-production once for each of its countries", () => {
    const stats = computeListStats([item({ countries: ["US", "GB"] })]);
    expect(stats.countryCounts).toEqual([
      { code: "GB", count: 1 },
      { code: "US", count: 1 },
    ]);
  });

  it("never counts the same country twice for one title", () => {
    const stats = computeListStats([item({ countries: ["US", "US"] })]);
    expect(stats.countryCounts).toEqual([{ code: "US", count: 1 }]);
  });

  it("excludes hidden items", () => {
    const stats = computeListStats([
      item({ isHidden: true, countries: ["FR"] }),
      item({ countries: ["US"] }),
    ]);
    expect(stats.countryCounts).toEqual([{ code: "US", count: 1 }]);
  });

  it("orders by count descending, then code ascending", () => {
    const stats = computeListStats([
      item({ countries: ["ZA", "AR"] }),
      item({ countries: ["ZA"] }),
    ]);
    expect(stats.countryCounts.map((c) => c.code)).toEqual(["ZA", "AR"]);
  });

  it("is empty when items have no country data yet", () => {
    expect(computeListStats([item({}), item({})]).countryCounts).toEqual([]);
  });
});
