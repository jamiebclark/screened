# Phase 1 Data Model: List Challenge Tracking

**Feature**: `011-list-challenge-tracking` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)

This feature changes the schema in three ways: one new model, one **reshaped** existing model with a
data backfill, and two nullable columns. Per constitution principle III all three land in a single
migration created with `yarn db:migrate --name add_list_tags_and_challenge_window`, and
`prisma/schema.prisma` plus `prisma/migrations/<timestamp>_add_list_tags_and_challenge_window/` are
committed **together**, in a commit that precedes any application code depending on them, followed
by `yarn db:generate`.

---

## 1. Schema changes

### 1.1 `ListTag` — new model, the canonical vocabulary

```prisma
model ListTag {
  id         String   @id @default(cuid())
  listId     String
  label      String
  normalized String
  createdAt  DateTime @default(now())

  list  List          @relation(fields: [listId], references: [id], onDelete: Cascade)
  items ListItemTag[]

  @@unique([listId, normalized])
  @@index([listId])
}
```

| Field        | Type       | Notes                                                                                   |
| ------------ | ---------- | --------------------------------------------------------------------------------------- |
| `label`      | `String`   | Display casing. The **single** source of truth for how a tag reads (FR-005).            |
| `normalized` | `String`   | `tagComparisonKey(label)` — trimmed, whitespace-collapsed, lowercased. Comparison form. |
| `createdAt`  | `DateTime` | Declaration time. For backfilled rows, the `createdAt` of the oldest assignment (R2).   |

`@@unique([listId, normalized])` enforces FR-004 in the database, case- and whitespace-insensitively,
rather than in application code. `@@index([listId])` serves the list page's `list.tags` include.

### 1.2 `ListItemTag` — reshaped into a pure join

```prisma
model ListItemTag {
  id         String   @id @default(cuid())
  listItemId String
  listTagId  String                       // NEW — replaces label + normalized
  createdAt  DateTime @default(now())

  listItem ListItem @relation(fields: [listItemId], references: [id], onDelete: Cascade)
  listTag  ListTag  @relation(fields: [listTagId], references: [id], onDelete: Cascade)

  @@unique([listItemId, listTagId])       // was @@unique([listItemId, normalized])
  @@index([listItemId])
  @@index([listTagId])                    // NEW — rename/delete and count queries
}
```

**Removed**: `label`, `normalized`. An assignment now carries **no name of its own**, which is what
makes FR-005 structural — there is nothing to update on rename and nothing that can drift.

`onDelete: Cascade` on `listTag` delivers FR-006 (deleting a tag removes it from every item) for
free, and the existing cascade on `listItem` still removes an item's assignments with the item.

### 1.3 `List` — two new nullable columns and one new relation

```prisma
model List {
  // … unchanged fields …
  challengeStartsAt  DateTime?   // NEW
  challengeEndsAt    DateTime?   // NEW

  owner          User                @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members        ListMember[]
  items          ListItem[]
  accessRequests ListAccessRequest[]
  tags           ListTag[]           // NEW
}
```

| Field               | Type        | Default | Notes                                                           |
| ------------------- | ----------- | ------- | --------------------------------------------------------------- |
| `challengeStartsAt` | `DateTime?` | `null`  | Stored at **UTC day start** (R9). `null` = no lower bound.      |
| `challengeEndsAt`   | `DateTime?` | `null`  | Stored at **UTC day start**; expanded to day-end at query time. |

Both nullable with no default: `null`/`null` is the correct pre-feature state for every existing
list and means "no window" (FR-014, FR-026, FR-020).

**No index** on either column. They are only ever read from a `List` row already fetched by `slug`;
nothing filters lists _by_ their window.

### 1.4 Unchanged

`ListItem`, `ListMember`, `ListItemVote`, `ListItemComment`, `ListItemCommentRead`, `WatchEntry`,
`EpisodeStatus`, `MediaItem` — untouched. This feature **reads** `WatchEntry` and `EpisodeStatus`
and writes neither (spec: "the history is a view, not a new log").

---

## 2. Migration body (hand-written)

Prisma will not generate a correct diff for §1.2 on its own — it would drop `label`/`normalized`
and add a `NOT NULL listTagId` with no data path. The generated file is edited to the following,
which runs in the transaction Prisma wraps around a migration. Order is the requester's explicit
condition: **copy before drop**.

