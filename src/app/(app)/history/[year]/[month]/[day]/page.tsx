import { auth } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryBreadcrumbs } from "@/components/history-breadcrumbs";
import { HistoryWatchEntryRow } from "@/components/history-watch-entry-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  dayCanonicalPath,
  historyMonthPath,
  historyYearPath,
  isValidCalendarDate,
  localDayRange,
  parseDaySegment,
  parseMonthSegment,
  parseYearSegment,
  toDateOnlyIso,
} from "@/lib/history-calendar";
import {
  fetchFriendsWatchEntriesInRange,
  fetchMyWatchEntriesInRange,
} from "@/lib/watch-history-queries";

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type Params = { params: Promise<{ year: string; month: string; day: string }> };

export async function generateMetadata({ params }: Params) {
  const { year: yStr, month: mStr, day: dStr } = await params;
  const year = parseYearSegment(yStr);
  const month = parseMonthSegment(mStr);
  const day = parseDaySegment(dStr);
  const title =
    year != null && month != null && day != null && isValidCalendarDate(year, month, day)
      ? `${new Date(year, month - 1, day).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })} | Screened`
      : "Watch history | Screened";
  return { title };
}

export default async function HistoryDayPage({ params }: Params) {
  const { year: yStr, month: mStr, day: dStr } = await params;
  const year = parseYearSegment(yStr);
  const month = parseMonthSegment(mStr);
  const day = parseDaySegment(dStr);
  if (year == null || month == null || day == null) notFound();
  if (!isValidCalendarDate(year, month, day)) notFound();

  const canonDay = dayCanonicalPath(year, month, day, dStr);
  if (canonDay) redirect(canonDay);

  const session = await auth();
  const { start, end } = localDayRange(year, month, day);
  const [myEntries, friendEntries] = await Promise.all([
    fetchMyWatchEntriesInRange(session!.user.id, start, end),
    fetchFriendsWatchEntriesInRange(session!.user.id, start, end),
  ]);

  const dateIso = toDateOnlyIso(year, month, day);
  const searchHref = (() => {
    const q = new URLSearchParams();
    q.set("watchedDate", dateIso);
    return `/search?${q.toString()}`;
  })();

  const longDate = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
          { label: monthTitle, href: historyMonthPath(year, month) },
          { label: longDate },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <h1 className="text-2xl font-bold">{longDate}</h1>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={searchHref}>
            <Search className="h-4 w-4 mr-1.5" />
            Log a viewing…
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Search opens with a watch date saved on each result. Pick a title, then use &quot;Log a viewing&quot; — the
        date defaults to this day.
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your viewings</h2>
        {myEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">You did not log anything this day.</p>
        ) : (
          <div className="space-y-2">
            {myEntries.map((entry) => (
              <HistoryWatchEntryRow key={entry.id} entry={entry} timeLabel={formatTime(entry.watchedAt)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Friends (watch history visible to you)
        </h2>
        {friendEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No friend activity this day, or friends keep this private.
          </p>
        ) : (
          <div className="space-y-4">
            {friendEntries.map((entry) => (
              <div key={entry.id} className="flex gap-3 items-start">
                <Avatar className="h-9 w-9 shrink-0 mt-1">
                  <AvatarImage src={entry.user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">
                    {(entry.user.name.trim().slice(0, 2) || "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{entry.user.name}</p>
                  <HistoryWatchEntryRow entry={entry} timeLabel={formatTime(entry.watchedAt)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
