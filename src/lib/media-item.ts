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
          director: null,
          directors: [] as string[],
        })),
        getMovieKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      director = credits.director;
      keywords = kws;
    } else {
      const [credits, kws] = await Promise.all([
        getTvCredits(tmdbId).catch(() => ({
          cast: [] as string[],
          director: null,
        })),
        getTvKeywords(tmdbId).catch(() => [] as string[]),
      ]);
      cast = credits.cast;
      director = credits.director;
      keywords = kws;
    }

    const updated = await prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: { cast, director, keywords },
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
    if (embedding) {
      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { embedding },
      });
    }
  } catch (err) {
    console.error("[enrichAndEmbed] failed for", mediaItemId, err);
  }
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
  if (existing) return existing;

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