```sql
-- 1. The new canonical vocabulary table.
CREATE TABLE "ListTag" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListTag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListTag_listId_idx" ON "ListTag"("listId");
CREATE UNIQUE INDEX "ListTag_listId_normalized_key" ON "ListTag"("listId", "normalized");
ALTER TABLE "ListTag" ADD CONSTRAINT "ListTag_listId_fkey"
    FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill one ListTag per (listId, normalized). The label and createdAt come from the
--    OLDEST assignment carrying that normalized form, which is exactly the tie-break
--    buildTagVocabulary() uses today, so displayed names do not change.
INSERT INTO "ListTag" ("id", "listId", "label", "normalized", "createdAt")
SELECT DISTINCT ON (li."listId", t."normalized")
       gen_random_uuid()::text, li."listId", t."label", t."normalized", t."createdAt"
FROM "ListItemTag" t
JOIN "ListItem" li ON li."id" = t."listItemId"
ORDER BY li."listId", t."normalized", t."createdAt" ASC, t."id" ASC;

-- 3. Nullable first, so existing rows survive the ALTER.
ALTER TABLE "ListItemTag" ADD COLUMN "listTagId" TEXT;

-- 4. Point every existing assignment at its ListTag.
UPDATE "ListItemTag" t
SET "listTagId" = lt."id"
FROM "ListItem" li, "ListTag" lt
WHERE li."id" = t."listItemId"
  AND lt."listId" = li."listId"
  AND lt."normalized" = t."normalized";

-- 5. The safety net. If step 4 missed even one row this raises and the whole migration
--    rolls back. Do NOT "fix" a failure here by deleting NULL rows — that destroys the
--    exact data FR-010 protects.
ALTER TABLE "ListItemTag" ALTER COLUMN "listTagId" SET NOT NULL;

-- 6. Only now is it safe to drop the denormalized shape.
DROP INDEX "ListItemTag_listItemId_normalized_key";
ALTER TABLE "ListItemTag" DROP COLUMN "label";
ALTER TABLE "ListItemTag" DROP COLUMN "normalized";

-- 7. New constraints on the join.
CREATE UNIQUE INDEX "ListItemTag_listItemId_listTagId_key" ON "ListItemTag"("listItemId", "listTagId");
CREATE INDEX "ListItemTag_listTagId_idx" ON "ListItemTag"("listTagId");
ALTER TABLE "ListItemTag" ADD CONSTRAINT "ListItemTag_listTagId_fkey"
    FOREIGN KEY ("listTagId") REFERENCES "ListTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. The challenge window.
ALTER TABLE "List" ADD COLUMN "challengeStartsAt" TIMESTAMP(3);
ALTER TABLE "List" ADD COLUMN "challengeEndsAt" TIMESTAMP(3);
```

**Why step 7 needs no dedup pass**: the dropped `@@unique([listItemId, normalized])` already
guaranteed one row per (item, normalized form), and step 4 maps each normalized form to exactly one
`ListTag` per list — so the resulting `(listItemId, listTagId)` pairs are unique by construction.

**`gen_random_uuid()`** is core in Postgres 16, which both `docker-compose.yml` and
`.github/workflows/ci.yml` pin; no `pgcrypto` extension is required (R3). Backfilled ids are UUID
strings while application-created ids are cuids — both are opaque `TEXT` and nothing parses them.

**Verification**: `yarn ci:check` runs `migrate` from scratch, which proves the migration applies to
an empty database. To prove the _backfill_, run it against a database seeded with the pre-feature
shape — the counts in [quickstart.md §0](./quickstart.md) are the check (SC-002).

---

## 3. Derived (not stored) entities

Nothing below is persisted; each is computed per request by a pure function so its rules are
unit-testable.

### 3.1 `TagVocabularyEntry` — `src/lib/list-item-tags.ts`

```ts
type TagVocabularyEntry = { id: string; label: string; normalized: string; count: number };

buildTagVocabulary(
  listTags: { id: string; label: string; normalized: string; createdAt: Date }[],
  items: { tags: { listTagId: string }[] }[],
): TagVocabularyEntry[]
```

