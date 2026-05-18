import { auth } from "@/lib/auth";
import {
  getMovieGenres,
  getTvGenres,
  discoverMovies,
  discoverTv,
  getTrending,
  getPersonCreditTmdbIds,
  type TmdbSearchResult,
} from "@/lib/tmdb";
import {
  getUserTmdbMediaStateByRef,
  tmdbRefKey,
  type TmdbUserMediaState,
} from "@/lib/tmdb-user-media-state";
import { listFriendUserIds } from "@/lib/friendship";
import { fetchFriendWatchersForTmdbItems } from "@/lib/watch-history-queries";
import { prisma } from "@/lib/prisma";
import { MediaType, WatchStatus } from "@/generated/prisma";
import { MediaCard } from "@/components/media-card";
import { BrowseFilterPanel } from "./browse-filter-panel";
import Link from "next/link";
import {
  findGenreByName,
  getDefaultSort,
  buildTmdbSortBy,
  buildPrismaOrderBy,
  sortFriendsRows,
} from "@/lib/browse-utils";
import { parseBrowseFilter, serializeBrowseFilter } from "@/lib/browse-types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Browse" };

interface BrowsePageProps {
  searchParams: Promise<{
    type?: string;
    // Legacy single-genre params (still supported)
    genre?: string;
    genreName?: string;
    // New filter params
    genres?: string;
    sort?: string;
    yearMin?: string;
    yearMax?: string;
    includePersons?: string;
    excludePersons?: string;
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
  const filterParam =
    (["seen", "unseen", "library", "friends"] as const).find(
      (f) => f === sp.filter,
    ) ?? null;

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const activeFilter = isLoggedIn && type !== "all" ? filterParam : null;

  // Parse the full filter state from URL params
  const browseFilter = parseBrowseFilter({
    genres: sp.genres,
    genre: sp.genre,
    sort: sp.sort,
    yearMin: sp.yearMin,
    yearMax: sp.yearMax,
    includePersons: sp.includePersons,
    excludePersons: sp.excludePersons,
  });

  const yearError =
    browseFilter.yearMin !== null &&
    browseFilter.yearMax !== null &&
    browseFilter.yearMin > browseFilter.yearMax;

  const effectiveSort = browseFilter.sortOrder ?? getDefaultSort(activeFilter);

  const genres =
    type === "all"
      ? []
      : type === "tv"
        ? await getTvGenres().catch(() => [])
        : await getMovieGenres().catch(() => []);

  // Resolve genre IDs → names for DB filtering; fall back to legacy genreName param
  let activeGenreIds = [...browseFilter.genreIds];
  if (activeGenreIds.length === 0 && sp.genreName && genres.length > 0) {
    const legacyId = findGenreByName(genres, sp.genreName);
    if (legacyId) activeGenreIds = [legacyId];
  }
  const activeGenreNames = activeGenreIds
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter((n): n is string => !!n);

  let results: TmdbSearchResult[] = [];
  let totalPages = 1;
  let directStateMap: Map<string, TmdbUserMediaState> | null = null;

  const useDbFirst =
    !!session?.user?.id &&
    type !== "all" &&
    (activeFilter === "library" ||
      activeFilter === "seen" ||
      activeFilter === "friends");

  // Shared MediaItem where clause for DB-first paths
  const mediaType = type === "tv" ? MediaType.TV : MediaType.MOVIE;
  const mt = type as "movie" | "tv";

  // For DB-first paths, resolve person filters via TMDB filmography (works even for unenriched items)
  let dbIncludeTmdbIds: number[] | null = null;
  let dbExcludeTmdbIds: number[] | null = null;
  if (useDbFirst) {
    if (browseFilter.includePersons.length > 0) {
      const sets = await Promise.all(
        browseFilter.includePersons.map((p) =>
          getPersonCreditTmdbIds(p.id, mt)
            .then((ids) => new Set(ids))
            .catch(() => new Set<number>()),
        ),
      );
      // AND logic: intersect all sets
      const intersection = sets.reduce<Set<number>>(
        (acc, set) => new Set([...acc].filter((id) => set.has(id))),
        sets[0] ?? new Set(),
      );
      dbIncludeTmdbIds = [...intersection];
    }
    if (browseFilter.excludePersons.length > 0) {
      const sets = await Promise.all(
        browseFilter.excludePersons.map((p) =>
          getPersonCreditTmdbIds(p.id, mt)
            .then((ids) => new Set(ids))
            .catch(() => new Set<number>()),
        ),
      );
      const union = sets.reduce<Set<number>>((acc, set) => {
        for (const id of set) acc.add(id);
        return acc;
      }, new Set());
      dbExcludeTmdbIds = [...union];
    }
  }

  const mediaItemWhere = {
    type: mediaType,
    ...(activeGenreNames.length > 0
      ? { genres: { hasEvery: activeGenreNames } }
      : {}),
    ...(browseFilter.yearMin !== null || browseFilter.yearMax !== null
      ? {
          year: {
            ...(browseFilter.yearMin !== null
              ? { gte: browseFilter.yearMin }
              : {}),
            ...(browseFilter.yearMax !== null
              ? { lte: browseFilter.yearMax }
              : {}),
          },
        }
      : {}),
    // Filmography-based person filters (reliable regardless of enrichment status)
    ...(dbIncludeTmdbIds !== null ||
    (dbExcludeTmdbIds !== null && dbExcludeTmdbIds.length > 0)
      ? {
          tmdbId: {
            ...(dbIncludeTmdbIds !== null ? { in: dbIncludeTmdbIds } : {}),
            ...(dbExcludeTmdbIds !== null && dbExcludeTmdbIds.length > 0
              ? { notIn: dbExcludeTmdbIds }
              : {}),
          },
        }
      : {}),
  };

  const itemSelect = {
    tmdbId: true,
    title: true,
    poster: true,
    year: true,
  } as const;

  const dbOrderBy = buildPrismaOrderBy(effectiveSort);

  if (!yearError) {
    if (useDbFirst && session?.user?.id) {
      const userId = session.user.id;

      if (activeFilter === "library") {
        const [rows, total] = await Promise.all([
          prisma.userMediaStatus.findMany({
            where: { userId, mediaItem: mediaItemWhere },
            select: {
              status: true,
              rating: true,
              mediaItem: { select: itemSelect },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            orderBy: dbOrderBy as any,
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
            select: {
              status: true,
              rating: true,
              mediaItem: { select: itemSelect },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            orderBy: dbOrderBy as any,
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
          const sorted = sortFriendsRows(unique, effectiveSort);
          totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
          const pageRows = sorted.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE,
          );
          results = pageRows.map(({ mediaItem }) =>
            dbItemToResult(mediaItem, mt),
          );
        }
      }
    } else {
      // TMDB-first path
      try {
        if (type === "all") {
          const data = await getTrending("all", "week");
          results = data.results;
        } else if (type === "tv") {
          const data = await discoverTv({
            genreIds: activeGenreIds.length > 0 ? activeGenreIds : undefined,
            sortBy: buildTmdbSortBy(effectiveSort, "tv"),
            yearMin: browseFilter.yearMin ?? undefined,
            yearMax: browseFilter.yearMax ?? undefined,
            withPersonIds:
              browseFilter.includePersons.length > 0
                ? browseFilter.includePersons.map((p) => p.id)
                : undefined,
            page,
          });
          results = data.results;
          totalPages = Math.min(data.total_pages, 500);
        } else {
          const data = await discoverMovies({
            genreIds: activeGenreIds.length > 0 ? activeGenreIds : undefined,
            sortBy: buildTmdbSortBy(effectiveSort, "movie"),
            yearMin: browseFilter.yearMin ?? undefined,
            yearMax: browseFilter.yearMax ?? undefined,
            withPersonIds:
              browseFilter.includePersons.length > 0
                ? browseFilter.includePersons.map((p) => p.id)
                : undefined,
            page,
          });
          results = data.results;
          totalPages = Math.min(data.total_pages, 500);
        }
      } catch {
        // TMDB unavailable — show empty state below
      }

      // Person post-filter for TMDB-first path (multi-include AND + all excludes)
      const needsPersonPostFilter =
        browseFilter.includePersons.length > 1 ||
        browseFilter.excludePersons.length > 0;
      if (needsPersonPostFilter && results.length > 0) {
        const tmdbIds = results.map((r) => r.id);
        const mediaItems = await prisma.mediaItem.findMany({
          where: {
            tmdbId: { in: tmdbIds },
            type: type === "tv" ? MediaType.TV : MediaType.MOVIE,
          },
          select: {
            tmdbId: true,
            castTmdbIds: true,
            directorsTmdbIds: true,
            cast: true,
            directors: true,
          },
        });
        const miMap = new Map(mediaItems.map((m) => [m.tmdbId, m]));

        results = results.filter((r) => {
          const mi = miMap.get(r.id);
          if (!mi) return true; // not in local DB — pass through

          // AND-check additional include persons (first was handled by TMDB)
          for (const p of browseFilter.includePersons.slice(1)) {
            const byId =
              mi.castTmdbIds.includes(p.id) ||
              mi.directorsTmdbIds.includes(p.id);
            const byName =
              mi.cast.includes(p.name) || mi.directors.includes(p.name);
            if (!byId && !byName) return false;
          }

          // Exclude any person whose name appears in cast/directors
          if (matchesExcludePerson(mi, browseFilter.excludePersons))
            return false;

          return true;
        });
      }
    }
  }

  // Watch-status overlay
  const tmdbUserStateByKey: Map<string, TmdbUserMediaState> =
    directStateMap ??
    (results.length > 0 && session?.user?.id
      ? await getUserTmdbMediaStateByRef(
          session.user.id,
          results.map((r) => ({ tmdbId: r.id, type: r.media_type })),
        ).catch(() => new Map())
      : new Map());

  // "Unseen" post-filter on TMDB-first path
  let filteredResults = results;
  if (!useDbFirst && activeFilter === "unseen" && session?.user?.id) {
    const userId = session.user.id;
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

  const friendWatchers =
    session?.user?.id && filteredResults.length > 0
      ? await fetchFriendWatchersForTmdbItems(
          session.user.id,
          filteredResults
            .filter((r) => r.media_type === "movie" || r.media_type === "tv")
            .map((r) => ({
              tmdbId: r.id,
              type: r.media_type as "movie" | "tv",
            })),
        )
      : new Map<
          string,
          { id: string; name: string; avatarUrl: string | null }[]
        >();

  function buildPageUrl(pageNum: number): string {
    const base = serializeBrowseFilter(browseFilter, {
      type,
      filter: filterParam ?? undefined,
    });
    if (pageNum <= 1) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}page=${pageNum}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Browse</h1>

      <BrowseFilterPanel
        genres={genres}
        filter={{ ...browseFilter, genreIds: activeGenreIds }}
        type={type}
        filterParam={activeFilter}
        isLoggedIn={isLoggedIn}
        yearError={yearError}
      />

      {yearError ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Fix the year range to see results.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
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
                  friendWatchers={friendWatchers.get(
                    `${item.media_type}-${item.id}`,
                  )}
                />
              );
            })}
          </div>

          {type !== "all" && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="rounded-md bg-muted px-6 py-3 hover:bg-accent transition-colors"
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
                  className="rounded-md bg-muted px-6 py-3 hover:bg-accent transition-colors"
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

/** Check if a media item matches any excluded person (case-insensitive substring). */
function matchesExcludePerson(
  item: { cast?: string[]; directors?: string[] },
  excludePersons: { name: string }[],
): boolean {
  const cast = item.cast ?? [];
  const directors = item.directors ?? [];
  return excludePersons.some((p) => {
    const lower = p.name.toLowerCase();
    return (
      cast.some((c) => c.toLowerCase().includes(lower)) ||
      directors.some((d) => d.toLowerCase().includes(lower))
    );
  });
}
