export type ListStats = {
  totalItems: number;
  visibleItems: number;
  distinctDecades: number;
  distinctVisibleTags: number;
};

export function computeListStats(
  items: {
    isHidden: boolean;
    mediaItem: { year: number | null };
    tags: { normalized: string }[];
  }[],
): ListStats {
  const decades = new Set<number>();
  const visibleTags = new Set<string>();
  let visibleItems = 0;

  for (const item of items) {
    if (item.mediaItem.year != null) {
      decades.add(Math.floor(item.mediaItem.year / 10));
    }
    if (!item.isHidden) {
      visibleItems += 1;
      for (const tag of item.tags) {
        visibleTags.add(tag.normalized);
      }
    }
  }

  return {
    totalItems: items.length,
    visibleItems,
    distinctDecades: decades.size,
    distinctVisibleTags: visibleTags.size,
  };
}
