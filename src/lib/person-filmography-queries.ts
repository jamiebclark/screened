import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";
import type { PersonFilmographyItem } from "@/types/person";

export interface GetPersonFilmographyResult {
  movies: PersonFilmographyItem[];
  tvShows: PersonFilmographyItem[];
  totalCount: number;
}

export async function getPersonFilmography(
  personName: string,
  userId: string,
): Promise<GetPersonFilmographyResult> {
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
      role: "cast" | "director";
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
        WHEN mi.cast @> ARRAY[${personName}]::text[] THEN 'cast'::text
        WHEN mi.director = ${personName} THEN 'director'::text
        ELSE 'cast'::text
      END as role
    FROM "MediaItem" mi
    LEFT JOIN "UserMediaStatus" ums 
      ON ums."mediaItemId" = mi.id 
      AND ums."userId" = ${userId}
    WHERE mi.cast @> ARRAY[${personName}]::text[]
       OR mi.director = ${personName}
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
      role: i.role as "cast" | "director",
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
      role: i.role as "cast" | "director",
    }));

  return {
    movies,
    tvShows,
    totalCount: items.length,
  };
}
