import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import Link from "next/link";
import Image from "next/image";
import { EditableListSearchAdd } from "@/components/editable-list-search-add";
import { Bookmark, CalendarDays, Film, Search } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { MediaType } from "@/generated/prisma";
import { ensureWatchlistRadarrToken } from "@/lib/ensure-watchlist-radarr-token";
import { WatchlistClient, type WatchlistItem } from "./watchlist-client";

const SORT_ORDERS = {
  added_desc: { createdAt: "desc" as const },
  title_asc: { mediaItem: { title: "asc" as const } },
  year_desc: { mediaItem: { year: "desc" as const } },
  year_asc: { mediaItem: { year: "asc" as const } },
  rating_desc: { rating: { sort: "desc" as const, nulls: "last" as const } },
  runtime_asc: {
    mediaItem: { runtime: { sort: "asc" as const, nulls: "last" as const } },
  },
  runtime_desc: {
    mediaItem: { runtime: { sort: "desc" as const, nulls: "last" as const } },
  },
} satisfies Record<string, object>;

type SortKey = keyof typeof SORT_ORDERS;

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

function formatReleaseDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 14) return `In ${diffDays} days`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

function posterUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage({ searchParams }: PageProps) {
  const session = await auth();
  const { sort: sortParam } = await searchParams;
  const sort: SortKey =
    sortParam && sortParam in SORT_ORDERS
      ? (sortParam as SortKey)
      : "added_desc";

  const now = new Date();

  const [rows, upcomingRows] = await Promise.all([
    prisma.userMediaStatus.findMany({
      where: { userId: session!.user.id, status: "WATCHLIST" },
      select: {
        id: true,
        status: true,
        rating: true,
        mediaItem: {
          select: {
            tmdbId: true,
            type: true,
            title: true,
            poster: true,
            year: true,
            genres: true,
            runtime: true,
          },
        },
      },
      orderBy: SORT_ORDERS[sort],
    }),
    prisma.$queryRaw<
      {
        tmdbId: number;
        type: string;
        title: string;
        poster: string | null;
        releaseDate: Date;
      }[]
    >(Prisma.sql`
      SELECT mi."tmdbId", mi.type::text, mi.title, mi.poster, mi."releaseDate"
      FROM "MediaItem" mi
      JOIN "UserMediaStatus" ums ON ums."mediaItemId" = mi.id
      WHERE ums."userId" = ${session!.user.id}
        AND ums.status = 'WATCHLIST'
        AND mi."releaseDate" > ${now}
      ORDER BY mi."releaseDate" ASC
      LIMIT 12
    `),
  ]);

  const movies = rows.filter((r) => r.mediaItem.type === MediaType.MOVIE);
  const radarrToken =
    movies.length > 0
      ? await ensureWatchlistRadarrToken(session!.user.id)
      : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const radarrUrl = radarrToken
    ? `${appUrl}/api/user/radarr/watchlist?token=${radarrToken}`
    : null;

  const existingKeys = rows.map(
    (r) =>
      `${r.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}-${r.mediaItem.tmdbId}`,
  );

  const availableGenres = [
    ...new Set(rows.flatMap((r) => r.mediaItem.genres)),
  ].sort();

  const items: WatchlistItem[] = rows.map((r) => ({
    id: r.id,
    status: "WATCHLIST",
    mediaItem: {
      tmdbId: r.mediaItem.tmdbId,
      type: r.mediaItem.type as "MOVIE" | "TV",
      title: r.mediaItem.title,
      poster: r.mediaItem.poster,
      year: r.mediaItem.year,
      genres: r.mediaItem.genres,
      runtime: r.mediaItem.runtime,
    },
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-status-watchlist">
          <Bookmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} title{rows.length !== 1 ? "s" : ""} saved
          </p>
        </div>
      </div>

      <EditableListSearchAdd variant="watchlist" existingKeys={existingKeys} />

      {/* Releasing soon */}
      {upcomingRows.length > 0 && (
        <section>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Releasing soon
          </h3>
          <div className="space-y-1">
            {upcomingRows.map((mediaItem) => {
              const type = mediaItem.type === MediaType.MOVIE ? "movie" : "tv";
              const href = `/${type === "movie" ? "movies" : "tv"}/${mediaItem.tmdbId}`;
              const thumb = posterUrl(mediaItem.poster);
              return (
                <Link
                  key={mediaItem.tmdbId}
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={mediaItem.title}
                      width={28}
                      height={42}
                      className="rounded object-cover shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-7 h-10 rounded bg-muted shrink-0" />
                  )}
                  <span className="flex-1 text-sm font-medium truncate">
                    {mediaItem.title}
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {formatReleaseDate(mediaItem.releaseDate!)}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-2">
            <Link
              href="/upcoming"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              See all upcoming →
            </Link>
          </div>
        </section>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0">
          {rows.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl max-w-sm mx-auto">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Your watchlist is empty</p>
              <p className="text-sm text-muted-foreground mb-5">
                Search for a movie or show to get started.
              </p>
              <Button size="sm" asChild>
                <Link href="/search">
                  <Search className="h-4 w-4" />
                  Search titles
                </Link>
              </Button>
            </div>
          ) : (
            <WatchlistClient
              items={items}
              availableGenres={availableGenres}
              sort={sort}
            />
          )}
        </div>

        {movies.length > 0 && radarrUrl && (
          <div className="lg:w-72 shrink-0 space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                <Film className="h-4 w-4 text-primary" />
                Radarr import URL
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Add this URL as a &quot;Custom List&quot; in Radarr to
                auto-import movies from your watchlist.
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="text-xs bg-muted px-2 py-1 rounded font-mono break-all block flex-1 min-w-0"
                  data-testid="watchlist-radarr-url"
                >
                  {radarrUrl}
                </code>
                <CopyButton text={radarrUrl} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
