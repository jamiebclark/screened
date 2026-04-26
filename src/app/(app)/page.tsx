import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { getTrending } from "@/lib/tmdb";
import { MediaCard } from "@/components/media-card";
import { tmdbImageUrl, formatRuntime } from "@/lib/utils";
import { Eye, Clock, Bookmark, ListVideo, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaType } from "@/generated/prisma";

export default async function HomePage() {
  const session = await auth();

  const [trending, recentActivity, stats] = await Promise.all([
    getTrending("all", "week").catch(() => ({ results: [] })),
    prisma.userMediaStatus.findMany({
      where: { userId: session!.user.id },
      include: { mediaItem: true },
      orderBy: [
        { watchedAt: { sort: "desc", nulls: "last" } },
        { updatedAt: "desc" },
      ],
      take: 10,
    }),
    prisma.userMediaStatus.groupBy({
      by: ["status"],
      where: { userId: session!.user.id },
      _count: true,
    }),
  ]);

  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  const trendingMovies = trending.results
    .filter((r) => r.media_type === "movie")
    .slice(0, 10);

  const trendingTv = trending.results
    .filter((r) => r.media_type === "tv")
    .slice(0, 10);

  const statusIcons = {
    WATCHED: { icon: Eye, label: "Watched", color: "text-green-400" },
    WATCHING: { icon: Clock, label: "Watching", color: "text-yellow-400" },
    WATCHLIST: { icon: Bookmark, label: "Watchlist", color: "text-blue-400" },
    DROPPED: { icon: Star, label: "Dropped", color: "text-muted-foreground" },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["WATCHED", "WATCHING", "WATCHLIST", "DROPPED"] as const).map((status) => {
            const { icon: Icon, label, color } = statusIcons[status];
            return (
              <div key={status} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className={`rounded-full bg-muted p-2 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statMap[status] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recently watched</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/history">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
            {recentActivity.map((activity) => (
              <MediaCard
                key={activity.id}
                tmdbId={activity.mediaItem.tmdbId}
                type={activity.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}
                title={activity.mediaItem.title}
                poster={activity.mediaItem.poster}
                year={activity.mediaItem.year}
                status={activity.status}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Movies */}
      {trendingMovies.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Trending movies</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search?type=movie">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
            {trendingMovies.map((movie) => (
              <MediaCard
                key={movie.id}
                tmdbId={movie.id}
                type="movie"
                title={movie.title ?? movie.name ?? ""}
                poster={movie.poster_path}
                year={movie.release_date ? new Date(movie.release_date).getFullYear() : null}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending TV */}
      {trendingTv.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Trending TV shows</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search?type=tv">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
            {trendingTv.map((show) => (
              <MediaCard
                key={show.id}
                tmdbId={show.id}
                type="tv"
                title={show.name ?? show.title ?? ""}
                poster={show.poster_path}
                year={show.first_air_date ? new Date(show.first_air_date).getFullYear() : null}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick actions if empty state */}
      {recentActivity.length === 0 && (
        <div className="text-center py-12">
          <ListVideo className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Start tracking</h3>
          <p className="text-muted-foreground mb-6">Search for movies and TV shows to add to your watchlist</p>
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
