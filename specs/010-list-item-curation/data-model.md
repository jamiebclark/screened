# Phase 1 Data Model: List Item Curation (hide, tags, stats)

**Feature**: `010-list-item-curation` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)

This feature **does** change the schema: one new column and one new model. Per constitution
principle III, both land through `yarn db:migrate`, and `prisma/schema.prisma` + the generated
`prisma/migrations/<timestamp>_*/` folder are committed together, in a commit that precedes any
application code depending on them.

---

## 1. Schema changes

### 1.1 `ListItem` — new column

```prisma
model ListItem {
  id            String   @id @default(cuid())
  listId        String
  mediaItemId   String
  addedById     String
  notes         String?
  noteIsSpoiler Boolean  @default(false)
  isHidden      Boolean  @default(false)   // NEW
  position      Int?
  addedAt       DateTime @default(now())

  list         List                  @relation(fields: [listId], references: [id], onDelete: Cascade)
  mediaItem    MediaItem             @relation(fields: [mediaItemId], references: [id], onDelete: Cascade)
  addedBy      User                  @relation(fields: [addedById], references: [id], onDelete: Cascade)
  votes        ListItemVote[]
  comments     ListItemComment[]
  commentReads ListItemCommentRead[]
  tags         ListItemTag[]                                     // NEW

  @@unique([listId, mediaItemId])
}
```

| Field      | Type      | Default | Notes                                                                 |
| ---------- | --------- | ------- | --------------------------------------------------------------------- |
| `isHidden` | `Boolean` | `false` | Shared across every viewer of the list (FR-001). Never viewer-scoped. |

**Backfill**: none required — `@default(false)` gives every existing row the "not hidden" state,
which is the correct pre-feature semantics.

**No index.** `page.tsx` loads the whole (item-capped) item set in one query and filters in memory
(see [research.md R7](./research.md)); no query ever filters on `isHidden` in SQL.

### 1.2 `ListItemTag` — new model

```prisma
model ListItemTag {
  id         String   @id @default(cuid())
  listItemId String
  label      String
  normalized String
  createdAt  DateTime @default(now())

  listItem ListItem @relation(fields: [listItemId], references: [id], onDelete: Cascade)

  @@unique([listItemId, normalized])
  @@index([listItemId])
}
```

| Field        | Type       | Notes                                                                                     |
| ------------ | ---------- | ----------------------------------------------------------------------------------------- |
| `id`         | `String`   | cuid; the handle `DELETE …/tags/[tagId]` addresses.                                       |
| `listItemId` | `String`   | FK → `ListItem.id`, `onDelete: Cascade` (satisfies FR-018).                               |
| `label`      | `String`   | Display casing, trimmed and whitespace-collapsed. Rendered in chips and suggestions.      |
| `normalized` | `String`   | Comparison form: trim → collapse whitespace runs → `toLocaleLowerCase()`. Never rendered. |
| `createdAt`  | `DateTime` | Used to resolve "the list's first-used casing" when canonicalising a new tag's label.     |

**Invariants:**

- `@@unique([listItemId, normalized])` — the same tag cannot appear twice on one item, and
  "Halloween" / " halloween " collide because the key is the normalized form (FR-013, FR-014).
- `normalized === normalizeTagLabel(label)` must hold for every row. Enforced in one place: the
  `POST …/tags` handler is the only writer, and it derives both from the pure functions in
  `src/lib/list-item-tags.ts`.
- `label.length <= 30` after trim + collapse (FR-015). Enforced in application validation, not as a
  DB constraint — the limit is a presentational convenience per the spec's assumptions and may be
  tuned without a migration.
- At most 15 tags per `listItemId` (FR-015). Enforced in the handler against the **resulting** set,
  so re-submitting an existing tag on a full item is a no-op rather than a 400.

**No unique constraint across the list.** Two different items in the same list may (and normally
will) each carry a row for the same normalized tag; the "vocabulary" is the distinct set of those
rows, derived at render time. This is what makes FR-016 automatic: the last row for a tag going away
removes it from the vocabulary with no cleanup step.