| Rule                                                                       | Requirement               |
| -------------------------------------------------------------------------- | ------------------------- |
| Seeded from `listTags`, so a tag with no assignments appears at `count: 0` | FR-007, FR-009            |
| `count` = number of items carrying the tag, **including hidden** items     | unchanged from today (R7) |
| Sort: `count` desc, then `normalized` asc — unused tags last, alphabetical | unchanged from today      |
| `id` is the `ListTag` id — the rename/delete target and the link target    | R7                        |

### 3.2 `TagBatchResult` — `src/lib/list-item-tags.ts`

```ts
type TagBatchResult =
  | {
      ok: true;
      value: {
        linkTagIds: string[];
        createTags: { label: string; normalized: string }[];
      };
    }
  | { ok: false; error: string };
```

| Rule                                                                           | Requirement                       |
| ------------------------------------------------------------------------------ | --------------------------------- |
| Label already assigned to this item → silently skipped (set-merge, unchanged)  | 010 FR-014                        |
| Normalized form already a `ListTag` → `linkTagIds`, reusing that tag's `label` | FR-004, FR-008                    |
| Otherwise → `createTags`, so the label becomes a `ListTag` in the same tx      | FR-008                            |
| In-batch duplicates collapse before either bucket                              | 010 FR-014                        |
| `existing.length + linkTagIds.length + createTags.length > 15` → `ok: false`   | spec edge case "a tag capped out" |
| Empty / over-30-character labels → `ok: false`, messages unchanged verbatim    | regression                        |

### 3.3 `ChallengeWindow` — `src/lib/list-challenge-window.ts`

```ts
type ChallengeWindow = { startsAt: Date | null; endsAt: Date | null };

parseChallengeWindowInput(input: { challengeStartsAt?: unknown; challengeEndsAt?: unknown },
                          current: ChallengeWindow): ParseResult   // validate + normalize
challengeWindowBounds(window: ChallengeWindow): { gte?: Date; lt?: Date } | null
hasChallengeWindow(window: ChallengeWindow): boolean
isWithinChallengeWindow(watchedAt: Date, window: ChallengeWindow): boolean
describeChallengeWindow(window: ChallengeWindow): string | null
```

| Rule                                                                                         | Requirement             |
| -------------------------------------------------------------------------------------------- | ----------------------- |
| Accepts `"YYYY-MM-DD"`, a full ISO datetime, or `null`; anything else → `400`                | FR-011                  |
| Normalizes both to `utcDayStart()`                                                           | R9                      |
| End earlier than start → `{ ok: false }`, nothing saved                                      | FR-013, SC-009          |
| A field absent from the body leaves the stored value alone; explicit `null` clears it        | FR-014                  |
| `bounds` maps end → `utcDayEndExclusive()`, so both boundaries are inclusive                 | FR-017, spec edge case  |
| One end only → one bound; both `null` → `null` (no date restriction)                         | FR-020, spec assumption |
| `describe…` renders "1 Sep – 31 Oct 2026", "From 1 Sep 2026", "Up to 31 Oct 2026", or `null` | UI copy                 |

### 3.4 `ListStats` — `src/lib/list-stats.ts` (extended)

`computeListStats(items, listTags)` keeps all seven existing fields with unchanged definitions and
gains:

| Field          | Meaning                                                         | Requirement    |
| -------------- | --------------------------------------------------------------- | -------------- |
| `declaredTags` | `listTags.length` — every tag the list holds                    | FR-009, SC-001 |
| `tagCounts`    | now seeded from `listTags`, so unused tags appear at `count: 0` | FR-009         |

`distinctVisibleTags` still means "distinct tags carried by at least one non-hidden item", so the
existing "Tags in use" tile keeps its meaning and its test.

### 3.5 `WindowStats` — `src/lib/list-stats.ts` (new)

```ts
type WindowStats = {
  watchedTitles: number;
  coveredTags: number;
  declaredTags: number;
  coveredDecades: number;
  coveredCountries: number;
  tagCoverage: { id: string; label: string; normalized: string; covered: boolean }[];
  decades: number[];
  countryCodes: string[];
};

computeWindowStats(items, listTags, watchedMediaItemIds: ReadonlySet<string>): WindowStats
```

