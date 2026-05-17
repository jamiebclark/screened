import { auth } from "@/lib/auth";
import {
  getMovieGenres,
  getTvGenres,
  discoverMovies,
  discoverTv,
  getTrending,
  type TmdbSearchResult,
} from "@/lib/tmdb";
import {
  getUserTmdbMediaStateByRef,
  tmdbRefKey,
  type TmdbUserMediaState,
} from "@/lib/tmdb-user-media-state";
import { listFriendUserIds } from "@/lib/friendship";
import { prisma } from "@/lib/prisma";
import { MediaType, WatchStatus } from "@/generated/prisma";
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

const PAGE_SIZE = 20;

/** Maps a stored MediaItem row into the shape the render section expects. */
function dbItemToResult(
  item: {
    tmdbId: number;
    title: string;
    poster: string | null;
    year: number | null;
  },
  mediaType: "movie" | "tv",
): TmdbSearchResult {
  const yearStr = item.year ? `${item.year}-01-01` : undefined;
  return {
    id: item.tmdbId,
    media_type: mediaType,
    title: mediaType === "movie" ? item.title : undefined,
    name: mediaType === "tv" ? item.title : undefined,
    overview: "",
    poster_path: item.poster,
    backdrop_path: null,
    vote_average: 0,
    release_date: mediaType === "movie" ? yearStr : undefined,
    first_air_date: mediaType === "tv" ? yearStr : undefined,
  };
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

  // Genre name needed for DB string-array filtering (MediaItem.genres is String[])
  const activeGenreName =
    activeGenreId && genres.length > 0
      ? (genres.find((g) => g.id === activeGenreId)?.name ?? null)
      : null;

  let results: TmdbSearchResult[] = [];
  let totalPages = 1;
  // Pre-built state map for DB-first paths (library/seen); avoids a second DB round-trip.
  let directStateMap: Map<string, TmdbUserMediaState> | null = null;

  // DB-first: library/seen/friends queries span the whole DB so genre+filter combos work
  // correctly regardless of which TMDB page we happen to be on.
  // TMDB-first: unseen and unfiltered browsing — TMDB discover is the base dataset.
  const useDbFirst =
    !!session?.user?.id &&
    type !== "all" &&
    (activeFilter === "library" ||
      activeFilter === "seen" ||
      activeFilter === "friends");

  if (useDbFirst && session?.user?.id) {
    const userId = session.user.id;
    const mediaType = type === "tv" ? MediaType.TV : MediaType.MOVIE;
    const mediaItemWhere = {
      type: mediaType,
      ...(activeGenreName ? { genres: { has: activeGenreName } } : {}),
    };
    const itemSelect = {
      tmdbId: true,
      title: true,
      poster: true,
      year: true,
    } as const;
    const mt = type as "movie" | "tv";

    if (activeFilter === "library") {
      const [rows, total] = await Promise.all([
        prisma.userMediaStatus.findMany({
          where: { userId, mediaItem: mediaItemWhere },
          select: { status: true, mediaItem: { select: itemSelect } },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.userMediaStatus.count({
          where: { userId, mediaItem: mediaItemWhere },
        }),
      ]);
      totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      results = rows.map(({ mediaItem }) => dbItemToResult(mediaItem, mt));
      directStateMap = new Map(
        rows.map(({ mediaItem, status }) => [
          tmdbRefKey(mt, mediaItem.tmdbId),
          { status: status as WatchStatus | null, onList: false },
        ]),
      );
    } else if (activeFilter === "seen") {
      const [rows, total] = await Promise.all([
        prisma.userMediaStatus.findMany({
          where: { userId, status: "WATCHED", mediaItem: mediaItemWhere },
          select: { status: true, mediaItem: { select: itemSelect } },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.userMediaStatus.count({
          where: { userId, status: "WATCHED", mediaItem: mediaItemWhere },
        }),
      ]);
      totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      results = rows.map(({ mediaItem }) => dbItemToResult(mediaItem, mt));
      directStateMap = new Map(
        rows.map(({ mediaItem, status }) => [
          tmdbRefKey(mt, mediaItem.tmdbId),
          { status: status as WatchStatus | null, onList: false },
        ]),
      );
    } else if (activeFilter === "friends") {
      const friendIds = await listFriendUserIds(userId);
      if (friendIds.length > 0) {
        // Fetch all matching friend items then de-duplicate in JS (groupBy doesn't support
        // relation filters in Prisma; friends' libraries are small enough for this).
        const allRows = await prisma.userMediaStatus.findMany({
          where: { userId: { in: friendIds }, mediaItem: mediaItemWhere },
          select: { mediaItemId: true, mediaItem: { select: itemSelect } },
          orderBy: { updatedAt: "desc" },
        });
        const seen = new Set<string>();
        const unique = allRows.filter(({ mediaItemId }) => {
          if (seen.has(mediaItemId)) return false;
          seen.add(mediaItemId);
          return true;
        });
        totalPages = Math.max(1, Math.ceil(unique.length / PAGE_SIZE));
        const pageRows = unique.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        results = pageRows.map(({ mediaItem }) =>
          dbItemToResult(mediaItem, mt),
        );
        // Friends results still show the current user's own watch status (not friends').
      }
    }
  } else {
    // TMDB-first path
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
  }

  // Watch-status overlay: use pre-built map for library/seen; call TMDB state helper otherwise.
  const tmdbUserStateByKey: Map<string, TmdbUserMediaState> =
    directStateMap ??
    (results.length > 0 && session?.user?.id
      ? await getUserTmdbMediaStateByRef(
          session.user.id,
          results.map((r) => ({ tmdbId: r.id, type: r.media_type })),
        ).catch(() => new Map())
      : new Map());

  // Post-filter only needed for "unseen" (TMDB-first path).
  let filteredResults = results;

  if (!useDbFirst && activeFilter === "unseen" && session?.user?.id) {
    const userId = session.user.id;
    const mediaType = type === "tv" ? MediaType.TV : MediaType.MOVIE;
    const resultTmdbIds = results.map((r) => r.id);
    const watched = await prisma.userMediaStatus.findMany({
      where: {
        userId,
        status: "WATCHED",
        mediaItem: { type: mediaType, tmdbId: { in: resultTmdbIds } },
      },
      select: { mediaItem: { select: { tmdbId: true } } },
    });
    const watchedIds = new Set(watched.map((w) => w.mediaItem.tmdbId));
    filteredResults = results.filter((r) => !watchedIds.has(r.id));
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
            {activeFilter === "friends"
              ? "None of your friends have tracked any matching titles yet."
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