### 1.3 Migration

```bash
yarn db:migrate --name add_list_item_hidden_and_tags
yarn db:generate
```

One migration for both changes: they are one schema layer and one logical concern (per-item
curation state), and splitting them would leave an intermediate state nothing uses.

---

## 2. Derived (non-persisted) entities

### 2.1 Tag vocabulary — `src/lib/list-item-tags.ts`

Computed per render from the items the page already loaded. Nothing stored.

```ts
export type TagVocabularyEntry = {
  label: string; // canonical display casing = earliest createdAt for this normalized form
  normalized: string;
  count: number; // how many items in this list carry it
};

export function buildTagVocabulary(
  items: { tags: { label: string; normalized: string; createdAt: Date }[] }[],
): TagVocabularyEntry[];

export function suggestTags(
  vocabulary: TagVocabularyEntry[],
  query: string,
  opts?: { limit?: number; exclude?: readonly string[] }, // exclude: normalized forms already on the item
): TagVocabularyEntry[];
```

- `buildTagVocabulary` groups by `normalized`, counts items, picks the earliest-`createdAt` label,
  and returns entries ordered by `count` desc then `normalized` asc.
- `suggestTags` filters by prefix match first, then substring, dedups, applies `exclude`, and caps
  at `limit` (default 6). Empty/whitespace query → `[]`.

**Scope invariant**: the function's only input is this list's items, so no tag from another list can
appear (FR-012, SC-005). There is no parameter through which another list's data could enter.

### 2.2 Tag input parsing / validation — `src/lib/list-item-tags.ts`

```ts
export const TAG_MAX_LENGTH = 30;
export const TAG_MAX_PER_ITEM = 15;

export function normalizeTagLabel(raw: string): string; // display form: trim + collapse
export function tagComparisonKey(raw: string): string; // normalized form: + lowercase
export function splitTagInput(raw: string): string[]; // splits on ",", drops empty fragments

export type TagBatchResult =
  | { ok: true; value: { label: string; normalized: string }[] }
  | { ok: false; error: string };

export function validateTagBatch(
  labels: unknown,
  existing: { label: string; normalized: string }[],
  vocabulary: TagVocabularyEntry[],
): TagBatchResult;
```

`validateTagBatch` is the single gate used by the API route:

| Input condition                                        | Result                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| not an array, or any element not a string              | `{ ok: false, error: "Tags must be text" }`                                |
| any element empty or whitespace-only after normalising | `{ ok: false, error: "Tag cannot be empty" }`                              |
| any element longer than 30 chars                       | `{ ok: false, error: "Tags must be 30 characters or fewer" }`              |
| resulting set would exceed 15 tags on the item         | `{ ok: false, error: "An item can have at most 15 tags" }`                 |
| element's normalized form already on the item          | dropped from `value` (silent no-op, not an error) — FR-014, acceptance 2.4 |
| element's normalized form already in the list          | `label` canonicalised to the vocabulary's display casing — R4              |
| otherwise                                              | `{ ok: true, value: [...] }` with only the rows that need inserting        |

All-or-nothing: any single failure returns `ok: false` and the route writes nothing, leaving existing
tags untouched (FR-015).

### 2.3 Hidden filter — `src/lib/list-view-params.ts`

Absorbs the `parseSort` currently inline in `page.tsx:33-38`, which has no unit tests today.

```ts
export type SortField = "date_added" | "title" | "votes" | "release";
export type HiddenFilter = "include" | "exclude";

export function parseListViewParams(
  raw: { sort?: string; hidden?: string },
  opts: { votingEnabled: boolean },
): { sort: SortField; hiddenFilter: HiddenFilter };
```

- `sort`: unchanged semantics — unknown values and `votes` on a non-voting list fall back to
  `date_added`.
- `hiddenFilter`: `"exclude"` only when `raw.hidden === "exclude"`; everything else, including
  absent and garbage, yields `"include"` (the default view, FR-004).

`HiddenFilter` is a plain TypeScript union, **not** a Prisma enum, so it is safe to import from
client components directly — no `notification-types.ts` mirror needed
([research.md R13](./research.md)).

