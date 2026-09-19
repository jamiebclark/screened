import type { MediaType } from "@/generated/prisma";
import type { ChallengeWindow } from "@/lib/list-challenge-window";
import type { ListWatchHistoryRow } from "@/lib/list-watch-history";
import { utcDayEndExclusive, utcDayStart } from "@/lib/watch-entry-merge";

/**
 * Title-centric view of a list's watch history: every non-hidden title appears
 * once, anchored at its latest qualifying watch, oldest first. The caller is
 * responsible for passing only qualifying watches (inside the challenge window)
 * and only non-hidden items — see `fetchListWatchHistory` and the timeline page.
 */

export type TimelineMedia = {
  tmdbId: number;
  type: MediaType;
  title: string;
  poster: string | null;
  year: number | null;
};

export type TimelineItem = {
  listItemId: string;
  mediaItemId: string;
  mediaItem: TimelineMedia;
};

export type TimelineWatcher = {
  user: { id: string; name: string | null; avatarUrl: string | null };
  /** Earliest watch by this user on this UTC day. */
  watchedAt: Date;
  /** 0 for a film/show-level watch; N when N episode rows were collapsed. */
  episodeCount: number;
};

export type TimelineEntry = TimelineItem & {
  /** Latest qualifying watch of the title. */
  anchorAt: Date;
  /** Ascending by watchedAt, then by user name. */
  watches: TimelineWatcher[];
};

export type AnonymisedTimelineEntry = TimelineItem & {
  anchorAt: Date;
  /** Number of raw qualifying watch rows, before per-day collapsing. */
  watchCount: number;
};

export type UnwatchedItem = TimelineItem;

export type MonthMarker = { at: Date; label: string };

export type ListTimeline<E = TimelineEntry> = {
  /** Null when there is no window and nothing has been watched. */
  axis: { start: Date; end: Date } | null;
  entries: E[];
  unwatched: UnwatchedItem[];
  /** Empty unless the axis spans more than one UTC calendar month. */
  months: MonthMarker[];
  /** `now`, when it falls inside the axis span. */
  today: Date | null;
  windowNotStarted: boolean;
};

