import { describe, expect, it } from "vitest";
import { computeListStats } from "./list-stats";

function item(overrides: {
  isHidden?: boolean;
  year?: number | null;
  tags?: string[];
}) {
  return {
    isHidden: overrides.isHidden ?? false,
    mediaItem: { year: overrides.year ?? null },
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
      tagCounts: [],
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
