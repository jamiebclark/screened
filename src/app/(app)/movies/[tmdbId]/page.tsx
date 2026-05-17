import { auth } from "@/lib/auth";
import {
  getMovie,
  getMovieCredits,
  getMovieSimilar,
  tmdbImage,
} from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WatchStatusButton } from "@/components/watch-status-button";
import { RatingStars } from "@/components/rating-stars";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { CreateWatchPartyDialog } from "@/components/create-watch-party-dialog";
import { WatchHistory } from "@/components/watch-history";
import { MovieScreenedContextAsync } from "@/components/movie-screened-context";
import {
  TitleSiteContext,
  TitleCatalogLinks,
  MovieScreenedContextSkeleton,
} from "@/components/movie-site-context-panel";
import { TitlePageMobilePoster } from "@/components/title-page-mobile-poster";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatRuntime } from "@/lib/utils";
import { buildMovieCatalogLinks } from "@/lib/movie-site-context";
import { getCachedOmdbRatings } from "@/lib/omdb";
import { AggregatedRatingsLine } from "@/components/aggregated-ratings-line";
import { Star, Calendar, Clock } from "lucide-react";
import { MediaType } from "@/generated/prisma";
import { parseDateOnlyIso } from "@/lib/history-calendar";
import { fetchTitleWatchHistoryForViewer } from "@/lib/watch-history-queries";
import { MediaCard } from "@/components/media-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TitleListsSection } from "@/components/title-lists-section";
import { StreamingProviders } from "@/components/streaming-providers";
import { PersonCastCrewSection } from "@/components/person-cast-crew-section";

type Params = {
  params: Promise<{ tmdbId: string }>;
  searchParams: Promise<{ watchedDate?: string; partyDate?: string }>;
};

export async function generateMetadata({ params }: Params) {
  const { tmdbId } = await params;
  const movie = await getMovie(parseInt(tmdbId)).catch(() => null);
  return { title: movie?.title };
}

