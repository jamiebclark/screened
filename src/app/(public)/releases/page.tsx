import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Clapperboard } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { getUpcomingReleasesPage } from "@/lib/tmdb";
import { getListMembershipsForTmdbIds } from "@/lib/upcoming-queries";
import type { TmdbSearchResult } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Releases" };

type ReleaseItem = {
  tmdbId: number;
  title: string;
  poster: string | null;
  releaseDate: Date;
  onList: boolean;
};

type MonthGroup = {
  label: string;
  items: ReleaseItem[];
};

function startOfMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function toReleaseItem(
  result: TmdbSearchResult,
  onListIds: Set<number>,
): ReleaseItem | null {
  if (!result.release_date || !result.title) return null;
  const releaseDate = new Date(result.release_date);
  if (isNaN(releaseDate.getTime())) return null;
  return {
    tmdbId: result.id,
    title: result.title,
    poster: result.poster_path,
    releaseDate,
    onList: onListIds.has(result.id),
  };
}

function groupByMonth(items: ReleaseItem[]): MonthGroup[] {
  const map = new Map<string, ReleaseItem[]>();
  for (const item of items) {
    const label = item.releaseDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function ReleasesPage() {
  const session = await auth();
  const fromDate = startOfMonth();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const pages = await Promise.all([
    getUpcomingReleasesPage(fromDate, 1),
    getUpcomingReleasesPage(fromDate, 2),
    getUpcomingReleasesPage(fromDate, 3),
  ]);

  const allResults = pages.flatMap((p) => p.results);
  const tmdbIds = allResults.map((r) => r.id);
  const onListIds = session?.user?.id
    ? await getListMembershipsForTmdbIds(session.user.id, tmdbIds)
    : new Set<number>();

  const items = allResults
    .map((r) => toReleaseItem(r, onListIds))
    .filter((r): r is ReleaseItem => r !== null && r.releaseDate >= today)
    .sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime());

  const months = groupByMonth(items);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming movies sorted by release date
          </p>
        </div>
      </div>

      {months.map(({ label, items }) => (
        <section key={label}>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            {label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {items.length}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {items.map((item) => (
              <div key={item.tmdbId} className="space-y-1.5">
                <MediaCard
                  tmdbId={item.tmdbId}
                  type="movie"
                  title={item.title}
                  poster={item.poster}
                  year={item.releaseDate.getUTCFullYear()}
                  onList={item.onList}
                />
                <p className="text-xs text-muted-foreground text-center truncate">
                  {formatDay(item.releaseDate)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
