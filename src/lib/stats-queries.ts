import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export interface StatsSummary {
  uniqueMovies: number;
  totalRuntimeMinutes: number;
  episodeCount: number;
  avgRating: number | null;
  ratedCount: number;
}

export interface GenreStat {
  genre: string;
  count: number;
}

export interface DecadeStat {
  decade: number;
  count: number;
}

export interface RatingStat {
  rating: number;
  count: number;
}

export interface MonthlyStat {
  month: string; // YYYY-MM
  count: number;
}

export interface PersonStat {
  name: string;
  count: number;
}

export interface UserStats {
  summary: StatsSummary;
  ratings: RatingStat[];
  genres: GenreStat[];
  decades: DecadeStat[];
  monthlyActivity: MonthlyStat[];
  topDirectors: PersonStat[];
  topCast: PersonStat[];
}

type RawCount = { count: number | bigint };
type RawMovieStats = {
  unique_movies: number | bigint;
  total_runtime: number | bigint;
};
type RawRating = { rating: number; count: number | bigint };
type RawGenre = { genre: string; count: number | bigint };
type RawDecade = { decade: number | bigint; count: number | bigint };
type RawMonth = { month: Date; count: number | bigint };
type RawDirector = { director: string; count: number | bigint };
type RawActor = { actor: string; count: number | bigint };
type RawAvg = { avg_rating: number | null; rated_count: number | bigint };

export async function getUserStats(userId: string): Promise<UserStats> {
  const [
    movieStats,
    episodeCountRows,
    ratingRows,
    genreRows,
    decadeRows,
    monthlyRows,
    directorRows,
    castRows,
    avgRows,
  ] = await Promise.all([
    prisma.$queryRaw<RawMovieStats[]>(Prisma.sql`
      SELECT
        COUNT(DISTINCT we."mediaItemId")::int AS unique_movies,
        COALESCE(SUM(mi.runtime), 0)::int AS total_runtime
      FROM "WatchEntry" we
      JOIN "MediaItem" mi ON we."mediaItemId" = mi.id
      WHERE we."userId" = ${userId}
        AND mi.type = 'MOVIE'
    `),

    prisma.$queryRaw<RawCount[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "EpisodeStatus"
      WHERE "userId" = ${userId} AND "isWatched" = true
    `),

    prisma.$queryRaw<RawRating[]>(Prisma.sql`
      SELECT rating::float, COUNT(*)::int AS count
      FROM "UserMediaStatus"
      WHERE "userId" = ${userId} AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating
    `),

    prisma.$queryRaw<RawGenre[]>(Prisma.sql`
      SELECT genre, COUNT(DISTINCT we."mediaItemId")::int AS count
      FROM "WatchEntry" we
      JOIN "MediaItem" mi ON we."mediaItemId" = mi.id
      CROSS JOIN LATERAL unnest(mi.genres) AS genre
      WHERE we."userId" = ${userId}
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 12
    `),

    prisma.$queryRaw<RawDecade[]>(Prisma.sql`
      SELECT (mi.year / 10) * 10 AS decade, COUNT(DISTINCT we."mediaItemId")::int AS count
      FROM "WatchEntry" we
      JOIN "MediaItem" mi ON we."mediaItemId" = mi.id
      WHERE we."userId" = ${userId}
        AND mi.year IS NOT NULL
        AND mi.year > 1800
      GROUP BY decade
      ORDER BY decade
    `),

    prisma.$queryRaw<RawMonth[]>(Prisma.sql`
      SELECT DATE_TRUNC('month', we."watchedAt") AS month, COUNT(*)::int AS count
      FROM "WatchEntry" we
      WHERE we."userId" = ${userId}
        AND we."watchedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `),

    prisma.$queryRaw<RawDirector[]>(Prisma.sql`
      SELECT d.director, COUNT(DISTINCT we."mediaItemId")::int AS count
      FROM "WatchEntry" we
      JOIN "MediaItem" mi ON we."mediaItemId" = mi.id
      CROSS JOIN LATERAL unnest(
        CASE
          WHEN array_length(mi.directors, 1) > 0 THEN mi.directors
          WHEN mi.director IS NOT NULL AND mi.director != '' THEN ARRAY[mi.director]
          ELSE ARRAY[]::text[]
        END
      ) AS d(director)
      WHERE we."userId" = ${userId}
        AND d.director != ''
      GROUP BY d.director
      ORDER BY count DESC
      LIMIT 10
    `),

    prisma.$queryRaw<RawActor[]>(Prisma.sql`
      SELECT actor, COUNT(DISTINCT we."mediaItemId")::int AS count
      FROM "WatchEntry" we
      JOIN "MediaItem" mi ON we."mediaItemId" = mi.id
      CROSS JOIN LATERAL unnest(mi.cast) AS actor
      WHERE we."userId" = ${userId}
      GROUP BY actor
      ORDER BY count DESC
      LIMIT 10
    `),

    prisma.$queryRaw<RawAvg[]>(Prisma.sql`
      SELECT
        ROUND(AVG(rating)::numeric, 1)::float AS avg_rating,
        COUNT(*)::int AS rated_count
      FROM "UserMediaStatus"
      WHERE "userId" = ${userId} AND rating IS NOT NULL
    `),
  ]);

  // Fill monthly activity gaps so every month in the last 12 has an entry
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthMap = new Map<string, number>();
  for (const row of monthlyRows) {
    const d = new Date(row.month);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, Number(row.count));
  }
  const monthlyActivity: MonthlyStat[] = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    monthlyActivity.push({ month: key, count: monthMap.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const movie = movieStats[0];
  const avgRow = avgRows[0];

  return {
    summary: {
      uniqueMovies: Number(movie?.unique_movies ?? 0),
      totalRuntimeMinutes: Number(movie?.total_runtime ?? 0),
      episodeCount: Number(episodeCountRows[0]?.count ?? 0),
      avgRating: avgRow?.avg_rating ?? null,
      ratedCount: Number(avgRow?.rated_count ?? 0),
    },
    ratings: ratingRows.map((r) => ({
      rating: Number(r.rating),
      count: Number(r.count),
    })),
    genres: genreRows.map((g) => ({ genre: g.genre, count: Number(g.count) })),
    decades: decadeRows.map((d) => ({
      decade: Number(d.decade),
      count: Number(d.count),
    })),
    monthlyActivity,
    topDirectors: directorRows.map((d) => ({
      name: d.director,
      count: Number(d.count),
    })),
    topCast: castRows.map((c) => ({ name: c.actor, count: Number(c.count) })),
  };
}
