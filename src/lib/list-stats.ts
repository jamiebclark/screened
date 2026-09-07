export type TagCount = {
  label: string;
  normalized: string;
  count: number;
};

export type CountryCount = {
  code: string;
  count: number;
};

export type ListStats = {
  totalItems: number;
  visibleItems: number;
  distinctDecades: number;
  distinctVisibleTags: number;
  distinctVisibleCountries: number;
  /** Every declared tag, most-used first; declared-but-unused tags carry count: 0. */
  tagCounts: TagCount[];
  /** How many non-hidden items come from each country, most-common first. */
  countryCounts: CountryCount[];
  /** Every tag the list has declared, whether or not any item carries it. */
  declaredTags: number;
};

type StatsItem = {
  isHidden: boolean;
  mediaItemId: string;
  mediaItem: { year: number | null; productionCountries?: string[] };
  tags: { listTagId: string }[];
};

type StatsListTag = { id: string; label: string; normalized: string };

export type TagCoverageEntry = {
  id: string;
  label: string;
  normalized: string;
  covered: boolean;
};

export type WindowStats = {
  watchedTitles: number;
  coveredTags: number;
  declaredTags: number;
  coveredDecades: number;
  coveredCountries: number;
  tagCoverage: TagCoverageEntry[];
  decades: number[];
  countryCodes: string[];
};

export function computeListStats(
  items: StatsItem[],
  listTags: StatsListTag[],
): ListStats {
  const decades = new Set<number>();
  const visibleTags = new Set<string>();
  const tagCounts = new Map<string, TagCount>(
    listTags.map((tag) => [
      tag.id,
      { label: tag.label, normalized: tag.normalized, count: 0 },
    ]),
  );
  const countryCounts = new Map<string, CountryCount>();
  let visibleItems = 0;

  for (const item of items) {
    if (item.mediaItem.year != null) {
      decades.add(Math.floor(item.mediaItem.year / 10));
    }
    if (!item.isHidden) {
      visibleItems += 1;
      // Count each tag once per item, even if an item somehow carries it twice.
      const seenOnItem = new Set<string>();
      for (const tag of item.tags) {
        if (seenOnItem.has(tag.listTagId)) continue;
        seenOnItem.add(tag.listTagId);
        const existing = tagCounts.get(tag.listTagId);
        if (existing) {
          existing.count += 1;
          visibleTags.add(existing.normalized);
        }
      }

      // A co-production counts once for each of its countries, but never twice
      // for the same country on one title.
      const seenCountries = new Set<string>();
      for (const code of item.mediaItem.productionCountries ?? []) {
        if (seenCountries.has(code)) continue;
        seenCountries.add(code);
        const existing = countryCounts.get(code);
        if (existing) {
          existing.count += 1;
        } else {
          countryCounts.set(code, { code, count: 1 });
        }
      }
    }
  }

  return {
    totalItems: items.length,
    visibleItems,
    distinctDecades: decades.size,
    distinctVisibleTags: visibleTags.size,
    distinctVisibleCountries: countryCounts.size,
    tagCounts: [...tagCounts.values()].sort(
      (a, b) => b.count - a.count || a.normalized.localeCompare(b.normalized),
    ),
    countryCounts: [...countryCounts.values()].sort(
      (a, b) => b.count - a.count || a.code.localeCompare(b.code),
    ),
    declaredTags: listTags.length,
  };
}

export function computeWindowStats(
  items: StatsItem[],
  listTags: StatsListTag[],
  watchedMediaItemIds: ReadonlySet<string>,
): WindowStats {
  const coveredTagIds = new Set<string>();
  const decades = new Set<number>();
  const countryCodes = new Set<string>();
  let watchedTitles = 0;

  for (const item of items) {
    if (item.isHidden) continue;
    if (!watchedMediaItemIds.has(item.mediaItemId)) continue;
    watchedTitles += 1;

    for (const tag of item.tags) {
      coveredTagIds.add(tag.listTagId);
    }
    if (item.mediaItem.year != null) {
      decades.add(Math.floor(item.mediaItem.year / 10) * 10);
    }
    for (const code of item.mediaItem.productionCountries ?? []) {
      countryCodes.add(code);
    }
  }

  const tagCoverage: TagCoverageEntry[] = listTags.map((tag) => ({
    id: tag.id,
    label: tag.label,
    normalized: tag.normalized,
    covered: coveredTagIds.has(tag.id),
  }));

  return {
    watchedTitles,
    coveredTags: coveredTagIds.size,
    declaredTags: listTags.length,
    coveredDecades: decades.size,
    coveredCountries: countryCodes.size,
    tagCoverage,
    decades: [...decades].sort((a, b) => a - b),
    countryCodes: [...countryCodes].sort(),
  };
}
