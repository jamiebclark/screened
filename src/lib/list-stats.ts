export type TagCount = {
  label: string;
  normalized: string;
  count: number;
};

export type ListStats = {
  totalItems: number;
  visibleItems: number;
  distinctDecades: number;
  distinctVisibleTags: number;
  /** How many non-hidden items carry each tag, most-used first. */
  tagCounts: TagCount[];
};

export function computeListStats(
  items: {
    isHidden: boolean;
    mediaItem: { year: number | null };
    tags: { label: string; normalized: string }[];
  }[],
): ListStats {
  const decades = new Set<number>();
  const visibleTags = new Set<string>();
  const tagCounts = new Map<string, TagCount>();
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
        visibleTags.add(tag.normalized);
        if (seenOnItem.has(tag.normalized)) continue;
        seenOnItem.add(tag.normalized);
        const existing = tagCounts.get(tag.normalized);
        if (existing) {
          existing.count += 1;
        } else {
          tagCounts.set(tag.normalized, {
            label: tag.label,
            normalized: tag.normalized,
            count: 1,
          });
        }
      }
    }
  }

  return {
    totalItems: items.length,
    visibleItems,
    distinctDecades: decades.size,
    distinctVisibleTags: visibleTags.size,
    tagCounts: [...tagCounts.values()].sort(
      (a, b) => b.count - a.count || a.normalized.localeCompare(b.normalized),
    ),
  };
}
