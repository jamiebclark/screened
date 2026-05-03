import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { historyDayPath, historyMonthPath } from "@/lib/history-calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function HistoryCalendarGrid({
  year,
  month,
  daysWithEntries,
  daysWithReleases = new Set(),
  daysWithParties = new Set(),
  prevMonthHref,
  nextMonthHref,
}: {
  year: number;
  month: number;
  daysWithEntries: Set<number>;
  daysWithReleases?: Set<number>;
  daysWithParties?: Set<number>;
  prevMonthHref: string | null;
  nextMonthHref: string | null;
}) {
  const dim = daysInMonth(year, month);
  const lead = firstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const now = new Date();
  const isThisMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = isThisMonth ? now.getDate() : null;

  const hasAnyIndicators =
    daysWithReleases.size > 0 || daysWithParties.size > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        {prevMonthHref ? (
          <Button variant="outline" size="icon" className="shrink-0" asChild>
            <Link href={prevMonthHref} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <Link
          href={historyMonthPath(year, month)}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          {new Date(year, month - 1, 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Link>
        {nextMonthHref ? (
          <Button variant="outline" size="icon" className="shrink-0" asChild>
            <Link href={nextMonthHref} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="font-medium py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const hasEntry = daysWithEntries.has(d);
          const hasRelease = daysWithReleases.has(d);
          const hasParty = daysWithParties.has(d);
          const isToday = todayDay === d;
          const hasAny = hasEntry || hasRelease || hasParty;
          return (
            <Link
              key={d}
              href={historyDayPath(year, month, d)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md text-sm transition-colors",
                "hover:bg-accent",
                hasEntry && "font-semibold bg-primary/10 text-foreground",
                isToday && "ring-1 ring-primary",
              )}
            >
              <span>{d}</span>
              {hasAny && (
                <div className="flex gap-0.5 mt-0.5" aria-hidden>
                  {hasEntry && (
                    <span className="h-1 w-1 rounded-full bg-primary" />
                  )}
                  {hasRelease && (
                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                  )}
                  {hasParty && (
                    <span className="h-1 w-1 rounded-full bg-violet-500" />
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
          Viewing logged
        </span>
        {hasAnyIndicators && (
          <>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              Release
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
              Watch party
            </span>
          </>
        )}
      </div>
    </div>
  );
}
