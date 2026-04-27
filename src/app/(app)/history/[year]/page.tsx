import { auth } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryBreadcrumbs } from "@/components/history-breadcrumbs";
import {
  adjacentYearHrefs,
  historyMonthPath,
  historyYearPath,
  localYearRange,
  parseYearSegment,
} from "@/lib/history-calendar";
import { fetchMyWatchEntriesInRange } from "@/lib/watch-history-queries";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Params = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Params) {
  const { year: yStr } = await params;
  const year = parseYearSegment(yStr);
  return {
    title: year
      ? `${year} | Watch history | Screened`
      : "Watch history | Screened",
  };
}

export default async function HistoryYearPage({ params }: Params) {
  const { year: yStr } = await params;
  const year = parseYearSegment(yStr);
  if (year == null) notFound();

  const session = await auth();
  const { start, end } = localYearRange(year);
  const entries = await fetchMyWatchEntriesInRange(
    session!.user.id,
    start,
    end,
  );

  const byMonth = new Map<number, number>();
  for (const e of entries) {
    const m = e.watchedAt.getMonth() + 1;
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  }

  const { prev, next } = adjacentYearHrefs(year);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <HistoryBreadcrumbs
        items={[
          { label: "Watch history", href: "/history" },
          { label: String(year) },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-bold">{year}</h1>
        <div className="flex items-center gap-2">
          {prev != null ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={historyYearPath(prev)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {prev}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Year
            </Button>
          )}
          {next != null ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={historyYearPath(next)}>
                {next}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Year
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {entries.length} viewing{entries.length !== 1 ? "s" : ""} logged in{" "}
        {year}.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const count = byMonth.get(month) ?? 0;
          const label = new Date(year, month - 1, 1).toLocaleDateString(
            "en-US",
            { month: "long" },
          );
          return (
            <Link
              key={month}
              href={historyMonthPath(year, month)}
              className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {count === 0
                  ? "No entries"
                  : `${count} viewing${count !== 1 ? "s" : ""}`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
