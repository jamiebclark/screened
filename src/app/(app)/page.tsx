import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getTrending } from "@/lib/tmdb";
import { getUserTmdbMediaStateForTmdbIds } from "@/lib/tmdb-user-media-state";
import { fetchHomeRecentWatchedTitles } from "@/lib/watch-history-queries";
import { MediaCard } from "@/components/media-card";
import { Eye, Clock, Bookmark, ListVideo, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaType, WatchStatus } from "@/generated/prisma";

export default async function HomePage() {
  const session = await auth();

  const [trending, recentMediaIdsOrdered, stats] = await Promise.all([
    getTrending("all", "week").catch(() => ({ results: [] })),
    fetchHomeRecentWatchedTitles(session!.user.id, {
      titleLimit: 10,
      fetchPerSource: 80,
    }),
    prisma.userMediaStatus.groupBy({
      by: ["status"],
      where: { userId: session!.user.id },
      _count: true,
    }),
  ]);

  const trendingMovies = trending.results
    .filter((r) => r.media_type === "movie")
    .slice(0, 10);
  const trendingTv = trending.results
    .filter((r) => r.media_type === "tv")
    .slice(0, 10);

  const [
    recentMediaRows,
    statusRows,
    trendingMovieTmdbState,
    trendingTvTmdbState,
  ] = await Promise.all([
    recentMediaIdsOrdered.length > 0
      ? prisma.mediaItem.findMany({
          where: { id: { in: recentMediaIdsOrdered } },
        })
      : [],
    recentMediaIdsOrdered.length > 0
      ? prisma.userMediaStatus.findMany({
          where: {
            userId: session!.user.id,
            mediaItemId: { in: recentMediaIdsOrdered },
          },
        })
      : [],
    getUserTmdbMediaStateForTmdbIds(
      session!.user.id,
      "movie",
      trendingMovies.map((m) => m.id),
    ),
    getUserTmdbMediaStateForTmdbIds(
      session!.user.id,
      "tv",
      trendingTv.map((t) => t.id),
    ),
  ]);

  const mediaById = new Map(recentMediaRows.map((m) => [m.id, m]));
  const recentByLastWatch = recentMediaIdsOrdered
    .map((id) => {
      const m = mediaById.get(id);
      return m ? { mediaItem: m, mediaItemId: m.id } : null;
    })
    .filter(Boolean) as {
    mediaItem: (typeof recentMediaRows)[0];
    mediaItemId: string;
  }[];

  const statusByMediaId = new Map(statusRows.map((s) => [s.mediaItemId, s]));

  const recentActivity = recentByLastWatch.map((entry) => ({
    key: entry.mediaItem.id,
    mediaItem: entry.mediaItem,
    status:
      statusByMediaId.get(entry.mediaItemId)?.status ?? WatchStatus.WATCHED,
  }));

  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  const statusIcons = {
    WATCHED: {
      icon: Eye,
      label: "Watched",
      color: "text-status-watched",
      href: "/history",
    },
    WATCHING: {
      icon: Clock,
      label: "Watching",
      color: "text-status-watching",
      href: "/watching",
    },
    WATCHLIST: {
      icon: Bookmark,
      label: "Watchlist",
      color: "text-status-watchlist",
      href: "/watchlist",
    },
    DROPPED: {
      icon: Star,
      label: "Dropped",
      color: "text-muted-foreground",
      href: "/dropped",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-16">
      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["WATCHED", "WATCHING", "WATCHLIST", "DROPPED"] as const).map(
            (status) => {
              const { icon: Icon, label, color, href } = statusIcons[status];
              return (
                <Link
                  key={status}
                  href={href}
                  className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={`rounded-full bg-muted p-3 self-start ${color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-4xl font-bold leading-none">
                      {statMap[status] ?? 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {label}
                    </p>
                  </div>
                </Link>
              );
            },
          )}
        </div>
      </section>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Recently watched</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/history">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
            {recentActivity.map((activity, index) => (
              <MediaCard
                key={activity.key}
                tmdbId={activity.mediaItem.tmdbId}
                type={
                  activity.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"
                }
                title={activity.mediaItem.title}
                poster={activity.mediaItem.poster}
                year={activity.mediaItem.year}
                status={activity.status}
                priority={index < 3}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Movies */}
      {trendingMovies.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Trending movies</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search?type=movie">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
            {trendingMovies.map((movie, index) => {
              const st = trendingMovieTmdbState.get(movie.id);
              return (
                <MediaCard
                  key={movie.id}
                  tmdbId={movie.id}
                  type="movie"
                  title={movie.title ?? movie.name ?? ""}
                  poster={movie.poster_path}
                  year={
                    movie.release_date
                      ? new Date(movie.release_date).getFullYear()
                      : null
                  }
                  status={st?.status ?? null}
                  onList={st?.onList ?? false}
                  priority={index < 3}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Trending TV */}
      {trendingTv.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Trending TV shows</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search?type=tv">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
            {trendingTv.map((show) => {
              const st = trendingTvTmdbState.get(show.id);
              return (
                <MediaCard
                  key={show.id}
                  tmdbId={show.id}
                  type="tv"
                  title={show.name ?? show.title ?? ""}
                  poster={show.poster_path}
                  year={
                    show.first_air_date
                      ? new Date(show.first_air_date).getFullYear()
                      : null
                  }
                  status={st?.status ?? null}
                  onList={st?.onList ?? false}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Quick actions if empty state */}
      {recentActivity.length === 0 && (
        <div className="text-center py-12">
          <ListVideo className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Start tracking</h3>
          <p className="text-muted-foreground mb-6">
            Search for movies and TV shows to add to your watchlist
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href="/search">Search movies</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/lists/new">Create a list</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
