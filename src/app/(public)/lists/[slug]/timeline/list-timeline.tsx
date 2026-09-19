import Image from "next/image";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MediaType } from "@/generated/prisma";
import { tmdbImageUrl } from "@/lib/utils";
import {
  groupEntriesByDay,
  type AnonymisedTimelineEntry,
  type ListTimeline,
  type TimelineEntry,
  type TimelineItem,
  type UnwatchedItem,
} from "@/lib/list-watch-timeline";

/**
 * Vertical timeline: a label rail on the left, a spine, and one compact row per
 * watched title. Dates are formatted in UTC to line up with the challenge
 * window semantics used everywhere else in lists.
 */

type AnyEntry = TimelineEntry | AnonymisedTimelineEntry;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortDate(d: Date, withYear: boolean): string {
  const base = `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
  return withYear ? `${base} ${d.getUTCFullYear()}` : base;
}

function weekday(d: Date): string {
  return WEEKDAY_SHORT[d.getUTCDay()];
}

function titleHref(media: TimelineItem["mediaItem"]): string {
  return media.type === MediaType.MOVIE
    ? `/movies/${media.tmdbId}`
    : `/tv/${media.tmdbId}`;
}

function Poster({ media }: { media: TimelineItem["mediaItem"] }) {
  const poster = tmdbImageUrl(media.poster, "w92");
  return (
    <Link href={titleHref(media)} className="shrink-0">
      {poster ? (
        <Image
          src={poster}
          alt={media.title}
          width={40}
          height={60}
          className="h-15 w-10 rounded object-cover"
        />
      ) : (
        <div className="h-15 w-10 rounded bg-zinc-800" />
      )}
    </Link>
  );
}

function TitleLink({ media }: { media: TimelineItem["mediaItem"] }) {
  return (
    <Link
      href={titleHref(media)}
      className="block truncate text-sm font-medium hover:underline"
    >
      {media.title}
      {media.year != null && (
        <span className="text-muted-foreground"> ({media.year})</span>
      )}
    </Link>
  );
}

function hasWatchers(entry: AnyEntry): entry is TimelineEntry {
  return "watches" in entry;
}

function EntryRow({ entry, axisYear }: { entry: AnyEntry; axisYear: number }) {
  return (
    <li
      data-testid="timeline-entry"
      className="flex items-start gap-3 rounded-lg border p-3"
    >
      <Poster media={entry.mediaItem} />
      <div className="min-w-0 flex-1">
        <TitleLink media={entry.mediaItem} />
        {hasWatchers(entry) ? (
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {entry.watches.map((w) => (
              <li
                key={`${w.user.id}-${w.watchedAt.toISOString()}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={w.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {w.user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground">{w.user.name}</span>
                <span>
                  ·{" "}
                  {shortDate(
                    w.watchedAt,
                    w.watchedAt.getUTCFullYear() !== axisYear,
                  )}
                </span>
                {w.episodeCount > 0 && (
                  <span>
                    · {w.episodeCount}{" "}
                    {w.episodeCount === 1 ? "episode" : "episodes"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.watchCount === 1
              ? "Watched once"
              : `Watched ${entry.watchCount} times`}
          </p>
        )}
      </div>
    </li>
  );
}

/** A row of the timeline: a label cell on the rail and content beside the spine. */
function RailRow({
  label,
  marker,
  last = false,
  children,
}: {
  label?: React.ReactNode;
  marker: React.ReactNode;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex">
      <div className="w-16 shrink-0 pr-3 pt-3 text-right sm:w-24">{label}</div>
      <div
        className={`relative min-w-0 flex-1 pl-4 ${last ? "" : "border-l pb-3"}`}
      >
        <span aria-hidden className="absolute -left-[5px] top-3.5">
          {marker}
        </span>
        {children}
      </div>
    </li>
  );
}

const DOT = "block h-2.5 w-2.5 rounded-full ring-2 ring-background";

function DayLabel({ date, axisYear }: { date: Date; axisYear: number }) {
  return (
    <>
      <span className="block text-[11px] leading-tight text-muted-foreground">
        {weekday(date)}
      </span>
      <span className="block text-xs font-medium leading-tight">
        {shortDate(date, date.getUTCFullYear() !== axisYear)}
      </span>
    </>
  );
}

type RailEvent =
  | { kind: "month"; at: Date; label: string }
  | { kind: "today"; at: Date }
  | { kind: "day"; at: Date; dayKey: string; entries: AnyEntry[] };

const KIND_ORDER: Record<RailEvent["kind"], number> = {
  month: 0,
  day: 1,
  today: 2,
};

function sequenceEvents(timeline: ListTimeline<AnyEntry>): RailEvent[] {
  const events: RailEvent[] = [];
  for (const g of groupEntriesByDay(timeline.entries)) {
    events.push({
      kind: "day",
      at: g.date,
      dayKey: g.dayKey,
      entries: g.entries,
    });
  }
  for (const m of timeline.months) {
    events.push({ kind: "month", at: m.at, label: m.label });
  }
  if (timeline.today) events.push({ kind: "today", at: timeline.today });
  return events.sort((a, b) => {
    const dt = a.at.getTime() - b.at.getTime();
    if (dt !== 0) return dt;
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  });
}

function EmptyState({
  timeline,
  windowDescription,
}: {
  timeline: ListTimeline<AnyEntry>;
  windowDescription: string | null;
}) {
  const hasWindow = windowDescription != null;
  const message = timeline.windowNotStarted
    ? "This challenge hasn't started yet."
    : hasWindow
      ? "Nothing watched in this window yet."
      : "No member has logged a watch of anything on this list yet.";
  return (
    <div className="rounded-xl border border-dashed px-6 py-16 text-center text-muted-foreground">
      <CalendarRange className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>{message}</p>
      {hasWindow && <p className="mt-1 text-sm">{windowDescription}</p>}
    </div>
  );
}

function UnwatchedSection({ items }: { items: UnwatchedItem[] }) {
  if (items.length === 0) return null;
  return (
    <section data-testid="timeline-unwatched" className="mt-10">
      <h3 className="mb-3 text-base font-semibold">
        Not watched yet{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {items.length}
        </span>
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.listItemId}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Poster media={item.mediaItem} />
            <div className="min-w-0 flex-1">
              <TitleLink media={item.mediaItem} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ListTimeline({
  timeline,
  windowDescription,
}: {
  timeline: ListTimeline<AnyEntry>;
  windowDescription: string | null;
}) {
  return (
    <>
      <TimelineBody timeline={timeline} windowDescription={windowDescription} />
      <UnwatchedSection items={timeline.unwatched} />
    </>
  );
}

function TimelineBody({
  timeline,
  windowDescription,
}: {
  timeline: ListTimeline<AnyEntry>;
  windowDescription: string | null;
}) {
  if (timeline.entries.length === 0 || timeline.axis == null) {
    return (
      <EmptyState timeline={timeline} windowDescription={windowDescription} />
    );
  }

  const { axis } = timeline;
  const axisYear = axis.start.getUTCFullYear();
  const events = sequenceEvents(timeline);

  return (
    <section aria-label="Watch timeline">
      <ol>
        <RailRow
          label={
            <span className="block text-xs font-semibold leading-tight">
              {shortDate(axis.start, true)}
            </span>
          }
          marker={<span className={`${DOT} bg-foreground`} />}
        />
        {events.map((ev) => {
          if (ev.kind === "month") {
            return (
              <RailRow
                key={`m-${ev.at.toISOString()}`}
                marker={
                  <span
                    className={`${DOT} border-2 border-border bg-background`}
                  />
                }
              >
                <p className="pt-2 text-xs font-semibold text-muted-foreground">
                  {ev.label}
                </p>
              </RailRow>
            );
          }
          if (ev.kind === "today") {
            return (
              <RailRow
                key="today"
                marker={<span className={`${DOT} bg-primary`} />}
              >
                <p className="pt-2 text-xs font-semibold text-primary">Today</p>
              </RailRow>
            );
          }
          return (
            <RailRow
              key={`d-${ev.dayKey}`}
              label={<DayLabel date={ev.at} axisYear={axisYear} />}
              marker={<span className={`${DOT} bg-foreground/60`} />}
            >
              <ul className="space-y-2">
                {ev.entries.map((entry) => (
                  <EntryRow
                    key={entry.listItemId}
                    entry={entry}
                    axisYear={axisYear}
                  />
                ))}
              </ul>
            </RailRow>
          );
        })}
        <RailRow
          last
          label={
            <span className="block text-xs font-semibold leading-tight">
              {shortDate(axis.end, true)}
            </span>
          }
          marker={<span className={`${DOT} bg-foreground`} />}
        />
      </ol>
    </section>
  );
}
