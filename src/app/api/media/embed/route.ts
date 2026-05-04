import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMovie,
  getTvShow,
  getMovieCredits,
  getMovieKeywords,
  getTvCredits,
  getTvKeywords,
} from "@/lib/tmdb";
import {
  buildEmbeddingText,
  generateEmbedding,
  isEmbeddingEnabled,
} from "@/lib/embeddings";
import { MediaType } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { tmdbId?: number; type?: string };
  const { tmdbId, type } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;

  try {
    let mediaItem = await prisma.mediaItem.findUnique({
      where: { tmdbId_type: { tmdbId, type: mediaType } },
    });

    let cast: string[] = [];
    let director: string | null = null;
    let keywords: string[] = [];
    let title: string;
    let year: number | null = null;
    let overview: string | null = null;
    let genres: string[] = [];
    let runtime: number | null = null;

    if (!mediaItem) {
      if (type === "movie") {
        const [movie, credits, kws] = await Promise.all([
          getMovie(tmdbId),
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
        title = movie.title;
        year = movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null;
        overview = movie.overview;
        genres = movie.genres.map((g) => g.name);
        runtime = movie.runtime;
        cast = credits.cast;
        director = credits.director;
        keywords = kws;
        mediaItem = await prisma.mediaItem.create({
          data: {
            tmdbId,
            type: mediaType,
            title,
            poster: null,
            backdrop: null,
            year,
            overview,
            genres,
            runtime,
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
        const [show, credits, kws] = await Promise.all([
          getTvShow(tmdbId),
          getTvCredits(tmdbId).catch(() => ({
            cast: [] as string[],
            castTmdbIds: [] as number[],
            creatorName: null,
            creatorTmdbId: null,
          })),
          getTvKeywords(tmdbId).catch(() => [] as string[]),
        ]);
        title = show.name;
        year = show.first_air_date
          ? new Date(show.first_air_date).getFullYear()
          : null;
        overview = show.overview;
        genres = show.genres.map((g) => g.name);
        runtime = show.episode_run_time[0] ?? null;
        cast = credits.cast;
        keywords = kws;
        mediaItem = await prisma.mediaItem.create({
          data: {
            tmdbId,
            type: mediaType,
            title,
            poster: null,
            backdrop: null,
            year,
            overview,
            genres,
            runtime,
            cast,
            castTmdbIds: credits.castTmdbIds,
            creatorName: credits.creatorName,
            creatorTmdbId: credits.creatorTmdbId,
            keywords,
          },
        });
      }
    } else {
      // Fill in missing enrichment
      if (!mediaItem.cast.length || !mediaItem.keywords.length) {
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
          cast = credits.cast.length ? credits.cast : mediaItem.cast;
          director = credits.director ?? mediaItem.director;
          keywords = kws.length ? kws : mediaItem.keywords;
          mediaItem = await prisma.mediaItem.update({
            where: { id: mediaItem.id },
            data: {
              cast,
              castTmdbIds: credits.castTmdbIds.length
                ? credits.castTmdbIds
                : mediaItem.castTmdbIds,
              director,
              directorTmdbId:
                credits.directorTmdbId ?? mediaItem.directorTmdbId,
              directors: credits.directors.length
                ? credits.directors
                : mediaItem.directors,
              directorsTmdbIds: credits.directorsTmdbIds.length
                ? credits.directorsTmdbIds
                : mediaItem.directorsTmdbIds,
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
          cast = credits.cast.length ? credits.cast : mediaItem.cast;
          keywords = kws.length ? kws : mediaItem.keywords;
          mediaItem = await prisma.mediaItem.update({
            where: { id: mediaItem.id },
            data: {
              cast,
              castTmdbIds: credits.castTmdbIds.length
                ? credits.castTmdbIds
                : mediaItem.castTmdbIds,
              creatorName: credits.creatorName ?? mediaItem.creatorName,
              creatorTmdbId: credits.creatorTmdbId ?? mediaItem.creatorTmdbId,
              keywords,
            },
          });
        }
      } else {
        cast = mediaItem.cast;
        director = mediaItem.director;
        keywords = mediaItem.keywords;
      }
      title = mediaItem.title;
      year = mediaItem.year;
      overview = mediaItem.overview;
      genres = mediaItem.genres;
    }

    // Generate or refresh embedding
    let hasEmbedding = mediaItem.embedding.length > 0;
    if (!hasEmbedding && isEmbeddingEnabled()) {
      const text = buildEmbeddingText({
        title,
        year,
        overview,
        genres,
        cast,
        director,
        keywords,
      });
      const embedding = await generateEmbedding(text);
      if (embedding) {
        mediaItem = await prisma.mediaItem.update({
          where: { id: mediaItem.id },
          data: { embedding },
        });
        hasEmbedding = true;
      }
    }

    return NextResponse.json({
      id: mediaItem.id,
      tmdbId: mediaItem.tmdbId,
      title: mediaItem.title,
      poster: mediaItem.poster,
      year: mediaItem.year,
      genres: mediaItem.genres,
      cast: mediaItem.cast,
      director: mediaItem.director,
      keywords: mediaItem.keywords,
      hasEmbedding,
    });
  } catch (err) {
    console.error("[embed] error:", err);
    return NextResponse.json(
      { error: "Failed to process media item" },
      { status: 500 },
    );
  }
}
