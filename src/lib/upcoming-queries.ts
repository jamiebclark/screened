import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";

export type UpcomingItem = {
  tmdbId: number;
  type: "MOVIE" | "TV";
  title: string;
  poster: string | null;
  year: number | null;
  releaseDate: Date;
};

export type UpcomingWatchlistItems = {
  comingSoon: UpcomingItem[];
  justReleased: UpcomingItem[];
};

export async function getUpcomingWatchlistItems(
  userId: string,
): Promise<UpcomingWatchlistItems> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [comingSoonRows, justReleasedRows] = await Promise.all([
    prisma.userMediaStatus.findMany({
      where: {
        userId,
        status: "WATCHLIST",
        mediaItem: { releaseDate: { gt: now } },
      },
      select: {
        mediaItem: {
          select: {
            tmdbId: true,
            type: true,
            title: true,
            poster: true,
            year: true,
            releaseDate: true,
          },
        },
      },
      orderBy: { mediaItem: { releaseDate: "asc" } },
    }),
    prisma.userMediaStatus.findMany({
      where: {
        userId,
        status: "WATCHLIST",
        mediaItem: { releaseDate: { gte: thirtyDaysAgo, lte: now } },
      },
      select: {
        mediaItem: {
          select: {
            tmdbId: true,
            type: true,
            title: true,
            poster: true,
            year: true,
            releaseDate: true,
          },
        },
      },
      orderBy: { mediaItem: { releaseDate: "desc" } },
    }),
  ]);

  const toItem = (row: (typeof comingSoonRows)[number]): UpcomingItem => ({
    tmdbId: row.mediaItem.tmdbId,
    type: row.mediaItem.type as "MOVIE" | "TV",
    title: row.mediaItem.title,
    poster: row.mediaItem.poster,
    year: row.mediaItem.year,
    releaseDate: row.mediaItem.releaseDate!,
  });

  return {
    comingSoon: comingSoonRows.map(toItem),
    justReleased: justReleasedRows.map(toItem),
  };
}

export async function getListMembershipsForTmdbIds(
  userId: string,
  tmdbIds: number[],
): Promise<Set<number>> {
  if (tmdbIds.length === 0) return new Set();
  const rows = await prisma.listItem.findMany({
    where: {
      mediaItem: { tmdbId: { in: tmdbIds }, type: MediaType.MOVIE },
      list: { members: { some: { userId } } },
    },
    select: { mediaItem: { select: { tmdbId: true } } },
  });
  return new Set(rows.map((r) => r.mediaItem.tmdbId));
}
