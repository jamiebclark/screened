import { auth } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryBreadcrumbs } from "@/components/history-breadcrumbs";
import { HistoryWatchEntryRow } from "@/components/history-watch-entry-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PartyPopper, Search, Users } from "lucide-react";
import Image from "next/image";
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
  fetchFriendsWatchHistoryInRange,
  fetchMyWatchHistoryInRange,
  fetchReleasesInMonth,
} from "@/lib/watch-history-queries";
import { fetchWatchPartiesInMonth } from "@/lib/watch-party";

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
    year != null &&
    month != null &&
    day != null &&
    isValidCalendarDate(year, month, day)
      ? `${new Date(year, month - 1, day).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`
      : "Watch history";
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
  const userId = session!.user.id;
  const { start, end } = localDayRange(year, month, day);

  const [myEntries, friendEntries, releases, watchParties] = await Promise.all([
    fetchMyWatchHistoryInRange(userId, start, end),
    fetchFriendsWatchHistoryInRange(userId, start, end),
    fetchReleasesInMonth(userId, start, end),
    fetchWatchPartiesInMonth(userId, start, end),
  ]);

  const dateIso = toDateOnlyIso(year, month, day);
  const searchHref = (() => {
    const q = new URLSearchParams();
    q.set("watchedDate", dateIso);
    return `/search?${q.toString()}`;
  })();

  const partySearchHref = (() => {
    const q = new URLSearchParams();
    q.set("partyDate", dateIso);
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
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={partySearchHref}>
              <PartyPopper className="h-4 w-4 mr-1.5" />
              Schedule watch party…
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={searchHref}>
              <Search className="h-4 w-4 mr-1.5" />
              Log a viewing…
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Search opens with a watch date saved on each result. Pick a title, then
        use &quot;Log a viewing&quot; — the date defaults to this day.
      </p>

      {watchParties.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Watch parties
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
            Releases from your watchlist
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
                      {item.type === "MOVIE" ? "Movie" : "TV"} release
                    </p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Your viewings
        </h2>
        {myEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You did not log anything this day.
          </p>
        ) : (
          <div className="space-y-2">
            {myEntries.map((entry) => (
              <HistoryWatchEntryRow
                key={entry.id}
                entry={entry}
                timeLabel={formatTime(entry.watchedAt)}
              />
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
                  <Link
                    href={`/profile/${entry.user.id}`}
                    className="text-xs text-muted-foreground font-medium hover:underline"
                  >
                    {entry.user.name}
                  </Link>
                  <HistoryWatchEntryRow
                    entry={entry}
                    timeLabel={formatTime(entry.watchedAt)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
