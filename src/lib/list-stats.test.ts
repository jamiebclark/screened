import { describe, expect, it } from "vitest";
import { computeListStats, computeWindowStats } from "./list-stats";

/** A ListTag row keyed by its own label, so tests can pass label strings around. */
function listTag(label: string) {
  return {
    id: `id-${label.toLocaleLowerCase()}`,
    label,
    normalized: label.toLocaleLowerCase(),
  };
}

function listTagsFor(labels: string[]) {
  return labels.map(listTag);
}

let nextMediaItemId = 0;

function item(overrides: {
  isHidden?: boolean;
  year?: number | null;
  tags?: string[];
  countries?: string[];
  mediaItemId?: string;
}) {
  return {
    isHidden: overrides.isHidden ?? false,
    mediaItemId: overrides.mediaItemId ?? `media-${nextMediaItemId++}`,
    mediaItem: {
      year: overrides.year ?? null,
      productionCountries: overrides.countries ?? [],
    },
    tags: (overrides.tags ?? []).map((label) => ({
      listTagId: listTag(label).id,
    })),
  };
}

describe("computeListStats", () => {
  it("counts total and visible items across 12 items with 3 hidden", () => {
    const items = [
      ...Array.from({ length: 9 }, () => item({ isHidden: false })),
      ...Array.from({ length: 3 }, () => item({ isHidden: true })),
    ];
    const stats = computeListStats(items, []);
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
    expect(computeListStats(items, []).distinctDecades).toBe(3);
  });

  it("excludes a tag present only on a hidden item from distinctVisibleTags", () => {
    const items = [
      item({ isHidden: true, tags: ["only-hidden"] }),
      item({ isHidden: false, tags: ["shared"] }),
    ];
    const listTags = listTagsFor(["only-hidden", "shared"]);
    expect(computeListStats(items, listTags).distinctVisibleTags).toBe(1);
  });

  it("includes a tag present on both a hidden and a visible item", () => {
    const items = [
      item({ isHidden: true, tags: ["shared"] }),
      item({ isHidden: false, tags: ["shared"] }),
    ];
    const listTags = listTagsFor(["shared"]);
    expect(computeListStats(items, listTags).distinctVisibleTags).toBe(1);
  });

  it("returns all zeros for an empty list with no declared tags", () => {
    expect(computeListStats([], [])).toEqual({
      totalItems: 0,
      visibleItems: 0,
      distinctDecades: 0,
      distinctVisibleTags: 0,
      distinctVisibleCountries: 0,
      tagCounts: [],
      countryCounts: [],
      declaredTags: 0,
    });
  });
});

describe("computeListStats declaredTags", () => {
  it("equals the number of declared list tags, whether or not any item carries them", () => {
    const listTags = listTagsFor(["Gore", "Slasher", "Unused"]);
    const stats = computeListStats([item({ tags: ["Gore"] })], listTags);
    expect(stats.declaredTags).toBe(3);
  });
});

describe("computeListStats tagCounts", () => {
  it("counts how many non-hidden items carry each tag", () => {
    const listTags = listTagsFor(["Tom Savini", "Gore"]);
    const stats = computeListStats(
      [
        item({ tags: ["Tom Savini", "Gore"] }),
        item({ tags: ["Tom Savini"] }),
        item({ tags: ["Gore"] }),
      ],
      listTags,
    );
    expect(stats.tagCounts).toEqual([
      { label: "Gore", normalized: "gore", count: 2 },
      { label: "Tom Savini", normalized: "tom savini", count: 2 },
    ]);
  });

  it("includes a declared-but-unused tag at count: 0", () => {
    const listTags = listTagsFor(["Tom Savini", "Unused Category"]);
    const stats = computeListStats([item({ tags: ["Tom Savini"] })], listTags);
    expect(stats.tagCounts).toEqual([
      { label: "Tom Savini", normalized: "tom savini", count: 1 },
      { label: "Unused Category", normalized: "unused category", count: 0 },
    ]);
  });

  it("excludes tags carried only by hidden items", () => {
    const listTags = listTagsFor(["Hidden Only", "Tom Savini"]);
    const stats = computeListStats(
      [
        item({ isHidden: true, tags: ["Hidden Only"] }),
        item({ tags: ["Tom Savini"] }),
      ],
      listTags,
    );
    expect(stats.tagCounts).toEqual([
      { label: "Tom Savini", normalized: "tom savini", count: 1 },
      { label: "Hidden Only", normalized: "hidden only", count: 0 },
    ]);
  });

  it("does not count a hidden item towards a tag it shares with a visible one", () => {
    const listTags = listTagsFor(["Tom Savini"]);
    const stats = computeListStats(
      [
        item({ isHidden: true, tags: ["Tom Savini"] }),
        item({ tags: ["Tom Savini"] }),
      ],
      listTags,
    );
    expect(stats.tagCounts[0].count).toBe(1);
  });

  it("orders by count descending, then normalized ascending", () => {
    const listTags = listTagsFor(["Zombie", "Alpha"]);
    const stats = computeListStats(
      [item({ tags: ["Zombie", "Alpha"] }), item({ tags: ["Zombie"] })],
      listTags,
    );
    expect(stats.tagCounts.map((t) => t.normalized)).toEqual([
      "zombie",
      "alpha",
    ]);
  });

  it("is empty when the list has declared no tags", () => {
    expect(computeListStats([item({}), item({})], []).tagCounts).toEqual([]);
  });
});

