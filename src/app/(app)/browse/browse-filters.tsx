"use client";

import { useRouter } from "next/navigation";
import type { TmdbGenre } from "@/lib/tmdb";

interface BrowseFiltersProps {
  genres: TmdbGenre[];
  activeGenreId: number | null;
  type: string;
  filter: string | null;
  isLoggedIn: boolean;
}

const TYPE_LABELS = { movie: "Movies", tv: "TV Shows", all: "All" } as const;
const FILTER_LABELS = {
  seen: "Seen",
  unseen: "Not Seen",
  library: "In My Library",
  friends: "Friends' Library",
} as const;

export function BrowseFilters({
  genres,
  activeGenreId,
  type,
  filter,
  isLoggedIn,
}: BrowseFiltersProps) {
  const router = useRouter();

  function buildUrl(updates: {
    type?: string;
    genre?: string | null;
    filter?: string | null;
    page?: string | null;
  }) {
    const nextType = updates.type ?? type;
    const nextGenre =
      "genre" in updates
        ? updates.genre
        : activeGenreId
          ? String(activeGenreId)
          : null;
    const nextFilter = "filter" in updates ? updates.filter : filter;
    const params = new URLSearchParams();
    if (nextType !== "movie") params.set("type", nextType);
    if (nextGenre) params.set("genre", nextGenre);
    if (nextFilter) params.set("filter", nextFilter);
    const q = params.toString();
    return q ? `/browse?${q}` : "/browse";
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Type toggle */}
      <div className="flex gap-2 flex-wrap">
        {(["movie", "tv", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() =>
              router.push(buildUrl({ type: t, genre: null, page: null }))
            }
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              type === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Genre pills — only for movie/tv */}
      {type !== "all" && genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push(buildUrl({ genre: null, page: null }))}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              !activeGenreId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            All Genres
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() =>
                router.push(buildUrl({ genre: String(g.id), page: null }))
              }
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                activeGenreId === g.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* User filters — logged-in only, not for "all" type */}
      {isLoggedIn && type !== "all" && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as (keyof typeof FILTER_LABELS)[]).map(
            (f) => (
              <button
                key={f}
                onClick={() =>
                  router.push(
                    buildUrl({ filter: filter === f ? null : f, page: null }),
                  )
                }
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  filter === f
                    ? "bg-secondary text-secondary-foreground ring-1 ring-ring"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
