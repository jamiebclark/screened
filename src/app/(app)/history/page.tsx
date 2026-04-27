import { auth } from "@/lib/auth";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryWatchEntryRow } from "@/components/history-watch-entry-row";
import { fetchMyWatchHistoryRecent } from "@/lib/watch-history-queries";
import {
  historyDayPath,
  historyMonthPath,
  localCalendarParts,
} from "@/lib/history-calendar";

function formatGroupDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  if (diffDays < 365)
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function HistoryPage() {
  const session = await auth();

  const watched = await fetchMyWatchHistoryRecent(session!.user.id, 200);

  const groups: { label: string; date: Date; items: typeof watched }[] = [];

  for (const entry of watched) {
    const date = entry.watchedAt;
    const label = formatGroupDate(date);
    const last = groups[groups.length - 1];

    if (last && last.label === label) {
      last.items.push(entry);
    } else {
      groups.push({ label, date, items: [entry] });
    }
  }

  const now = new Date();
  const { year: cy, month: cm } = localCalendarParts(now);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Watch History</h1>
            <p className="text-sm text-muted-foreground">
              {watched.length} viewing{watched.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            href={historyMonthPath(cy, cm)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Calendar ·{" "}
            {new Date(cy, cm - 1, 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Link>
          <Link
            href="/settings/watch-history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage imports & clear history
          </Link>
        </div>
      </div>

      {watched.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground max-w-sm mx-auto">
          <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No watch history yet</p>
          <p className="text-sm mt-2 leading-relaxed">
            Connect Plex or import from Letterboxd to pull in your existing
            history, or log a viewing manually on any movie or TV page.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
            <Button variant="default" size="sm" asChild>
              <Link href="/settings/plex">Connect Plex</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/letterboxd">Import Letterboxd</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const { year, month, day } = localCalendarParts(group.date);
            const dayHref = historyDayPath(year, month, day);
            return (
              <div key={`${group.label}-${group.date.toISOString()}`}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 sticky top-16 bg-background/95 backdrop-blur py-1 -mx-4 px-4">
                  <Link
                    href={dayHref}
                    className="hover:text-foreground transition-colors"
                  >
                    {group.label}
                  </Link>
                </h2>
                <div className="space-y-2">
                  {group.items.map((entry) => (
                    <HistoryWatchEntryRow
                      key={entry.id}
                      entry={entry}
                      timeLabel={formatTime(entry.watchedAt)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {watched.length === 200 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Showing your 200 most recent. Older history is still tracked —
              open a month on the calendar to browse by date.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