export type DayGroup<E extends { anchorAt: Date }> = {
  dayKey: string;
  date: Date;
  entries: E[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function utcDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function compareWatchers(a: TimelineWatcher, b: TimelineWatcher): number {
  const dt = a.watchedAt.getTime() - b.watchedAt.getTime();
  if (dt !== 0) return dt;
  return (a.user.name ?? "").localeCompare(b.user.name ?? "");
}

function collapseWatches(rows: ListWatchHistoryRow[]): TimelineWatcher[] {
  const byUserDay = new Map<string, TimelineWatcher>();
  for (const row of rows) {
    const key = `${row.user.id}|${utcDayKey(row.watchedAt)}`;
    const isEpisode = row.seasonNumber != null && row.episodeNumber != null;
    const existing = byUserDay.get(key);
    if (!existing) {
      byUserDay.set(key, {
        user: row.user,
        watchedAt: row.watchedAt,
        episodeCount: isEpisode ? 1 : 0,
      });
      continue;
    }
    if (row.watchedAt.getTime() < existing.watchedAt.getTime()) {
      existing.watchedAt = row.watchedAt;
    }
    if (isEpisode) existing.episodeCount += 1;
  }
  return [...byUserDay.values()].sort(compareWatchers);
}

function monthMarkersBetween(start: Date, end: Date): MonthMarker[] {
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();
  if (startYear === endYear && startMonth === endMonth) return [];

  const markers: MonthMarker[] = [];
  let year = startYear;
  let month = startMonth + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    if (month > 11) {
      month = 0;
      year += 1;
      continue;
    }
    const at = new Date(Date.UTC(year, month, 1));
    const label =
      year === startYear ? MONTH_NAMES[month] : `${MONTH_NAMES[month]} ${year}`;
    markers.push({ at, label });
    month += 1;
  }
  return markers;
}

type BuildListTimelineInput = {
  /** Non-hidden list items in the list's display order. */
  items: TimelineItem[];
  /** Qualifying watches only (already bounded to the window). */
  watches: ListWatchHistoryRow[];
  window: ChallengeWindow;
  now: Date;
};

export function buildListTimeline({
  items,
  watches,
  window,
  now,
}: BuildListTimelineInput): ListTimeline {
  const rowsByMedia = new Map<string, ListWatchHistoryRow[]>();
  for (const row of watches) {
    const arr = rowsByMedia.get(row.mediaItemId) ?? [];
    arr.push(row);
    rowsByMedia.set(row.mediaItemId, arr);
  }

  const entries: TimelineEntry[] = [];
  const unwatched: UnwatchedItem[] = [];
  for (const item of items) {
    const rows = rowsByMedia.get(item.mediaItemId);
    if (!rows || rows.length === 0) {
      unwatched.push(item);
      continue;
    }
    const anchorAt = rows.reduce(
      (latest, r) =>
        r.watchedAt.getTime() > latest.getTime() ? r.watchedAt : latest,
      rows[0].watchedAt,
    );
    entries.push({
      ...item,
      anchorAt,
      watches: collapseWatches(rows),
    });
  }
  entries.sort((a, b) => {
    const dt = a.anchorAt.getTime() - b.anchorAt.getTime();
    if (dt !== 0) return dt;
    return a.mediaItem.title.localeCompare(b.mediaItem.title);
  });

  // Axis bounds: the window wins where it is set; otherwise the span of the
  // watches actually plotted (anchors are a subset of them, so use all rows).
  let minWatch: Date | null = null;
  let maxWatch: Date | null = null;
  for (const item of items) {
    for (const row of rowsByMedia.get(item.mediaItemId) ?? []) {
      if (minWatch == null || row.watchedAt < minWatch)
        minWatch = row.watchedAt;
      if (maxWatch == null || row.watchedAt > maxWatch)
        maxWatch = row.watchedAt;
    }
  }
  const start = window.startsAt ?? minWatch;
  const end = window.endsAt ?? maxWatch;
  const axis =
    start != null && end != null
      ? { start: utcDayStart(start), end: utcDayStart(end) }
      : null;

  const months = axis ? monthMarkersBetween(axis.start, axis.end) : [];
  const today =
    axis != null &&
    now.getTime() >= axis.start.getTime() &&
    now.getTime() < utcDayEndExclusive(axis.end).getTime()
      ? now
      : null;

  return {
    axis,
    entries,
    unwatched,
    months,
    today,
    windowNotStarted:
      window.startsAt != null && window.startsAt.getTime() > now.getTime(),
  };
}

/**
 * Drops every watcher identity so the result is safe to render for viewers
 * who are not list members. Strip here, in the data, not in the UI: RSC props
 * are visible in the HTML stream.
 */
export function stripWatchers(
  timeline: ListTimeline,
): ListTimeline<AnonymisedTimelineEntry> {
  return {
    ...timeline,
    entries: timeline.entries.map(({ watches, ...rest }) => ({
      ...rest,
      watchCount: watches.reduce(
        (n, w) => n + (w.episodeCount > 0 ? w.episodeCount : 1),
        0,
      ),
    })),
  };
}

/** One group per UTC day, in entry order, so the rail prints each day label once. */
export function groupEntriesByDay<E extends { anchorAt: Date }>(
  entries: E[],
): DayGroup<E>[] {
  const groups: DayGroup<E>[] = [];
  for (const entry of entries) {
    const dayKey = utcDayKey(entry.anchorAt);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.entries.push(entry);
    } else {
      groups.push({
        dayKey,
        date: utcDayStart(entry.anchorAt),
        entries: [entry],
      });
    }
  }
  return groups;
}
