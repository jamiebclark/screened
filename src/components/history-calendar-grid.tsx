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
  prevMonthHref,
  nextMonthHref,
}: {
  year: number;
  month: number;
  daysWithEntries: Set<number>;
  prevMonthHref: string | null;
  nextMonthHref: string | null;
}) {
  const dim = daysInMonth(year, month);
  const lead = firstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const now = new Date();
  const isThisMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = isThisMonth ? now.getDate() : null;

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
          <Button variant="outline" size="icon" className="shrink-0" disabled aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <Link
          href={historyMonthPath(year, month)}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          {new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Link>
        {nextMonthHref ? (
          <Button variant="outline" size="icon" className="shrink-0" asChild>
            <Link href={nextMonthHref} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" className="shrink-0" disabled aria-label="Next month">
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
          const isToday = todayDay === d;
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
              {hasEntry && <span className="h-1 w-1 rounded-full bg-primary mt-0.5" aria-hidden />}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        A dot marks days you logged a viewing. Open a day for the full list and friend activity.
      </p>
    </div>
  );
}
