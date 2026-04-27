import { auth } from "@/lib/auth";
import { searchMulti } from "@/lib/tmdb";
import { MediaCard } from "@/components/media-card";
import { parseDateOnlyIso } from "@/lib/history-calendar";
import {
  getUserTmdbMediaStateByRef,
  tmdbRefKey,
} from "@/lib/tmdb-user-media-state";
import { Search, Film } from "lucide-react";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; watchedDate?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, type, watchedDate: watchedDateRaw } = await searchParams;
  const query = q?.trim();
  const watchedDate = parseDateOnlyIso(watchedDateRaw);
  const hrefSearch = watchedDate
    ? `watchedDate=${encodeURIComponent(watchedDate)}`
    : null;

  const session = await auth();

  let results: Awaited<ReturnType<typeof searchMulti>>["results"] = [];

  if (query) {
    const data = await searchMulti(query).catch(() => ({ results: [] }));
    results = data.results.filter((r) => {
      if (type === "movie") return r.media_type === "movie";
      if (type === "tv") return r.media_type === "tv";
      return r.media_type === "movie" || r.media_type === "tv";
    });
  }

  const tmdbUserStateByKey =
    results.length > 0 && session?.user?.id
      ? await getUserTmdbMediaStateByRef(
          session.user.id,
          results.map((r) => ({
            tmdbId: r.id,
            type: r.media_type as "movie" | "tv",
          })),
        )
      : new Map();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Search</h1>
        <form method="get" className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search movies and TV shows..."
              className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            {watchedDate && (
              <input type="hidden" name="watchedDate" value={watchedDate} />
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 mt-3">
          {(["", "movie", "tv"] as const).map((t) => {
            const labels = { "": "All", movie: "Movies", tv: "TV Shows" };
            const isActive = (type ?? "") === t;
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            if (t) params.set("type", t);
            if (watchedDate) params.set("watchedDate", watchedDate);
            return (
              <a
                key={t}
                href={`/search?${params.toString()}`}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {labels[t]}
              </a>
            );
          })}
        </div>
      </div>

      {!query ? (
        <div className="text-center py-16">
          <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Search for movies and TV shows above
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No results found for &quot;{query}&quot;
          </p>
        </div>
      ) : (
        <div>
          {watchedDate && (
            <p className="text-sm text-muted-foreground mb-3">
              Watch date {watchedDate} will be suggested when you log a viewing
              from a title.
            </p>
          )}
          <p className="text-sm text-muted-foreground mb-4">
            {results.length} result{results.length !== 1 ? "s" : ""} for &quot;
            {query}&quot;
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {results.map((item) => {
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
                  hrefSearch={hrefSearch}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
