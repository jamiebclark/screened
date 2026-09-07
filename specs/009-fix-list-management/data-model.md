# Phase 1 Data Model: Fix List Management

**Feature**: `009-fix-list-management` | **Date**: 2026-09-06

> **No Prisma schema change and no migration.** Every field this feature needs already exists in
> `prisma/schema.prisma`. Constitution principle III is satisfied vacuously: nothing to migrate,
> nothing to regenerate.

---

## Persisted entities (existing, unchanged)

### `List` — `prisma/schema.prisma:371`

| Field            | Type                | Role in this feature                                                               |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `id`             | `String` (cuid, PK) | —                                                                                  |
| `name`           | `String`            | **US2** — editable. Validated: trimmed, non-empty, ≤ 100 chars.                    |
| `description`    | `String?`           | **US2** — editable and clearable. Validated: trimmed, ≤ 1000 chars, `""` ⇒ `null`. |
| `slug`           | `String` (unique)   | **US2/FR-013** — never recomputed on update; the list's stable URL.                |
| `ownerId`        | `String` (FK User)  | Authorisation for rename / description / layout (FR-014, FR-018).                  |
| `rankingEnabled` | `Boolean`           | **US1** — gates manual order and the drag affordance (FR-005, FR-006).             |
| `votingEnabled`  | `Boolean`           | Mutually exclusive with `rankingEnabled` (existing rule, preserved).               |
| `displayMode`    | `DisplayMode`       | **US4** — `GRID \| LIST`, editable, list-level (not per viewer).                   |
| `itemCap`        | `Int?`              | Untouched; still validated as a positive integer or null.                          |
| `updatedAt`      | `DateTime`          | Bumped by any PATCH; drives the `/lists` index ordering.                           |

### `ListItem` — `prisma/schema.prisma:410`

| Field         | Type       | Role in this feature                                                                     |
| ------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `id`          | `String`   | Identifies items in the reorder payload.                                                 |
| `listId`      | `String`   | Every id in a reorder payload must belong to this list (existing check, kept).           |
| `mediaItemId` | `String`   | `@@unique([listId, mediaItemId])` — the existing duplicate-add behaviour is preserved.   |
| `position`    | `Int?`     | **US1** — the ranked order. `null` on unranked lists; `1..n` contiguous on ranked lists. |
| `addedAt`     | `DateTime` | Tiebreaker for unranked sorting; also the seed order when ranking is first switched on.  |

### `ListMember` — `prisma/schema.prisma:397`

`role: ListRole (OWNER | CONTRIBUTOR | VIEWER)`. Read-only in this feature, used for authorisation:

| Capability                | OWNER | CONTRIBUTOR | VIEWER | non-member |
| ------------------------- | ----- | ----------- | ------ | ---------- |
| Reorder ranked items      | ✅    | ✅          | ❌     | ❌         |
| Rename / edit description | ✅    | ❌          | ❌     | ❌         |
| Change layout             | ✅    | ❌          | ❌     | ❌         |
| Add titles (search flow)  | ✅    | ✅          | ❌     | ❌         |

### `DisplayMode` enum

`GRID | LIST`. Already mirrored in client code as the literal union `"GRID" | "LIST"` (see
`src/lib/list-presets.ts:7` and the props of `list-settings-panel.tsx`), so no new client-safe enum
mirror module is needed — this feature reuses the existing literal-union convention rather than
importing from `src/generated/prisma/`.

---

## Invariants