describe("computeListStats countryCounts", () => {
  it("counts how many non-hidden items come from each country", () => {
    const stats = computeListStats(
      [
        item({ countries: ["US"] }),
        item({ countries: ["US"] }),
        item({ countries: ["JP"] }),
      ],
      [],
    );
    expect(stats.countryCounts).toEqual([
      { code: "US", count: 2 },
      { code: "JP", count: 1 },
    ]);
    expect(stats.distinctVisibleCountries).toBe(2);
  });

  it("counts a co-production once for each of its countries", () => {
    const stats = computeListStats([item({ countries: ["US", "GB"] })], []);
    expect(stats.countryCounts).toEqual([
      { code: "GB", count: 1 },
      { code: "US", count: 1 },
    ]);
  });

  it("never counts the same country twice for one title", () => {
    const stats = computeListStats([item({ countries: ["US", "US"] })], []);
    expect(stats.countryCounts).toEqual([{ code: "US", count: 1 }]);
  });

  it("excludes hidden items", () => {
    const stats = computeListStats(
      [
        item({ isHidden: true, countries: ["FR"] }),
        item({ countries: ["US"] }),
      ],
      [],
    );
    expect(stats.countryCounts).toEqual([{ code: "US", count: 1 }]);
  });

  it("orders by count descending, then code ascending", () => {
    const stats = computeListStats(
      [item({ countries: ["ZA", "AR"] }), item({ countries: ["ZA"] })],
      [],
    );
    expect(stats.countryCounts.map((c) => c.code)).toEqual(["ZA", "AR"]);
  });

  it("is empty when items have no country data yet", () => {
    expect(computeListStats([item({}), item({})], []).countryCounts).toEqual(
      [],
    );
  });
});

describe("computeWindowStats", () => {
  it("only counts an item whose mediaItemId is in the watched set", () => {
    const watched = item({ mediaItemId: "m1", year: 1985, tags: ["Gore"] });
    const unwatched = item({ mediaItemId: "m2", year: 1990 });
    const stats = computeWindowStats(
      [watched, unwatched],
      listTagsFor(["Gore"]),
      new Set(["m1"]),
    );
    expect(stats.watchedTitles).toBe(1);
    expect(stats.decades).toEqual([1980]);
  });

  it("never counts a hidden item, even if watched", () => {
    const hidden = item({ mediaItemId: "m1", isHidden: true, year: 1985 });
    const stats = computeWindowStats([hidden], [], new Set(["m1"]));
    expect(stats.watchedTitles).toBe(0);
    expect(stats.decades).toEqual([]);
  });

  it("credits each tag/decade/country once regardless of repeated watches of the same title", () => {
    const watched = item({
      mediaItemId: "m1",
      year: 1985,
      tags: ["Gore"],
      countries: ["US"],
    });
    const stats = computeWindowStats(
      [watched],
      listTagsFor(["Gore"]),
      new Set(["m1"]),
    );
    expect(stats.coveredTags).toBe(1);
    expect(stats.coveredDecades).toBe(1);
    expect(stats.coveredCountries).toBe(1);
    expect(stats.decades).toEqual([1985 - (1985 % 10)]);
    expect(stats.countryCodes).toEqual(["US"]);
  });

  it("lists every declared tag in tagCoverage, covered: false when nothing covers it", () => {
    const watched = item({ mediaItemId: "m1", tags: ["Gore"] });
    const stats = computeWindowStats(
      [watched],
      listTagsFor(["Gore", "Slasher"]),
      new Set(["m1"]),
    );
    expect(stats.tagCoverage).toEqual([
      { id: "id-gore", label: "Gore", normalized: "gore", covered: true },
      {
        id: "id-slasher",
        label: "Slasher",
        normalized: "slasher",
        covered: false,
      },
    ]);
    expect(stats.declaredTags).toBe(2);
  });

  it("does not error on a title with no year or no countries, and untagged titles still contribute", () => {
    const watched = item({ mediaItemId: "m1" });
    const stats = computeWindowStats([watched], [], new Set(["m1"]));
    expect(stats.decades).toEqual([]);
    expect(stats.countryCodes).toEqual([]);
    expect(stats.watchedTitles).toBe(1);
  });

  it("pins SC-004: watch predating the window contributes 0, watched again inside contributes 1", () => {
    const item1 = item({ mediaItemId: "m1", year: 1985 });
    const notYetInWindow = computeWindowStats([item1], [], new Set());
    expect(notYetInWindow.watchedTitles).toBe(0);

    const nowInWindow = computeWindowStats([item1], [], new Set(["m1"]));
    expect(nowInWindow.watchedTitles).toBe(1);
  });
});