export default async function MoviePage({ params, searchParams }: Params) {
  const { tmdbId: tmdbIdStr } = await params;
  const sp = await searchParams;
  const prefillLogDate = parseDateOnlyIso(sp.watchedDate);
  const prefillPartyDate = parseDateOnlyIso(sp.partyDate);
  const tmdbId = parseInt(tmdbIdStr);

  if (isNaN(tmdbId)) notFound();

  const session = await auth();

  const [movie, userStatus, titleWatchHistory, similar, credits] =
    await Promise.all([
      getMovie(tmdbId).catch(() => null),
      session?.user?.id
        ? prisma.userMediaStatus
            .findFirst({
              where: {
                userId: session.user.id,
                mediaItem: { tmdbId, type: MediaType.MOVIE },
              },
            })
            .catch(() => null)
        : null,
      session?.user?.id
        ? fetchTitleWatchHistoryForViewer(
            session.user.id,
            tmdbId,
            MediaType.MOVIE,
          ).catch(() => [])
        : [],
      getMovieSimilar(tmdbId)
        .then((r) => r.results.filter((m) => m.poster_path).slice(0, 10))
        .catch(() => []),
      getMovieCredits(tmdbId).catch(() => null),
    ]);

  if (!movie) notFound();

  const omdb = await getCachedOmdbRatings(movie.imdb_id);

  const backdropUrl = tmdbImage(movie.backdrop_path, "w1280");
  const posterUrl = tmdbImage(movie.poster_path, "w500");
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null;
  const catalogLinks = buildMovieCatalogLinks(tmdbId, movie.imdb_id);

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex flex-col sm:flex-row gap-6 -mt-24 relative z-10">
          {/* Poster + external links (desktop) */}
          <div className="hidden sm:flex flex-col shrink-0 w-36 md:w-48">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-2xl">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  width={192}
                  height={288}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground text-center p-2">
                  {movie.title}
                </div>
              )}
            </div>
            <div className="mt-4 w-full">
              <TitleCatalogLinks links={catalogLinks} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 sm:pt-16 min-w-0">
            <div className="flex gap-3 sm:gap-0">
              <TitlePageMobilePoster
                posterUrl={posterUrl}
                title={movie.title}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  {movie.genres.slice(0, 3).map((g) => (
                    <Link key={g.id} href={`/browse?genre=${g.id}&type=movie`}>
                      <Badge
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                      >
                        {g.name}
                      </Badge>
                    </Link>
                  ))}
                </div>

                <h1 className="text-2xl font-bold md:text-4xl md:tracking-tighter mb-2">
                  {movie.title}
                </h1>

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
                      <span className="text-xs">
                        ({movie.vote_count.toLocaleString()})
                      </span>
                    </span>
                  )}
                  <AggregatedRatingsLine
                    omdb={omdb}
                    imdbId={movie.imdb_id}
                    linkTitle={movie.title}
                    mediaType="movie"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
                  <WatchStatusButton
                    key={
                      userStatus
                        ? `${userStatus.id}-${userStatus.status}`
                        : `s-${tmdbId}-none`
                    }
                    tmdbId={tmdbId}
                    type="movie"
                    currentStatus={userStatus?.status ?? null}
                  />
                  <AddToListDialog
                    tmdbId={tmdbId}
                    type="movie"
                    title={movie.title}
                  />
                  <CreateWatchPartyDialog
                    tmdbId={tmdbId}
                    mediaType="MOVIE"
                    title={movie.title}
                    defaultScheduledFor={prefillPartyDate ?? undefined}
                  />
                  {userStatus && (
                    <RatingStars
                      tmdbId={tmdbId}
                      type="movie"
                      currentRating={userStatus?.rating ?? null}
                    />
                  )}
                </div>

                <div className="mb-3 sm:hidden">
                  <TitleCatalogLinks links={catalogLinks} />
                </div>

                {movie.overview && (
                  <p className="text-muted-foreground leading-relaxed max-w-2xl">
                    {movie.overview}
                  </p>
                )}

                <Suspense
                  fallback={
                    <div className="mt-3 flex items-center gap-1.5">
                      <Skeleton className="h-3 w-12 shrink-0" />
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-7 rounded-md" />
                      ))}
                    </div>
                  }
                >
                  <StreamingProviders tmdbId={tmdbId} type="movie" />
                </Suspense>

                {session?.user?.id ? (
                  <TitleSiteContext>
                    <Suspense fallback={<MovieScreenedContextSkeleton />}>
                      <MovieScreenedContextAsync
                        userId={session.user.id}
                        tmdbId={tmdbId}
                      />
                    </Suspense>
                  </TitleSiteContext>
                ) : null}
              </div>
            </div>

            {session?.user && (
              <WatchHistory
                key={titleWatchHistory.map((e) => e.id).join() || "no-entries"}
                tmdbId={tmdbId}
                type="movie"
                viewerUserId={session.user.id}
                initialEntries={titleWatchHistory.map((e) => ({
                  id: e.id,
                  userId: e.userId,
                  isViewer: e.isViewer,
                  watchedAt: e.watchedAt.toISOString(),
                  review: e.review,
                  rating: e.rating,
                  letterboxdActivityUrl: e.letterboxdActivityUrl,
                  user: e.user,
                }))}
                hasStatus={!!userStatus}
                prefillLogDate={prefillLogDate}
              />
            )}

            {credits &&
              (credits.cast.length > 0 || credits.directors.length > 0) && (
                <PersonCastCrewSection
                  cast={credits.cast}
                  castTmdbIds={credits.castTmdbIds}
                  directors={credits.directors}
                  directorsTmdbIds={credits.directorsTmdbIds}
                  creatorName={null}
                  creatorTmdbId={null}
                />
              )}
          </div>
        </div>

        <Suspense
          fallback={
            <div className="mt-8 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            </div>
          }
        >
          <TitleListsSection
            tmdbId={tmdbId}
            mediaType="movie"
            userId={session?.user?.id ?? null}
          />
        </Suspense>

        {similar.length > 0 && (
          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold">You might also like</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
              {similar.map((item) => (
                <MediaCard
                  key={item.id}
                  tmdbId={item.id}
                  type="movie"
                  title={item.title ?? item.name ?? ""}
                  poster={item.poster_path}
                  year={
                    item.release_date
                      ? new Date(item.release_date).getFullYear()
                      : null
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
