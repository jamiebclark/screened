import type { MediaItem } from "@/generated/prisma";

export type RadarrListEntry = {
  tmdbId: number;
  title: string;
  year: number | null;
};

export function mediaItemsToRadarrJson(
  items: Pick<MediaItem, "tmdbId" | "title" | "year">[],
): RadarrListEntry[] {
  return items.map((item) => ({
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
  }));
}