### 2.4 Ordering + filter composition — `src/lib/list-item-ordering.ts` (extended)

`orderListItems()` and `normalizePositions()` are **not modified**. One pure function is added:

```ts
export function filterHiddenFromOrdering<T extends { isHidden: boolean }>(
  ordering: ListOrdering<T>,
  hiddenFilter: HiddenFilter,
): ListOrdering<T>;
```

- `hiddenFilter === "include"` → returns the ordering unchanged (same object is fine; callers do not
  mutate).
- `hiddenFilter === "exclude"` → for `mode: "ranked"`, filters `items` and **preserves every
  surviving item's `displayRank` verbatim**; for `mode: "grouped"`, filters each of `movies`,
  `tvShows`, `watchedMovies`, `watchedTv` independently so no item crosses a section boundary.

`OrderableItem` gains `isHidden: boolean` — the Prisma row already satisfies it structurally once
the column exists, exactly as the existing fields do.

**Call order in `page.tsx` is load-bearing** and must be: load all items → `orderListItems(all)` →
`filterHiddenFromOrdering(...)`. Reversing it renumbers ranks and breaks FR-007, acceptance 1.8 and
SC-008.

### 2.5 List stats — `src/lib/list-stats.ts`

```ts
export type ListStats = {
  totalItems: number;
  visibleItems: number;
  distinctDecades: number;
  distinctVisibleTags: number;
};

export function computeListStats(
  items: {
    isHidden: boolean;
    mediaItem: { year: number | null };
    tags: { normalized: string }[];
  }[],
): ListStats;
```

| Figure                | Definition                                                                         | Requirement        |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------ |
| `totalItems`          | `items.length` — hidden included                                                   | FR-020             |
| `visibleItems`        | count of `!isHidden`                                                               | FR-020             |
| `distinctDecades`     | `new Set(items.filter(y != null).map(Math.floor(year / 10))).size` — **all** items | FR-021, AS-3.2/3.3 |
| `distinctVisibleTags` | `new Set(items.filter(!isHidden).flatMap(t => t.normalized)).size`                 | FR-022, AS-3.4     |

Empty list → `{ 0, 0, 0, 0 }`, and the modal renders its explanatory empty state rather than four
zeros in a vacuum (FR-023).

Nothing is stored and there is no write path, which is how FR-024 (read-only) is guaranteed.

### 2.6 Curation permissions — `src/lib/list-item-permissions.ts`

```ts
export function canCurateListItems(input: {
  isOwner: boolean;
  memberRole: "OWNER" | "CONTRIBUTOR" | "VIEWER" | null;
}): boolean;
```

Returns `true` for the list owner and for members whose role is `OWNER` or `CONTRIBUTOR`; `false`
for `VIEWER` and for non-members (including a non-member viewing a public list). Governs the hide
toggle and tag editing on **any** item of the list (FR-002, FR-003, FR-010,
[research.md R5](./research.md)).

Item **notes** authorisation is untouched: `PATCH /api/lists/[slug]/items/[itemId]` keeps
`isOwner || isAdder`.

---

## 3. State transitions

### 3.1 Hidden state

```text
        PATCH …/hidden { isHidden: true }
not hidden  ─────────────────────────────►  hidden
     ▲                                        │
     └────────────────────────────────────────┘
        PATCH …/hidden { isHidden: false }
```

- Absolute set, not a flip → concurrent toggles are last-write-wins with no lost update.
- A transition to the state the item is already in is a successful no-op (200), not an error.
- The transition changes **nothing else**: `notes`, `noteIsSpoiler`, `position`, `addedAt`,
  `addedById`, votes, comments and tags are all left alone (FR-006). Enforced by the handler
  writing `data: { isHidden }` and nothing more.

### 3.2 Tags

```text
POST …/tags { labels }   →  merge: new normalized forms inserted, existing ones skipped
DELETE …/tags/[tagId]    →  row removed; if it was the list's last row for that
                            normalized form, the tag leaves the vocabulary automatically (FR-016)
ListItem deleted         →  cascade removes every tag row (FR-018)
```