| Rule                                                                                     | Requirement                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| An item contributes only if `watchedMediaItemIds.has(item.mediaItemId)`                  | FR-022, SC-004                           |
| Hidden items never contribute to any figure                                              | spec edge case, consistent with all-time |
| Each tag / decade / country credited **once**, regardless of how many watches            | FR-024                                   |
| All members' watches are already unioned into the set before it arrives                  | FR-023                                   |
| `tagCoverage` lists every declared tag with `covered: false` where nothing covers it     | FR-021, SC-005                           |
| Titles with no year contribute no decade; with no countries, no country — never an error | spec edge case                           |
| Untagged titles still contribute decade and country coverage                             | spec assumption                          |

`watchedMediaItemIds` is produced by `fetchListInWindowWatchedMediaItemIds()` (§3.6), which is where
the date filtering lives. Keeping the filter out of the counting function is what makes SC-004
("only watch predates the window ⇒ zero; watched again inside ⇒ one") a unit test (R10).

### 3.6 `ListWatchHistoryRow` — `src/lib/list-watch-history.ts` (new)

```ts
type ListWatchHistoryRow = {
  id: string;                    // WatchEntry id, or `es:<EpisodeStatus id>`
  watchedAt: Date;
  mediaItemId: string;
  mediaItem: { tmdbId: number; type: MediaType; title: string; poster: string | null; year: number | null };
  user: { id: string; name: string; avatarUrl: string | null };
  seasonNumber?: number;         // TV episode viewings only
  episodeNumber?: number;
};

mergeListWatchRows(a: ListWatchHistoryRow[], b: ListWatchHistoryRow[]): ListWatchHistoryRow[]   // pure
fetchListWatchHistory(input): Promise<ListWatchHistoryRow[]>
fetchListInWindowWatchedMediaItemIds(input): Promise<Set<string>>
```

| Rule                                                                                        | Requirement     |
| ------------------------------------------------------------------------------------------- | --------------- |
| Sources: `WatchEntry` **and** `EpisodeStatus` (`isWatched: true`), merged newest-first      | FR-018          |
| Scoped to `mediaItemId IN` the list's media ids and `userId IN` current members ∪ owner     | FR-015, FR-016  |
| Date bounds from `challengeWindowBounds()`; absent when the list has no window              | FR-017, FR-020  |
| The `es:` id prefix matches `episodeStatusRowToHistoryItem()` in `watch-history-queries.ts` | consistency     |
| `watchHistoryVisibility` is **not** consulted — see [research.md R11](./research.md)        | spec assumption |

The `es:` prefix and the two-source merge mirror `fetchFriendsWatchHistoryInRange()` exactly; the
only differences are the scope (list membership instead of friendship) and the absent visibility
filter, both stated at the top of the new module.

---

## 4. Invariants

| #   | Invariant                                                                                      | Enforced by                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A list holds at most one tag per normalized form                                               | `@@unique([listId, normalized])`                                                                                                                |
| 2   | An item carries a given tag at most once                                                       | `@@unique([listItemId, listTagId])`                                                                                                             |
| 3   | An assignment always points at a tag **of its own item's list**                                | only `POST …/items/[itemId]/tags` creates assignments, and it resolves ids from that list's vocabulary (§3.2); the FK guarantees the tag exists |
| 4   | A tag reads with exactly one name everywhere                                                   | `label` exists on one row only (§1.2)                                                                                                           |
| 5   | Deleting a tag removes every assignment of it                                                  | `onDelete: Cascade` on `listTag`                                                                                                                |
| 6   | Deleting an item or a list removes its assignments and (for a list) its tags                   | existing cascades + §1.1 cascade                                                                                                                |
| 7   | Every pre-feature assignment survives the migration, on the same item, reading the same name   | §2 steps 2–5, with step 5 as the abort-on-mismatch net                                                                                          |
| 8   | `challengeEndsAt` is never earlier than `challengeStartsAt`                                    | `parseChallengeWindowInput()` at the only write site (`PATCH /api/lists/[slug]`)                                                                |
| 9   | A title contributes to in-window figures only if watched inside the window by a current member | `fetchListInWindowWatchedMediaItemIds()` + `computeWindowStats()` (§3.5, §3.6)                                                                  |

Invariant 3 is the one with no database backstop — Postgres cannot express "the tag's `listId`
equals the item's `listId`" without a trigger or a denormalized column. It is instead guaranteed by
there being a **single** write path, which is why the item-tag route resolves labels through the
list's own vocabulary rather than accepting a `listTagId` from the client.
