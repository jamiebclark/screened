import { auth } from "@/lib/auth";
import {
  getMovieGenres,
  getTvGenres,
  discoverMovies,
  discoverTv,
  getTrending,
} from "@/lib/tmdb";
import {
  getUserTmdbMediaStateByRef,
  tmdbRefKey,
} from "@/lib/tmdb-user-media-state";
import { listFriendUserIds } from "@/lib/friendship";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { MediaCard } from "@/components/media-card";
import { BrowseFilters } from "./browse-filters";
import Link from "next/link";
import { findGenreByName } from "@/lib/browse-utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Browse" };

interface BrowsePageProps {
  searchParams: Promise<{
    type?: string;
    genre?: string;
    genreName?: string;
    filter?: string;
    page?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const sp = await searchParams;

  const type = sp.type === "tv" ? "tv" : sp.type === "all" ? "all" : "movie";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const rawGenreId = parseInt(sp.genre ?? "") || null;
  const genreName = sp.genreName?.trim() || null;
  const filterParam =
    (["seen", "unseen", "library", "friends"] as const).find(
      (f) => f === sp.filter,
    ) ?? null;

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  // User filters only apply when logged in and browsing a specific type
  const activeFilter = isLoggedIn && type !== "all" ? filterParam : null;

  const genres =
    type === "all"
      ? []
      : type === "tv"
        ? await getTvGenres().catch(() => [])
        : await getMovieGenres().catch(() => []);

  let activeGenreId: number | null = rawGenreId;
  if (!activeGenreId && genreName && genres.length > 0) {
    activeGenreId = findGenreByName(genres, genreName);
  }

  type DiscoverResult = Awaited<
    ReturnType<typeof discoverMovies>
  >["results"][number];
  let results: DiscoverResult[] = [];
  let totalPages = 1;

  try {
    if (type === "all") {
      const data = await getTrending("all", "week");
      results = data.results;
    } else if (type === "tv") {
      const data = await discoverTv(activeGenreId ?? undefined, page);
      results = data.results;
      totalPages = Math.min(data.total_pages, 500);
    } else {
      const data = await discoverMovies(activeGenreId ?? undefined, page);
      results = data.results;
      totalPages = Math.min(data.total_pages, 500);
    }
  } catch {
    // TMDB unavailable — show empty state below
  }

  const tmdbUserStateByKey =
    results.length > 0 && session?.user?.id
      ? await getUserTmdbMediaStateByRef(
          session.user.id,
          results.map((r) => ({ tmdbId: r.id, type: r.media_type })),
        ).catch(() => new Map())
      : new Map();

  let filteredResults = results;

  if (activeFilter && session?.user?.id) {
    const userId = session.user.id;
    const mediaType = type === "tv" ? MediaType.TV : MediaType.MOVIE;
    const resultTmdbIds = results.map((r) => r.id);

    if (activeFilter === "seen" || activeFilter === "unseen") {
      const watched = await prisma.userMediaStatus.findMany({
        where: {
          userId,
          status: "WATCHED",
          mediaItem: { type: mediaType, tmdbId: { in: resultTmdbIds } },
        },
        select: { mediaItem: { select: { tmdbId: true } } },
      });
      const watchedIds = new Set(watched.map((w) => w.mediaItem.tmdbId));
      filteredResults = results.filter((r) =>
        activeFilter === "seen" ? watchedIds.has(r.id) : !watchedIds.has(r.id),
      );
    } else if (activeFilter === "library") {
      const inLibrary = await prisma.userMediaStatus.findMany({
        where: {
          userId,
          mediaItem: { type: mediaType, tmdbId: { in: resultTmdbIds } },
        },
        select: { mediaItem: { select: { tmdbId: true } } },
      });
      const libraryIds = new Set(inLibrary.map((w) => w.mediaItem.tmdbId));
      filteredResults = results.filter((r) => libraryIds.has(r.id));
    } else if (activeFilter === "friends") {
      const friendIds = await listFriendUserIds(userId);
      if (friendIds.length === 0) {
        filteredResults = [];
      } else {
        const friendItems = await prisma.userMediaStatus.findMany({
          where: {
            userId: { in: friendIds },
            mediaItem: { type: mediaType, tmdbId: { in: resultTmdbIds } },
          },
          select: { mediaItem: { select: { tmdbId: true } } },
        });
        const friendTmdbIds = new Set(
          friendItems.map((w) => w.mediaItem.tmdbId),
        );
        filteredResults = results.filter((r) => friendTmdbIds.has(r.id));
      }
    }
  }

  function buildPageUrl(pageNum: number): string {
    const params = new URLSearchParams();
    if (type !== "movie") params.set("type", type);
    if (activeGenreId) params.set("genre", String(activeGenreId));
    if (filterParam) params.set("filter", filterParam);
    if (pageNum > 1) params.set("page", String(pageNum));
    const q = params.toString();
    return q ? `/browse?${q}` : "/browse";
  }

  const noFriendsEmpty =
    activeFilter === "friends" &&
    filteredResults.length === 0 &&
    results.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Browse</h1>

      <BrowseFilters
        genres={genres}
        activeGenreId={activeGenreId}
        type={type}
        filter={activeFilter}
        isLoggedIn={isLoggedIn}
      />

      {filteredResults.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {noFriendsEmpty
              ? "None of your friends have tracked any of these titles yet."
              : "No results found. Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {filteredResults.map((item) => {
              const st = tmdbUserStateByKey.get(
                tmdbRefKey(item.media_type, item.id),
              );
              return (
                <MediaCard
                  key={`${item.media_type}-${item.id}`}
                  tmdbId={item.id}
                  type={item.media_type}
                  title={item.title ?? item.name ?? ""}
                  poster={item.poster_path}
                  year={
                    item.release_date
                      ? new Date(item.release_date).getFullYear()
                      : item.first_air_date
                        ? new Date(item.first_air_date).getFullYear()
                        : null
                  }
                  status={st?.status ?? null}
                  onList={st?.onList ?? false}
                />
              );
            })}
          </div>

          {type !== "all" && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="rounded-md bg-muted px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="rounded-md bg-muted px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