| #   | Invariant                                                                                                    | Enforced by                                                                     | Requirement                    |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------ |
| I1  | On a ranked list, the multiset of `position` values is exactly `{1..n}` — unique and contiguous.             | reorder route renumbers by index in one `$transaction`                          | FR-004                         |
| I2  | On an unranked list, every `position` is `null`.                                                             | existing PATCH "ranking turned off" branch (`updateMany` → `null`)              | FR-006, FR-030                 |
| I3  | A newly added item on a ranked list gets `max(position) + 1` — it never displaces an existing rank.          | `POST /api/lists/[slug]/items:98`, already correct; covered by a new unit test  | Edge case (add during reorder) |
| I4  | The rendered order of a ranked list is the stored `position` order, identical for every viewer.              | `orderListItems()` returns one flat sequence, no watched/type partitioning      | FR-002, FR-003                 |
| I5  | The rank number displayed beside an item equals its 1-based index in the rendered sequence.                  | `orderListItems()` returns `displayRank`; views render that, not raw `position` | FR-004, Scenario 1.1           |
| I6  | `List.name` is never empty or whitespace-only after any successful write.                                    | `validateListDetails()` on POST and PATCH; 400 otherwise                        | FR-010                         |
| I7  | `List.slug` is immutable after creation.                                                                     | PATCH never writes `slug` (nor recomputes it from `name`)                       | FR-013                         |
| I8  | Deleting an item from a ranked list may leave a gap in `position`; display ranks stay contiguous regardless. | I5 — display rank is derived, not stored                                        | FR-004                         |
| I9  | A layout change alters presentation only: the set of items rendered is identical in both layouts.            | both layouts consume the same `orderListItems()` output                         | FR-019                         |

**On I8**: item deletion is deliberately _not_ changed to backfill positions. Backfilling would mean
a write on every delete, and I5 already guarantees the user never sees a gap. The next reorder
renumbers the stored values anyway (I1).

---

## Derived / in-memory shapes (new)

These are TypeScript types, not tables.

### `src/lib/list-item-ordering.ts`

```ts
/** Minimal shape the ordering functions need — structurally satisfied by the Prisma row. */
export type OrderableItem = {
  id: string;
  position: number | null;
  addedAt: Date;
  mediaItemId: string;
  mediaItem: { type: "MOVIE" | "TV"; title: string; year: number | null };
  votes: { value: number }[];
};

/** A ranked list renders as one flat sequence with derived, contiguous ranks. */
export type RankedOrdering<T> = {
  mode: "ranked";
  items: (T & { displayRank: number })[];
};

/** An unranked list keeps today's four sections. */
export type GroupedOrdering<T> = {
  mode: "grouped";
  movies: T[];
  tvShows: T[];
  watchedMovies: T[];
  watchedTv: T[];
};

export type ListOrdering<T> = RankedOrdering<T> | GroupedOrdering<T>;

export function orderListItems<T extends OrderableItem>(
  items: T[],
  opts: {
    rankingEnabled: boolean;
    sort: "date_added" | "title" | "votes" | "release";
    watchedMediaItemIds: ReadonlySet<string>;
  },
): ListOrdering<T>;

/** Maps a submitted ordering onto contiguous 1..n positions. Pure; used by the reorder route. */
export function normalizePositions(
  entries: { id: string; position: number }[],
): { id: string; position: number }[];
```

**Validation rules encoded here**

- `rankingEnabled: true` ⇒ `mode: "ranked"`; input is assumed to arrive in `position ASC` order from
  Prisma and is re-sorted defensively by `(position ?? Infinity, addedAt ASC)` so an item with a
  `null` position (possible only if ranking was enabled by a path that missed the backfill) lands at
  the end rather than at the front.
- `rankingEnabled: false` ⇒ `mode: "grouped"`, reproducing today's `sortItems()` + four-way
  partition exactly (this is a lift-and-shift of `page.tsx:60–80` and `:284–295`).
- `normalizePositions` sorts by submitted `position` ascending, breaking ties by `id` for
  determinism, and rewrites `position` as `index + 1`.

### `src/lib/list-validation.ts`

```ts
export const LIST_NAME_MAX_LENGTH = 100;
export const LIST_DESCRIPTION_MAX_LENGTH = 1000;

export type ListDetailsInput = { name?: unknown; description?: unknown };

export type ListDetailsResult =
  | { ok: true; value: { name?: string; description?: string | null } }
  | { ok: false; error: string };

/**
 * Validates the identity fields of a list.
 * - Absent key ⇒ omitted from `value` (caller leaves the column untouched).
 * - `name`: must be a string; trimmed; non-empty; ≤ LIST_NAME_MAX_LENGTH.
 * - `description`: must be a string or null; trimmed; `""`/whitespace/null ⇒ `null` (clears it);
 *   ≤ LIST_DESCRIPTION_MAX_LENGTH.
 */
export function validateListDetails(input: ListDetailsInput): ListDetailsResult;
```

Error strings (user-facing, no diagnostics — FR-031):

