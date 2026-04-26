import { auth } from "@/lib/auth";
import { getMovie, tmdbImage } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";
import { WatchStatusButton } from "@/components/watch-status-button";
import { RatingStars } from "@/components/rating-stars";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { WatchHistory } from "@/components/watch-history";
import { Badge } from "@/components/ui/badge";
import { formatRuntime } from "@/lib/utils";
import { Star, Calendar, Clock } from "lucide-react";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ tmdbId: string }> };

export async function generateMetadata({ params }: Params) {
  const { tmdbId } = await params;
  const movie = await getMovie(parseInt(tmdbId)).catch(() => null);
  return { title: movie ? `${movie.title} | Screened` : "Screened" };
}

export default async function MoviePage({ params }: Params) {
  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);

  if (isNaN(tmdbId)) notFound();

  const session = await auth();

  const [movie, userStatus, watchEntries] = await Promise.all([
    getMovie(tmdbId).catch(() => null),
    session?.user?.id
      ? prisma.userMediaStatus
          .findFirst({
            where: { userId: session.user.id, mediaItem: { tmdbId, type: MediaType.MOVIE } },
          })
          .catch(() => null)
      : null,
    session?.user?.id
      ? prisma.watchEntry
          .findMany({
            where: { userId: session.user.id, mediaItem: { tmdbId, type: MediaType.MOVIE } },
            orderBy: { watchedAt: "desc" },
          })
          .catch(() => [])
      : [],
  ]);

  if (!movie) notFound();

  const backdropUrl = tmdbImage(movie.backdrop_path, "w1280");
  const posterUrl = tmdbImage(movie.poster_path, "w500");
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
        {backdropUrl ? (
          <Image src={backdropUrl} alt={movie.title} fill className="object-cover" priority />
        ) : (
          <div className="h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex gap-6 -mt-24 relative z-10">
          {/* Poster */}
          <div className="hidden sm:block shrink-0">
            <div className="w-36 md:w-48 aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-2xl">
              {posterUrl ? (
                <Image src={posterUrl} alt={movie.title} width={192} height={288} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground text-center p-2">
                  {movie.title}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 sm:pt-16 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-2">
              {movie.genres.slice(0, 3).map((g) => (
                <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
              ))}
            </div>

            <h1 className="text-2xl md:text-4xl font-bold mb-2">{movie.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              {year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {year}
                </span>
              )}
              {movie.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {movie.vote_average.toFixed(1)}
                  <span className="text-xs">({movie.vote_count.toLocaleString()})</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <WatchStatusButton tmdbId={tmdbId} type="movie" currentStatus={userStatus?.status ?? null} />
              <AddToListDialog tmdbId={tmdbId} type="movie" title={movie.title} />
              {userStatus && (
                <RatingStars tmdbId={tmdbId} type="movie" currentRating={userStatus?.rating ?? null} />
              )}
            </div>

            {movie.overview && (
              <p className="text-muted-foreground leading-relaxed max-w-2xl">{movie.overview}</p>
            )}

            {session?.user && (
              <WatchHistory
                tmdbId={tmdbId}
                type="movie"
                initialEntries={watchEntries.map((e) => ({
                  id: e.id,
                  watchedAt: e.watchedAt.toISOString(),
                  review: e.review,
                  rating: e.rating,
                }))}
                hasStatus={!!userStatus}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
