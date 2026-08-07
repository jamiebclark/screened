import type { MediaItem } from "@/generated/prisma";

/**
 * Shape consumed by Radarr's "Custom Lists" import (ImportListType.Advanced).
 *
 * Radarr deserializes the response into its TMDB `MovieResultResource` and
 * keeps only entries where `id > 0`, using that id as the TMDB id. `id` is
 * therefore the one required field — a payload without it parses to zero
 * movies and Radarr reports that it found no results. `title` and `year` are
 * ignored by Radarr and included only to keep the raw JSON readable.
 */
export type RadarrListEntry = {
  id: number;
  title: string;
  year: number | null;
  adult: boolean;
};

export function mediaItemsToRadarrJson(
  items: Pick<MediaItem, "tmdbId" | "title" | "year">[],
): RadarrListEntry[] {
  return items
    .filter((item) => item.tmdbId > 0)
    .map((item) => ({
      id: item.tmdbId,
      title: item.title,
      year: item.year,
      adult: false,
    }));
}