| Condition                         | `error`                                          |
| --------------------------------- | ------------------------------------------------ |
| `name` present but not a string   | `"Name must be text"`                            |
| `name` trims to empty             | `"List name is required"`                        |
| `name` over limit                 | `"List name must be 100 characters or fewer"`    |
| `description` present, wrong type | `"Description must be text"`                     |
| `description` over limit          | `"Description must be 1000 characters or fewer"` |

Markup/emoji are **not** stripped or escaped — they are stored as literal text and React escapes
them on render (edge case "Name or description containing markup or emoji"). The list header renders
`{name}` / `{description}` as plain text nodes, not through `MarkdownContent`, so this already holds
and must not be changed.

### `src/lib/title-search-params.ts`

```ts
export type TitleMediaType = "movie" | "tv" | "multi";

export type TitleSearchQuery = {
  q: string;
  mediaType: TitleMediaType;
  year: number | null;
  page: number;
  limit: number;
};

export const TITLE_SEARCH_MIN_YEAR = 1874;
export const TITLE_SEARCH_DEFAULT_LIMIT = 8;
export const TITLE_SEARCH_MAX_LIMIT = 20;

/** Route side: URLSearchParams -> validated query, or a 400-able error message. */
export function parseTitleSearchParams(
  params: URLSearchParams,
  now?: Date,
): { ok: true; value: TitleSearchQuery } | { ok: false; error: string };

/** Client side: state -> query string for /api/search. Inverse of the above. */
export function buildTitleSearchQuery(
  input: Partial<TitleSearchQuery> & { q: string },
): string;
```

**Validation rules**

| Param   | Accepted                                                       | On invalid                                                                      |
| ------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `q`     | any string; trimmed                                            | empty ⇒ `{ ok: true }` with `q: ""` (the route short-circuits to `results: []`) |
| `type`  | `movie` \| `tv` \| `multi`; absent ⇒ `movie` (today's default) | `"Search type must be movie, tv or multi"`                                      |
| `year`  | integer `1874 … currentYear + 10`; absent/empty ⇒ `null`       | `"Year must be a whole number between 1874 and <max>"`                          |
| `page`  | integer `1 … 500` (TMDB's ceiling); absent ⇒ `1`               | `"Page must be a whole number between 1 and 500"`                               |
| `limit` | integer `1 … 20`; absent ⇒ `8`                                 | `"Limit must be a whole number between 1 and 20"`                               |

`type` defaults to `movie` because that is today's behaviour when the parameter is omitted
(`src/app/api/search/route.ts:12`), and `picker-form.tsx` relies on it.

### Search result shape (API response, extended)

```ts
type TitleSearchResult = {
  tmdbId: number;
  title: string;
  poster: string | null; // absolute TMDB w185 URL, or null
  year: number | null;
  type: "movie" | "tv"; // narrowed from today's `string`
};

type TitleSearchResponse = {
  results: TitleSearchResult[];
  page: number;
  totalPages: number;
  totalResults: number;
};
```

`results` keeps its exact current field names and types, so `picker-form.tsx` and
`editable-list-search-add.tsx` need no changes. The three new top-level fields are additive.

---

## State transitions

### Ranked-order lifecycle

```text
unranked (position = null for all)
   │  PATCH /api/lists/[slug] { rankingEnabled: true }
   ▼  → positions assigned 1..n by addedAt ASC (existing behaviour, route.ts:83)
ranked (positions 1..n)
   │  PATCH .../items/reorder { positions: full ordering }
   ▼  → renumbered 1..n by submitted order, one transaction  [I1]
ranked (positions 1..n, new order)
   │  POST .../items         → new item gets max(position)+1  [I3]
   │  DELETE .../items       → leaves a gap; display ranks stay contiguous  [I8]
   │  PATCH /api/lists/[slug] { rankingEnabled: false }
   ▼  → all positions cleared to null (existing behaviour, route.ts:110)
unranked
```

### List identity / layout lifecycle

```text
created (name set, description optional, displayMode from preset)
   │  PATCH /api/lists/[slug] { name?, description?, displayMode? }   [owner only]
   ├─ invalid → 400, nothing written, previous values retained  [I6]
   └─ valid   → columns updated, slug untouched  [I7]
             → router.refresh() re-renders header + items in the new layout
```

No other transitions change. Voting, comments, membership, invitations, imports, item caps, and
visibility are out of scope (spec "Scope boundary").