Tags are editable on hidden items exactly as on visible ones (FR-017) — no handler consults
`isHidden`.

---

## 4. Read path (`src/app/(app)/lists/[slug]/page.tsx`)

Changes to the existing query and render, in order:

1. `include.items.include` gains
   `tags: { select: { id: true, label: true, normalized: true, createdAt: true }, orderBy: { createdAt: "asc" } }`.
   `isHidden` arrives automatically with the row.
2. `parseSort` is replaced by `parseListViewParams({ sort, hidden }, { votingEnabled })`; `searchParams`
   type gains `hidden?: string`.
3. `orderListItems(list.items, …)` — **unchanged, on the full set**.
4. `filterHiddenFromOrdering(ordering, hiddenFilter)` — new step, after ordering.
5. `computeListStats(list.items)` — on the **full** set, never the filtered one.
6. `buildTagVocabulary(list.items)` — on the full set (a tag used only on a hidden item stays in the
   vocabulary; only the _stats_ figure is visible-only).
7. `canCurate = canCurateListItems({ isOwner, memberRole: memberRecord?.role ?? null })` replaces the
   inline `isContributor` expression.
8. `canReorder = list.rankingEnabled && canCurate && hiddenFilter === "include"` (FR-008).
9. `GridItem` gains `isHidden: boolean` and `tags: { id: string; label: string; normalized: string }[]`;
   `toGridItem` maps them through.

`RawItem` gains the matching `isHidden` and `tags` fields.

**Counts in the header** (`itemCount`, `watchedCount`) continue to be computed from the full item
set — hiding does not change how many items a list has.

---

## 5. Requirement → data-model trace

| Requirement                 | Where it is satisfied                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| FR-001 shared hidden state  | §1.1 single `ListItem.isHidden` column; no viewer dimension exists         |
| FR-002/003 who may toggle   | §2.6 `canCurateListItems` + the route's own check                          |
| FR-004 faded by default     | §2.3 `hiddenFilter` defaults to `"include"`; §R11 opacity + `EyeOff` badge |
| FR-005 shareable filter     | §2.3 `?hidden=exclude`                                                     |
| FR-006 nothing else changes | §3.1 handler writes only `isHidden`                                        |
| FR-007 no renumbering       | §2.4 order-then-filter, `displayRank` preserved                            |
| FR-008 no reorder filtered  | §4 step 8                                                                  |
| FR-009 revert on failure    | Client-side optimistic state + revert (contract: `hidden-patch.md`)        |
| FR-010/011 tag read/write   | §2.6 for write; tags ride the page render for every viewer                 |
| FR-012 per-list vocabulary  | §2.1 — derived from this list's items only; no cross-list input exists     |
| FR-013 case/whitespace      | §1.2 `normalized` column + §2.2 `tagComparisonKey`                         |
| FR-014 no dup on item       | §1.2 `@@unique([listItemId, normalized])`                                  |
| FR-015 limits               | §2.2 `validateTagBatch`, all-or-nothing                                    |
| FR-016 unused tag drops     | §1.2 no separate vocabulary table; §2.1 derived per render                 |
| FR-017 tags on hidden items | §3.2 — no tag handler reads `isHidden`                                     |
| FR-018 delete cascades      | §1.2 `onDelete: Cascade`                                                   |
| FR-019/020 stats figures    | §2.5 `computeListStats`; header button per R8                              |
| FR-021 decades all items    | §2.5 table                                                                 |
| FR-022 tags visible only    | §2.5 table                                                                 |
| FR-023 empty state          | §2.5 zeros + modal empty state                                             |
| FR-024 read-only            | §2.5 — no write path to a derived value                                    |
| FR-025 access rules         | §4 — everything rides the page's existing visibility gate                  |
| FR-026 hidden counts to cap | Unchanged `list.items.length` check in `POST …/items` (research.md R12)    |
| FR-027 UI/UX standards      | plan.md "UI/UX density decisions"                                          |
