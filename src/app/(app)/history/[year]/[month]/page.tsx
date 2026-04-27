import { auth } from "@/lib/auth";
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
} from "@/lib/watch-history-queries";

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type Params = { params: Promise<{ year: string; month: string }> };

export async function generateMetadata({ params }: Params) {
  const { year: yStr, month: mStr } = await params;
  const year = parseYearSegment(yStr);
  const month = parseMonthSegment(mStr);
  const title =
    year != null && month != null
      ? `${new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })} | Screened`
      : "Watch history | Screened";
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
  const { start, end } = localMonthRange(year, month);
  const [entries, daysWithEntries] = await Promise.all([
    fetchMyWatchHistoryInRange(session!.user.id, start, end),
    fetchMyWatchDaysInMonth(session!.user.id, start, end),
  ]);

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
          prevMonthHref={prevMonthHref}
          nextMonthHref={nextMonthHref}
        />
      </div>

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
    </div>
  );
}
