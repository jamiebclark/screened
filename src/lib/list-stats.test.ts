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
    tags: (overrides.tags ?? []).map((normalized) => ({ normalized })),
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
    });
  });
});
