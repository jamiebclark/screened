import { auth } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryBreadcrumbs } from "@/components/history-breadcrumbs";
import { HistoryCalendarGrid } from "@/components/history-calendar-grid";
import { HistoryWatchEntryRow } from "@/components/history-watch-entry-row";
import {
  adjacentMonthHrefs,
  historyMonthPath,
  historyYearPath,
  localMonthRange,
  monthCanonicalPath,
  parseMonthSegment,
  parseYearSegment,
} from "@/lib/history-calendar";
import {
  fetchMyWatchDaysInMonth,
  fetchMyWatchHistoryInRange,
  fetchReleasesInMonth,
} from "@/lib/watch-history-queries";
import { fetchWatchPartiesInMonth } from "@/lib/watch-party";
import Image from "next/image";
import { Users } from "lucide-react";

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type Params = { params: Promise<{ year: string; month: string }> };

export async function generateMetadata({ params }: Params) {
  const { year: yStr, month: mStr } = await params;
  const year = parseYearSegment(yStr);
  const month = parseMonthSegment(mStr);
  const title =
    year != null && month != null
      ? `${new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
      : "Watch history";
  return { title };
}

export default async function HistoryMonthPage({ params }: Params) {
  const { year: yStr, month: mStr } = await params;
  const year = parseYearSegment(yStr);
  const month = parseMonthSegment(mStr);
  if (year == null || month == null) notFound();

  const canonMonth = monthCanonicalPath(year, month, mStr);
  if (canonMonth) redirect(canonMonth);

  const session = await auth();
  const userId = session!.user.id;
  const { start, end } = localMonthRange(year, month);

  const [entries, daysWithEntries, releases, watchParties] = await Promise.all([
    fetchMyWatchHistoryInRange(userId, start, end),
    fetchMyWatchDaysInMonth(userId, start, end),
    fetchReleasesInMonth(userId, start, end),
    fetchWatchPartiesInMonth(userId, start, end),
  ]);

  const daysWithReleases = new Set(
    releases.map((r) => r.releaseDate.getDate()),
  );
  const daysWithParties = new Set(
    watchParties.map((p) => p.scheduledFor.getDate()),
  );

  const adj = adjacentMonthHrefs(year, month);
  const prevMonthHref = adj.prev
    ? historyMonthPath(adj.prev.year, adj.prev.month)
    : null;
  const nextMonthHref = adj.next
    ? historyMonthPath(adj.next.year, adj.next.month)
    : null;

  const monthTitle = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <HistoryBreadcrumbs
        items={[
          { label: "Watch history", href: "/history" },
          { label: String(year), href: historyYearPath(year) },
          { label: monthTitle },
        ]}
      />

      <h1 className="text-2xl font-bold mb-6">{monthTitle}</h1>

      <div className="mb-10">
        <HistoryCalendarGrid
          year={year}
          month={month}
          daysWithEntries={daysWithEntries}
          daysWithReleases={daysWithReleases}
          daysWithParties={daysWithParties}
          prevMonthHref={prevMonthHref}
          nextMonthHref={nextMonthHref}
        />
      </div>

      {watchParties.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Watch parties{" "}
            <span className="font-normal normal-case">
              ({watchParties.length})
            </span>
          </h2>
          <div className="space-y-2">
            {watchParties.map((party) => {
              const title = party.mediaItem.year
                ? `${party.mediaItem.title} (${party.mediaItem.year})`
                : party.mediaItem.title;
              return (
                <Link
                  key={party.id}
                  href={`/watch-parties/${party.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors"
                >
                  {party.mediaItem.poster ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${party.mediaItem.poster}`}
                      alt=""
                      width={32}
                      height={48}
                      className="rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(party.scheduledFor)} at{" "}
                      {formatTime(party.scheduledFor)}
                      {" · "}
                      {party.isHost
                        ? "Hosted by you"
                        : `Hosted by ${party.host.name}`}
                    </p>
                  </div>
                  <span
                    className={
                      party.status === "CONFIRMED"
                        ? "text-xs text-green-500 shrink-0"
                        : "text-xs text-muted-foreground shrink-0"
                    }
                  >
                    {party.status === "CONFIRMED" ? "Confirmed" : "Scheduled"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {releases.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Releases from your watchlist{" "}
            <span className="font-normal normal-case">({releases.length})</span>
          </h2>
          <div className="space-y-2">
            {releases.map((item) => {
              const typeSlug = item.type === "MOVIE" ? "movies" : "tv";
              return (
                <Link
                  key={item.id}
                  href={`/${typeSlug}/${item.tmdbId}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors"
                >
                  {item.poster ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${item.poster}`}
                      alt=""
                      width={32}
                      height={48}
                      className="rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "MOVIE" ? "Movie" : "TV"} ·{" "}
                      {formatShortDate(item.releaseDate)}
                    </p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          All viewings this month
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing logged this month yet.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <HistoryWatchEntryRow
                key={entry.id}
                entry={entry}
                timeLabel={formatTime(entry.watchedAt)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
