import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMovie,
  getTvShow,
  getMovieCredits,
  getMovieKeywords,
  getTvCredits,
  getTvKeywords,
} from "@/lib/tmdb";
import { buildEmbeddingText, generateEmbedding } from "@/lib/embeddings";
import { MediaType } from "@/generated/prisma";

export const CURRENT_ENRICHMENT_VERSION = 1;

async function enrichAndEmbed(
  mediaItemId: string,
  tmdbId: number,
  type: "movie" | "tv",
) {
  try {
    let cast: string[] = [];
    let director: string | null = null;
    let keywords: string[] = [];

    if (type === "movie") {
      const [credits, kws] = await Promise.all([
        getMovieCredits(tmdbId).catch(() => ({
          cast: [] as string[],
          castTmdbIds: [] as number[],
          director: null,
          directorTmdbId: null,
          directors: [] as string[],
          directorsTmdbIds: [] as number[],
        })),
        getMovieKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      director = credits.director;
      keywords = kws;
      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: {
          cast,
          castTmdbIds: credits.castTmdbIds,
          director,
          directorTmdbId: credits.directorTmdbId,
          directors: credits.directors,
          directorsTmdbIds: credits.directorsTmdbIds,
          keywords,
        },
      });
    } else {
      const [credits, kws] = await Promise.all([
        getTvCredits(tmdbId).catch(() => ({
          cast: [] as string[],
          castTmdbIds: [] as number[],
          creatorName: null,
          creatorTmdbId: null,
        })),
        getTvKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      keywords = kws;
      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: {
          cast,
          castTmdbIds: credits.castTmdbIds,
          creatorName: credits.creatorName,
          creatorTmdbId: credits.creatorTmdbId,
          keywords,
        },
      });
    }

    const updated = await prisma.mediaItem.findUniqueOrThrow({
      where: { id: mediaItemId },
    });

    const text = buildEmbeddingText({
      title: updated.title,
      year: updated.year,
      overview: updated.overview,
      genres: updated.genres,
      cast,
      director,
      keywords,
    });

    const embedding = await generateEmbedding(text);
    await prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        ...(embedding ? { embedding } : {}),
        enrichmentVersion: CURRENT_ENRICHMENT_VERSION,
      },
    });
  } catch (err) {
    console.error("[enrichAndEmbed] failed for", mediaItemId, err);
  }
}

function isUnderEnriched(item: { enrichmentVersion: number }): boolean {
  return item.enrichmentVersion < CURRENT_ENRICHMENT_VERSION;
}

export async function getOrCreateMediaItem(
  tmdbId: number,
  type: "movie" | "tv",
) {
  const existing = await prisma.mediaItem.findUnique({
    where: {
      tmdbId_type: {
        tmdbId,
        type: type === "movie" ? MediaType.MOVIE : MediaType.TV,
      },
    },
  });
  if (existing) {
    if (isUnderEnriched(existing)) {
      after(() => enrichAndEmbed(existing.id, tmdbId, type));
    }
    return existing;
  }

  if (type === "movie") {
    const movie = await getMovie(tmdbId);
    const mediaItem = await prisma.mediaItem.create({
      data: {
        tmdbId,
        type: MediaType.MOVIE,
        title: movie.title,
        poster: movie.poster_path,
        backdrop: movie.backdrop_path,
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        overview: movie.overview,
        genres: movie.genres.map((g) => g.name),
        runtime: movie.runtime,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
      },
    });
    after(() => enrichAndEmbed(mediaItem.id, tmdbId, "movie"));
    return mediaItem;
  } else {
    const show = await getTvShow(tmdbId);
    const mediaItem = await prisma.mediaItem.create({
      data: {
        tmdbId,
        type: MediaType.TV,
        title: show.name,
        poster: show.poster_path,
        backdrop: show.backdrop_path,
        year: show.first_air_date
          ? new Date(show.first_air_date).getFullYear()
          : null,
        overview: show.overview,
        genres: show.genres.map((g) => g.name),
        runtime: show.episode_run_time[0] ?? null,
        releaseDate: show.first_air_date ? new Date(show.first_air_date) : null,
      },
    });
    after(() => enrichAndEmbed(mediaItem.id, tmdbId, "tv"));
    return mediaItem;
  }
}
