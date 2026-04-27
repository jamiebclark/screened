import { describe, expect, it } from "vitest";
import { MediaType } from "@/generated/prisma";
import { mergeWatchHistorySources } from "./watch-history-queries";

const media = {
  tmdbId: 1,
  type: MediaType.MOVIE,
  title: "Test",
  poster: null as string | null,
  year: 2020,
};

describe("mergeWatchHistorySources", () => {
  it("orders newest watchedAt first across movies and episodes", () => {
    const older = new Date("2020-01-01T12:00:00.000Z");
    const newer = new Date("2025-06-15T20:00:00.000Z");
    const merged = mergeWatchHistorySources(
      [
        {
          id: "we1",
          watchedAt: older,
          mediaItem: media,
        },
      ],
      [
        {
          id: "es:1",
          watchedAt: newer,
          mediaItem: { ...media, type: MediaType.TV },
          seasonNumber: 1,
          episodeNumber: 2,
        },
      ],
    );
    expect(merged[0]!.id).toBe("es:1");
    expect(merged[1]!.id).toBe("we1");
  });
});
