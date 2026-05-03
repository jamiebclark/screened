import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  getUserStats,
  type MonthlyStat,
  type PersonStat,
} from "@/lib/stats-queries";
import { BarChart3, Clock, Film, Star, Tv } from "lucide-react";
import { WatchingTabs } from "@/components/watching-tabs";

function formatHours(minutes: number): string {
  const hours = Math.round(minutes / 60);
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
  return String(hours);
}

function shortMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-US", { month: "short" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function HorizontalBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-8 text-right shrink-0">
        {count}
      </span>
    </div>
  );
}

function BarList({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <HorizontalBar
          key={item.label}
          label={item.label}
          count={item.count}
          max={max}
        />
      ))}
    </div>
  );
}

function RatingsDistribution({
  ratings,
}: {
  ratings: { rating: number; count: number }[];
}) {
  const filled = [5, 4, 3, 2, 1].map((r) => ({
    label: "★".repeat(r),
    count: ratings.find((x) => x.rating === r)?.count ?? 0,
  }));
  const max = Math.max(...filled.map((r) => r.count), 1);
  if (filled.every((r) => r.count === 0)) {
    return <p className="text-sm text-muted-foreground">No ratings yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {filled.map(({ label, count }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-sm text-yellow-400 w-14 shrink-0">{label}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400/70 rounded-full"
              style={{ width: `${Math.round((count / max) * 100)}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground w-8 text-right shrink-0">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityChart({ data }: { data: MonthlyStat[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map(({ month, count }) => (
        <div
          key={month}
          title={`${month}: ${count}`}
          className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full"
        >
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full bg-primary/60 rounded-t transition-all"
              style={{
                height:
                  count === 0 ? "2px" : `${Math.round((count / max) * 100)}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {shortMonth(month)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RankedList({ items }: { items: PersonStat[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <ol className="space-y-1.5">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground w-4 text-right shrink-0">
            {i + 1}
          </span>
          <span className="flex-1 truncate">{item.name}</span>
          <span className="text-muted-foreground shrink-0">{item.count}</span>
        </li>
      ))}
    </ol>
  );
}

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const session = await auth();
  const stats = await getUserStats(session!.user.id);

  const hasAnyData =
    stats.summary.uniqueMovies > 0 || stats.summary.episodeCount > 0;

  if (!hasAnyData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <WatchingTabs />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1 max-w-xs">
            <p className="font-medium">No watch history yet</p>
            <p className="text-sm text-muted-foreground">
              Start tracking what you watch and your stats will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const genreItems = stats.genres.map((g) => ({
    label: g.genre,
    count: g.count,
  }));
  const decadeItems = stats.decades.map((d) => ({
    label: `${d.decade}s`,
    count: d.count,
  }));

  const hours = formatHours(stats.summary.totalRuntimeMinutes);
  const avgRating = stats.summary.avgRating
    ? `${stats.summary.avgRating} / 5`
    : "—";
  const ratingsSub =
    stats.summary.ratedCount > 0
      ? `${stats.summary.ratedCount} title${stats.summary.ratedCount !== 1 ? "s" : ""} rated`
      : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <WatchingTabs />
      <h1 className="text-2xl font-bold mb-8">Your stats</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Film}
          label="Movies"
          value={stats.summary.uniqueMovies}
        />
        <StatCard
          icon={Clock}
          label="Hours watched"
          value={hours}
          sub="movies only"
        />
        <StatCard
          icon={Tv}
          label="Episodes"
          value={stats.summary.episodeCount}
        />
        <StatCard
          icon={Star}
          label="Avg rating"
          value={avgRating}
          sub={ratingsSub}
        />
      </div>

      {/* Genres + Ratings side by side */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <section>
          <h3 className="text-base font-semibold mb-4">Top genres</h3>
          <BarList items={genreItems} />
        </section>

        <section>
          <h3 className="text-base font-semibold mb-4">Ratings</h3>
          <RatingsDistribution ratings={stats.ratings} />
        </section>
      </div>

      {/* Monthly activity */}
      <section className="mb-6">
        <h3 className="text-base font-semibold mb-4">
          Activity — last 12 months
        </h3>
        <ActivityChart data={stats.monthlyActivity} />
      </section>

      {/* Decades + Directors side by side */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <section>
          <h3 className="text-base font-semibold mb-4">By decade</h3>
          <BarList items={decadeItems} />
        </section>

        <section>
          <h3 className="text-base font-semibold mb-4">Directors</h3>
          <RankedList items={stats.topDirectors} />
        </section>
      </div>

      {/* Cast */}
      <section>
        <h3 className="text-base font-semibold mb-4">Most watched cast</h3>
        <RankedList items={stats.topCast} />
      </section>
    </div>
  );
}
