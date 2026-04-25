import { auth } from "@/lib/auth";
import { getTvShow, getTvSeason, tmdbImage } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";
import { WatchStatusButton } from "@/components/watch-status-button";
import { RatingStars } from "@/components/rating-stars";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { EpisodeTracker } from "@/components/episode-tracker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Calendar, Tv } from "lucide-react";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ tmdbId: string }> };

export async function generateMetadata({ params }: Params) {
  const { tmdbId } = await params;
  const show = await getTvShow(parseInt(tmdbId)).catch(() => null);
  return { title: show ? `${show.name} | Screened` : "Screened" };
}

export default async function TvPage({ params }: Params) {
  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);

  if (isNaN(tmdbId)) notFound();

  const session = await auth();

  const [show, userStatus] = await Promise.all([
    getTvShow(tmdbId).catch(() => null),
    session?.user?.id
      ? prisma.userMediaStatus
          .findFirst({
            where: {
              userId: session.user.id,
              mediaItem: { tmdbId, type: MediaType.TV },
            },
          })
          .catch(() => null)
      : null,
  ]);

  if (!show) notFound();

  const realSeasons = show.seasons.filter((s) => s.season_number > 0);

  const [seasonDetails, watchedEpisodes] = await Promise.all([
    Promise.all(
      realSeasons.slice(0, 5).map((s) =>
        getTvSeason(tmdbId, s.season_number).catch(() => ({
          ...s,
          episodes: [],
        }))
      )
    ),
    session?.user?.id
      ? prisma.episodeStatus
          .findMany({
            where: {
              userId: session.user.id,
              mediaItem: { tmdbId, type: MediaType.TV },
            },
            select: { seasonNumber: true, episodeNumber: true },
          })
          .catch(() => [])
      : [],
  ]);

  const backdropUrl = tmdbImage(show.backdrop_path, "w1280");
  const posterUrl = tmdbImage(show.poster_path, "w500");
  const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;

  return (
    <div className="min-h-screen">
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
        {backdropUrl ? (
          <Image src={backdropUrl} alt={show.name} fill className="object-cover" priority />
        ) : (
          <div className="h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex gap-6 -mt-24 relative z-10">
          <div className="hidden sm:block shrink-0">
            <div className="w-36 md:w-48 aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-2xl">
              {posterUrl ? (
                <Image src={posterUrl} alt={show.name} width={192} height={288} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground text-center p-2">
                  {show.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 pt-2 sm:pt-16 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-2">
              {show.genres.slice(0, 3).map((g) => (
                <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
              ))}
            </div>

            <h1 className="text-2xl md:text-4xl font-bold mb-2">{show.name}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              {year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {year}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Tv className="h-3.5 w-3.5" />
                {show.number_of_seasons} season{show.number_of_seasons !== 1 ? "s" : ""} · {show.number_of_episodes} episodes
              </span>
              {show.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {show.vote_average.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <WatchStatusButton tmdbId={tmdbId} type="tv" currentStatus={userStatus?.status ?? null} />
              <AddToListDialog tmdbId={tmdbId} type="tv" title={show.name} />
              {userStatus && (
                <RatingStars tmdbId={tmdbId} type="tv" currentRating={userStatus?.rating ?? null} />
              )}
            </div>

            {show.overview && (
              <p className="text-muted-foreground leading-relaxed max-w-2xl">{show.overview}</p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Tabs defaultValue="episodes">
            <TabsList>
              <TabsTrigger value="episodes">Episodes</TabsTrigger>
            </TabsList>
            <TabsContent value="episodes" className="mt-4">
              {seasonDetails.length > 0 ? (
                <EpisodeTracker
                  tmdbId={tmdbId}
                  seasons={seasonDetails.map((s) => ({
                    season_number: s.season_number,
                    name: s.name,
                    episode_count: s.episode_count,
                    episodes: "episodes" in s ? s.episodes : [],
                  }))}
                  watchedEpisodes={watchedEpisodes}
                />
              ) : (
                <p className="text-muted-foreground text-sm">No episode data available.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
