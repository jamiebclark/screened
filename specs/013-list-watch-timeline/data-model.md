# Data Model: List Watch Timeline

No schema changes. Everything is derived at request time from existing rows.

## Source tables (read-only)

| Table           | Fields used                                                               | Filter                                                                                |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `List`          | `id, slug, name, visibility, ownerId, challengeStartsAt, challengeEndsAt` | by `slug`                                                                             |
| `ListMember`    | `userId`                                                                  | by `listId`                                                                           |
| `ListItem`      | `id, mediaItemId, isHidden, position, addedAt`                            | `listId`, **`isHidden = false`**; ordered `position asc, addedAt desc` (list order)   |
| `MediaItem`     | `id, tmdbId, type, title, poster, year`                                   | via `ListItem`                                                                        |
| `WatchEntry`    | `id, userId, mediaItemId, watchedAt`                                      | `mediaItemId in items`, `userId in owner+members`, `watchedAt` inside window (if set) |
| `EpisodeStatus` | `id, userId, mediaItemId, watchedAt, seasonNumber, episodeNumber`         | same, plus `isWatched = true`                                                         |

`WatchEntry` + `EpisodeStatus` are fetched and merged by the existing `fetchListWatchHistory` (`src/lib/list-watch-history.ts`) into `ListWatchHistoryRow[]`; `take` becomes optional (no cap when omitted).

## Derived types (`src/lib/list-watch-timeline.ts`)

```ts
type TimelineMedia = {
  tmdbId: number;
  type: MediaType; // MOVIE | TV
  title: string;
  poster: string | null;
  year: number | null;
};

type TimelineWatcher = {
  user: { id: string; name: string | null; avatarUrl: string | null };
  watchedAt: Date; // earliest watch in this (user, UTC day) group
  episodeCount: number; // 0 for a film/show-level watch; N for N episode rows that day
};

type TimelineEntry = {
  listItemId: string;
  mediaItemId: string;
  mediaItem: TimelineMedia;
  anchorAt: Date; // latest qualifying watch
  watches: TimelineWatcher[]; // ascending by watchedAt, then by user name
};

type AnonymisedTimelineEntry = Omit<TimelineEntry, "watches"> & {
  watchCount: number; // total qualifying watch rows (pre-collapse)
};

type UnwatchedItem = {
  listItemId: string;
  mediaItemId: string;
  mediaItem: TimelineMedia;
};

type MonthMarker = { at: Date; label: string }; // first instant (UTC) of the month, "October 2026"

type ListTimeline<E = TimelineEntry> = {
  axis: { start: Date; end: Date } | null; // null ⇢ no window and no entries
  entries: E[]; // ascending by anchorAt, then title
  unwatched: UnwatchedItem[]; // list display order
  months: MonthMarker[]; // empty when axis is within one month
  today: Date | null; // now, when inside the axis span
  windowNotStarted: boolean; // window.startsAt > now
};
```

### Functions

| Function                                             | Purpose                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `buildListTimeline({ items, watches, window, now })` | Pure builder implementing FR-003, FR-006, FR-008, FR-009, FR-010. Never reads the database.                |
| `stripWatchers(timeline)`                            | Returns `ListTimeline<AnonymisedTimelineEntry>`; removes every `user` reference (FR-005 non-member shape). |
| `groupEntriesByDay(entries)`                         | Rendering helper: `{ dayKey, date, entries[] }[]` so the rail prints one day label per day.                |

### Invariants

- `entries.length + unwatched.length === items.length` (SC-003).
- Every `entry.anchorAt` lies inside `axis` when `axis` is non-null (SC-002).
- `months` is empty unless `axis.start` and `axis.end` fall in different UTC calendar months.
- `today` is non-null only when `axis.start <= now < utcDayEndExclusive(axis.end)`.
- `stripWatchers` output contains no key named `user`, `name`, or `avatarUrl` (asserted in Vitest by JSON-serialising the result).

## Access matrix (unchanged, reused)

| List tier | Logged-out             | Signed-in non-member     | Owner / member |
| --------- | ---------------------- | ------------------------ | -------------- |
| PUBLIC    | anonymised timeline    | anonymised timeline      | full timeline  |
| MEMBERS   | → `/login?callbackUrl` | anonymised timeline      | full timeline  |
| PRIVATE   | → `/login?callbackUrl` | → `/lists/<slug>` (gate) | full timeline  |

Decision source: `resolveListAccess` in `src/lib/list-visibility.ts`; watcher visibility: `isOwner || isMember`.
