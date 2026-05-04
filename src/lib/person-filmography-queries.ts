import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";
import type { PersonFilmographyItem } from "@/types/person";

export interface GetPersonFilmographyResult {
  movies: PersonFilmographyItem[];
  tvShows: PersonFilmographyItem[];
  totalCount: number;
}

export async function getPersonFilmography(
  person: { name: string; tmdbId: number },
  userId: string,
): Promise<GetPersonFilmographyResult> {
  const { name: personName, tmdbId: personTmdbId } = person;

  const items = await prisma.$queryRaw<
    Array<{
      id: string;
      tmdbId: number;
      type: "MOVIE" | "TV";
      title: string;
      poster: string | null;
      releaseDate: Date | null;
      watchStatus: "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED" | null;
      userRating: number | null;
      role: "cast" | "director" | "creator";
    }>
  >(Prisma.sql`
    SELECT
      mi.id,
      mi."tmdbId",
      mi.type,
      mi.title,
      mi.poster,
      mi."releaseDate",
      ums.status as "watchStatus",
      ums.rating as "userRating",
      CASE
        WHEN mi."creatorTmdbId" = ${personTmdbId}
          OR (mi."creatorTmdbId" IS NULL AND mi."creatorName" = ${personName})
          OR (mi.type = 'TV' AND mi."creatorTmdbId" IS NULL AND mi."creatorName" IS NULL AND mi.director = ${personName})
          THEN 'creator'
        WHEN mi."directorTmdbId" = ${personTmdbId}
          OR mi."directorsTmdbIds" @> ARRAY[${personTmdbId}]::int[]
          OR (mi."directorTmdbId" IS NULL AND cardinality(mi."directorsTmdbIds") = 0 AND mi.director = ${personName})
          THEN 'director'
        ELSE 'cast'
      END as role
    FROM "MediaItem" mi
    LEFT JOIN "UserMediaStatus" ums
      ON ums."mediaItemId" = mi.id
      AND ums."userId" = ${userId}
    WHERE
      mi."castTmdbIds" @> ARRAY[${personTmdbId}]::int[]
      OR mi."directorTmdbId" = ${personTmdbId}
      OR mi."directorsTmdbIds" @> ARRAY[${personTmdbId}]::int[]
      OR mi."creatorTmdbId" = ${personTmdbId}
      OR (cardinality(mi."castTmdbIds") = 0 AND mi.cast @> ARRAY[${personName}]::text[])
      OR (mi."directorTmdbId" IS NULL AND cardinality(mi."directorsTmdbIds") = 0 AND mi.director = ${personName})
      OR (mi."creatorTmdbId" IS NULL AND mi."creatorName" = ${personName})
      OR (mi.type = 'TV' AND mi."creatorTmdbId" IS NULL AND mi."creatorName" IS NULL AND mi.director = ${personName})
    ORDER BY
      CASE WHEN mi.type = 'MOVIE' THEN 0 ELSE 1 END,
      mi."releaseDate" DESC NULLS LAST
  `);

  const movies = items
    .filter((i) => i.type === "MOVIE")
    .map((i) => ({
      tmdbId: i.tmdbId,
      type: i.type,
      title: i.title,
      poster: i.poster,
      releaseDate: i.releaseDate,
      watchStatus: i.watchStatus,
      userRating: i.userRating,
      role: i.role,
    }));

  const tvShows = items
    .filter((i) => i.type === "TV")
    .map((i) => ({
      tmdbId: i.tmdbId,
      type: i.type,
      title: i.title,
      poster: i.poster,
      releaseDate: i.releaseDate,
      watchStatus: i.watchStatus,
      userRating: i.userRating,
      role: i.role,
    }));

  return {
    movies,
    tvShows,
    totalCount: items.length,
  };
}
