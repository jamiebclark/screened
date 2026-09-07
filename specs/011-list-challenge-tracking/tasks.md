# Tasks: List Challenge Tracking (declared tags, timeboxed history, grid tags, sticky header)

**Input**: Design documents from `/specs/011-list-challenge-tracking/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the spec explicitly requires new/updated Vitest coverage for the pure logic
and an extended Playwright spec (plan.md Constitution Check V, spec.md constraints).

**Organization**: Tasks are grouped by user story (P1–P4), preceded by Setup and Foundational
phases that every story depends on, per plan.md's commit plan and dependency order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on an incomplete task)
- **[Story]**: US1 (declared tags), US2 (challenge window + history), US3 (grid tags), US4 (sticky header)
- File paths are exact, taken from plan.md's Project Structure section

## Path Conventions

Single Next.js project. `src/lib/` for pure logic, `src/app/api/**/route.ts` for mutations,
`src/app/(app)/lists/[slug]/**` for route-local UI, `prisma/` for schema + migrations.

---

## Phase 1: Setup

**Purpose**: none required beyond what Foundational already covers — this feature adds no new
tooling, dependency, or lint config. Skipping straight to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the schema reshape and generated client that every story's code depends on. Nothing
in Phase 3+ can compile or run against the database until this phase is committed.

**⚠️ CRITICAL**: No user story work can begin until T001–T003 are complete.

- [x] T001 Add `ListTag` model, reshape `ListItemTag` to a pure join (drop `label`/`normalized`,
      add `listTagId`), and add `challengeStartsAt`/`challengeEndsAt` (nullable `DateTime`) plus the
      `tags ListTag[]` relation to `List`, in `prisma/schema.prisma`, per
      [data-model.md §1](./data-model.md#1-schema-changes)
- [x] T002 Run `yarn db:migrate --name add_list_tags_and_challenge_window`, then hand-edit the
      generated migration body in `prisma/migrations/<timestamp>_add_list_tags_and_challenge_window/migration.sql`
      to the exact copy-before-drop sequence in
      [data-model.md §2](./data-model.md#2-migration-body-hand-written) (create `ListTag` → backfill
      via `INSERT … SELECT DISTINCT ON` → add nullable `listTagId` → `UPDATE` to point every
      assignment at its tag → `SET NOT NULL` as the abort-on-mismatch net → drop the old unique
      index and the `label`/`normalized` columns → add the new unique index, `listTagId` index and
      FK → add the two `List` columns). Do not delete any `NULL` `listTagId` rows to work around a
      failed `SET NOT NULL` — investigate the mapping instead
- [x] T003 Run `yarn db:generate` to regenerate `src/generated/prisma/`; commit
      `prisma/schema.prisma`, the migration folder, and the regenerated client together, before any
      application code that reads the new shape (constitution III)

**Checkpoint**: schema and generated client exist. Before moving on, hand-verify the backfill per
[quickstart.md §0a](./quickstart.md#0a-prove-the-backfill-before-anything-else-sc-002-fr-010) against
a database seeded with pre-feature tag data — this is the one check `yarn ci:check` cannot perform
(it only proves the migration applies to an empty database).

---

## Phase 3: User Story 1 - Declaring the categories before finding the films (Priority: P1) 🎯 MVP

**Goal**: a list can hold tags of its own, created/renamed/deleted independently of items, readable
by everyone and manageable by curators, with declared-but-unused tags showing a zero count.

**Independent Test**: create an empty list, declare a handful of tags on it, confirm they are
offered as suggestions when the first item is tagged and are listed in the list's summary figures
with a count of zero. Delivers the planning value with no other story shipped.

### Tests for User Story 1

- [x] T004 [P] [US1] Update `src/lib/list-item-tags.test.ts` for the new shapes: `TagVocabularyEntry`
      gaining `id`, `buildTagVocabulary(listTags, items)`'s new signature (seeded from `listTags` so
      an unused tag appears at `count: 0`), `validateTagBatch` returning
      `{ linkTagIds, createTags }` instead of a flat list (existing/link/create buckets, in-batch
      dedup, per-item cap counting `existing.length + linkTagIds.length + createTags.length`, all
      four 400 messages preserved verbatim), and a new `validateTagName(raw)` covering the three
      messages `Tag must be text` / `Tag cannot be empty` / `Tags must be 30 characters or fewer` —
      per [data-model.md §3.1–3.2](./data-model.md#31-tagvocabularyentry--srclliblist-item-tagsts)
      and [research.md R7–R8](./research.md#r7--tagvocabularyentry-gains-an-id-declared-but-unused-entries-carry-count-0)
- [x] T005 [P] [US1] Update `src/lib/list-stats.test.ts` for `computeListStats(items, listTags)`'s
      new `listTags` parameter: assert `tagCounts` includes declared-but-unused tags at `count: 0`
      and a new `declaredTags` field equals `listTags.length`, while the existing seven fields and
      `distinctVisibleTags`'s "carried by at least one non-hidden item" meaning are unchanged, per
      [data-model.md §3.4](./data-model.md#34-liststats-srcliblist-statsts-extended)

### Implementation for User Story 1

- [x] T006 [US1] Rebuild `src/lib/list-item-tags.ts`: `TagVocabularyEntry` gains `id`;
      `buildTagVocabulary(listTags, items)` is seeded from `listTags` (not discovered from
      assignments) so unused tags appear at `count: 0`, keeping the existing sort (`count` desc,
      then `normalized` asc); `validateTagBatch(labels, existing, vocabulary)` returns
      `TagBatchResult` (`{ ok: true, value: { linkTagIds, createTags } } | { ok: false, error }`)
      splitting labels into "link to an existing `ListTag`" vs "create a new one", preserving all
      four existing 400 messages verbatim; add `validateTagName(raw: unknown)` sharing the same
      length/emptiness rules as one implementation with two callers. Depends on T001–T003
      (must run after T004/T005 fail-first, run after T001–T003 for the generated types)
- [x] T007 [US1] Extend `computeListStats(items, listTags)` in `src/lib/list-stats.ts`: seed
      `tagCounts` from `listTags` so declared-but-unused tags report `count: 0`, and add a
      `declaredTags` field (`listTags.length`). Leave `distinctVisibleTags` and the other five
      existing fields' definitions unchanged. Depends on T001–T003
- [x] T008 [US1] Add `POST /api/lists/[slug]/tags` in
      `src/app/api/lists/[slug]/tags/route.ts`: `await auth()` → 401; `prisma.list.findUnique` by
      slug → 404; `canCurateListItems()` → 403; `validateTagName()` → 400; `prisma.listTag.upsert()`
      on `listId_normalized` → `201` with `{ tag: { id, label, normalized } }` on create, `200` with
      the **existing** tag unchanged on a duplicate; unexpected failures logged server-side, generic
      `500`. Per [contracts/list-tags.md](./contracts/list-tags.md#post-apilistsslugtags). Depends
      on T006
- [x] T009 [US1] Add `PATCH`/`DELETE /api/lists/[slug]/tags/[tagId]` in
      `src/app/api/lists/[slug]/tags/[tagId]/route.ts`: same auth/404/403 order as T008, then load
      the tag and verify `tag.listId === list.id` → 404 otherwise. `PATCH`: `validateTagName()` →
      400; if the new normalized form belongs to a _different_ `ListTag` on this list → `409
Another tag on this list already uses that name`; otherwise update `label` (a case-only
      rename allowed) → `200 { tag }`. `DELETE`: count assignments, delete the tag (cascades to
      `ListItemTag`) → `200 { success: true, removedFromItems: <count> }`. Per
      [contracts/list-tags.md](./contracts/list-tags.md#patch-apilistsslugtagstagid). Depends on T006
- [x] T010 [US1] Resolve item tags through the list vocabulary in
      `src/app/api/lists/[slug]/items/[itemId]/tags/route.ts` (`POST`): build the vocabulary from
      `list.tags` + item assignments, call `validateTagBatch(labels, item.tags, vocabulary)`, then in
      one `prisma.$transaction` `createMany` the missing `ListTag` rows (`skipDuplicates`), re-read
      their ids, `createMany` the `ListItemTag` join rows (`skipDuplicates`), and return the item's
      full resulting tag set joined to `listTag` for `label`/`normalized`. Wire contract (request
      shape, response shape, every status code and 400 message) is unchanged. Per
      [contracts/list-item-tags.md](./contracts/list-item-tags.md#post-apilistsslugitemsitemidtags).
      Depends on T006
- [x] T011 [P] [US1] Update
      `src/app/api/lists/[slug]/items/[itemId]/tags/[tagId]/route.ts` (`DELETE`) to read
      `label`/`normalized` through the `listTag` join instead of the (now removed) assignment
      columns; `tagId` stays the assignment id, response/status codes unchanged. Depends on T006
- [x] T012 [US1] Update `src/app/api/lists/[slug]/items/route.ts` (`POST`, tags-on-add): build the
      vocabulary from the list's `ListTag` rows and resolve unknown labels into new `ListTag` rows in
      the same transaction as the item and its assignments; contract (fields, validation order,
      messages) unchanged. Per
      [contracts/list-item-tags.md](./contracts/list-item-tags.md#post-apilistsslugitems--tags-on-add).
      Depends on T006
- [x] T013 [US1] Add `list-tags-modal.tsx` in `src/app/(app)/lists/[slug]/list-tags-modal.tsx`: a
      client component listing the list's declared tags (`divide-y rounded-lg border`, `px-3 py-2`
      compact rows, count in `text-sm text-muted-foreground`), with create/rename/delete controls
      shown only when the viewer curates (`canCurateListItems()`), fetch calls to T008/T009 followed
      by `router.refresh()`, and a delete confirmation stating the affected item count from the
      `TagVocabularyEntry.count` prop before it fires (FR-006). Per
      [research.md R4](./research.md#r4--tag-management-surface-and-who-may-reach-it). Depends on
      T008, T009
- [x] T014 [US1] Wire the tag manager into the list page: add a `Tags` icon button
      (`h-9 w-9 variant="ghost"`, `aria-label="Manage list tags"`) to the header's action cluster in
      `src/app/(app)/lists/[slug]/list-page-header.tsx`, opening `ListTagsModal`; pass `list.tags`
      (now `ListTag[]`) and the rebuilt vocabulary through
      `src/app/(app)/lists/[slug]/page.tsx` (include `list.tags` + `items.tags.listTag` in the
      `findUnique`), and update the vocabulary type only (no behaviour change) in
      `src/app/(app)/lists/[slug]/list-items-list-view.tsx`,
      `src/app/(app)/lists/[slug]/list-item-modal.tsx`,
      `src/app/(app)/lists/[slug]/list-item-tag-editor.tsx`, and
      `src/app/(app)/lists/[slug]/list-add-fab.tsx`. Depends on T006, T013

**Checkpoint**: User Story 1 is fully functional and independently testable — declare tags on an
empty list, see them as suggestions and as zero-count stats rows, rename/delete/dedupe, and viewer
role restrictions all work end to end.

---

## Phase 4: User Story 2 - Scoring only what was watched during the challenge (Priority: P2)

**Goal**: a list records an optional challenge window; a shared, attributed, date-ordered watch
history exists for the list's titles; in-window tag/decade/country coverage is computed from watches
that fall strictly inside the window, alongside the unchanged all-time figures.

**Independent Test**: set a window on a list holding tagged titles, log watches both inside and
outside the window across two members' accounts, confirm the history view shows only the in-window
watches attributed to the right people, and that in-window figures exclude the out-of-window watch
while all-time figures still include the title.

### Tests for User Story 2

- [x] T015 [P] [US2] Create `src/lib/list-challenge-window.test.ts` covering
      `parseChallengeWindowInput()` (accepts `"YYYY-MM-DD"`, full ISO datetime, or `null`; anything
      else → `{ ok: false }`; a field absent from the input leaves the current value untouched; an
      explicit `null` clears it; end earlier than the **effective** post-merge start → rejected,
      nothing to save), `challengeWindowBounds()` (half-open windows produce one bound; both null →
      `null`; end expands via `utcDayEndExclusive()`), `hasChallengeWindow()`,
      `isWithinChallengeWindow()` (boundary-inclusive at both ends), and `describeChallengeWindow()`
      rendering the four described forms. Per
      [data-model.md §3.3](./data-model.md#33-challengewindow-srcliblist-challenge-windowts)
- [x] T016 [P] [US2] Update `src/lib/list-stats.test.ts` to add `computeWindowStats(items, listTags,
watchedMediaItemIds)` coverage: an item contributes only when its `mediaItemId` is in the set;
      hidden items never contribute; each tag/decade/country credited once regardless of watch count
      (multiple watches of the same title collapse to one set member); `tagCoverage` lists every
      declared tag with `covered: false` where nothing covers it; a title with no year/no countries
      contributes to no decade/country figure without erroring; untagged titles still contribute
      decade/country coverage. Per
      [data-model.md §3.5](./data-model.md#35-windowstats-srcliblist-statsts-new) — this is where
      SC-004's "predates window → 0; watched again inside → 1" flip is pinned as a unit test
- [x] T017 [P] [US2] Create `src/lib/list-watch-history.test.ts` covering the pure
      `mergeListWatchRows(a, b)` helper only (newest-first merge of `WatchEntry`-sourced and
      `EpisodeStatus`-sourced rows, `es:` id prefix preserved, film and episode rows interleaved by
      `watchedAt`). Per
      [data-model.md §3.6](./data-model.md#36-listwatchhistoryrow-srcliblist-watch-historyts-new)

### Implementation for User Story 2

- [x] T018 [P] [US2] Create `src/lib/list-challenge-window.ts` implementing `ChallengeWindow`,
      `parseChallengeWindowInput()`, `challengeWindowBounds()`, `hasChallengeWindow()`,
      `isWithinChallengeWindow()`, `describeChallengeWindow()`, reusing `utcDayStart()` /
      `utcDayEndExclusive()` from `src/lib/watch-entry-merge.ts` unchanged. Per
      [research.md R9](./research.md#r9--challenge-window-storage-and-boundary-semantics). Depends
      on T015 (fail-first)
- [x] T019 [US2] Add `computeWindowStats(items, listTags, watchedMediaItemIds)` to
      `src/lib/list-stats.ts`, sharing "a decade" / "a country" / "hidden items excluded" definitions
      with `computeListStats()` so the two cannot drift apart. Per
      [research.md R10](./research.md#r10--in-window-figures-pure-counting-over-a-set-of-watched-media-ids).
      Depends on T016 (fail-first), T007
- [x] T020 [P] [US2] Create `src/lib/list-watch-history.ts` with `mergeListWatchRows()` (pure),
      `fetchListWatchHistory({ mediaItemIds, memberUserIds, window, take })` (merges `WatchEntry` and
      `EpisodeStatus` rows, `isWatched: true`, newest-first, capped at 200, `es:` id prefix matching
      `episodeStatusRowToHistoryItem()` in `watch-history-queries.ts`), and
      `fetchListInWindowWatchedMediaItemIds({ mediaItemIds, memberUserIds, window })` (returns a
      `Set<string>` of `mediaItemId`s watched inside the window bounds). State at the top of the file,
      verbatim, that `watchHistoryVisibility` is deliberately not consulted here and why — see
      [research.md R11](./research.md#r11--whose-watches-appear-and-the-privacy-divergence).
      Depends on T017 (fail-first), T018
- [x] T021 [US2] Extend `PATCH /api/lists/[slug]` in `src/app/api/lists/[slug]/route.ts` to accept
      optional `challengeStartsAt` / `challengeEndsAt` via `parseChallengeWindowInput()`, validating
      before the `prisma.list.update()`/`$transaction` alongside the existing checks; on rejection
      return `400` with the exact message from the parser and save nothing; keep the existing
      owner-only `403`, unchanged fields, and the ranking/voting mutex behaviour. Per
      [contracts/list-settings-patch.md](./contracts/list-settings-patch.md). Depends on T018
- [x] T022 [US2] Add two `<input type="date">` fields and a "Clear window" text action to the
      existing Settings tab in
      `src/app/(app)/lists/[slug]/list-settings-panel.tsx`, saved by the tab's existing single
      `handleSave()` → `PATCH` → `router.refresh()`, round-tripping the stored UTC-day-start value via
      `toISOString().slice(0, 10)`; surface the `400` message inline using the panel's existing
      error-line pattern. Depends on T021
- [x] T023 [US2] Create `src/app/(app)/lists/[slug]/history/page.tsx` (Server Component): resolve
      the list by slug (`notFound()` if unknown); `await auth()` → redirect to
      `/login?callbackUrl=/lists/<slug>/history` if no session; redirect to `/lists/<slug>` if the
      session user is neither owner nor a `ListMember`; otherwise fetch `window` from
      `list.challengeStartsAt`/`challengeEndsAt`, call `fetchListWatchHistory()` with the list's
      media ids and member user ids (current `ListMember` userIds ∪ `list.ownerId`), and render a
      date-ordered scoreboard: `h1` list name + "Challenge history" + `describeChallengeWindow()`;
      `h2 text-sm font-semibold text-muted-foreground uppercase tracking-wider sticky top-16` day
      headings; compact rows (`rounded-lg border p-3`, `h-10 w-10` avatar, poster thumb, title + year,
      `S1E4`-style label for episodes); empty states per
      [contracts/list-history-view.md](./contracts/list-history-view.md#rendering) (window-set-empty
      vs no-window-empty, worded as short explanations, not errors). Depends on T020
- [x] T024 [P] [US2] Create `src/app/(app)/lists/[slug]/history/loading.tsx` — a skeleton mirroring
      the day-heading + compact-row layout of T023 (constitution: route-level `loading.tsx`). Depends
      on T023 (can start once its layout shape is fixed; safe to parallelize once T023's JSX skeleton
      exists)
- [x] T025 [US2] Add a member-only `History` icon button (`h-9 w-9 variant="ghost"`,
      `aria-label="Challenge history"`) linking to `./history` in
      `src/app/(app)/lists/[slug]/list-page-header.tsx`'s action cluster, shown only to the owner or
      a current `ListMember`. Depends on T023
- [x] T026 [US2] Extend `src/app/(app)/lists/[slug]/list-stats-modal.tsx` with a "During the
      challenge" section (`h3 text-base font-semibold`, window dates beneath in
      `text-sm text-muted-foreground`, four `rounded-lg border p-4` tiles in a 2×2 grid — Categories
      covered `n / declaredTags`, Decades, Countries, Films watched — and a "Still to cover"
      `Badge` chip list from `tagCoverage` entries with `covered: false`), rendered only when the
      list has a window, above the existing all-time section which gains an explicit "All time"
      `h3` heading only when the in-window section is present. Per
      [contracts/list-history-view.md](./contracts/list-history-view.md#in-window-figures-in-liststatsmodal).
      Depends on T019
- [x] T027 [US2] Wire window stats into `src/app/(app)/lists/[slug]/page.tsx`: when the list has a
      window, call `fetchListInWindowWatchedMediaItemIds()` and `computeWindowStats(items, listTags,
watched)`, passing the result into `ListStatsModal` (T026) alongside the existing all-time
      `computeListStats()` call (now passed `listTags` per T007). Depends on T019, T020, T026

**Checkpoint**: User Stories 1 AND 2 both work independently — a window can be set/cleared/rejected,
the history page shows the right attributed, boundary-inclusive watches, and in-window figures flip
from 0 to 1 exactly as SC-004 describes, alongside unchanged all-time figures.

---

## Phase 5: User Story 3 - Seeing an item's categories on the poster grid (Priority: P3)

**Goal**: a tagged item's grid card shows up to two tag chips plus a `+N` counter beneath the
poster, with no height or row-count change for untagged cards or the grid as a whole.

**Independent Test**: open a list in grid view with tagged and untagged items and confirm tags are
legible on tagged cards while the grid still reads as a poster grid, with posters-per-row unchanged
at every supported width.

### Implementation for User Story 3

- [x] T028 [US3] Add a chip row beneath the poster in
      `src/app/(app)/lists/[slug]/list-items-grid.tsx`: render up to 2 `text-[10px] rounded-full`
      pill chips plus a `+N` counter, conditional on `item.tags.length > 0`, in the card wrapper
      _below_ `MediaCard` (not overlaid on the poster), as non-interactive `<span>`s so a click near
      the chips still opens the item modal; untagged cards render no chip row and gain no height. Per
      [research.md R13](./research.md#r13--tags-on-the-grid-card-a-chip-row-below-the-poster). No
      new lib logic — this task is UI-only. Depends on T014 (vocabulary/tag shape plumbing already
      in place)

**Checkpoint**: All of User Stories 1–3 are independently functional. Manually verify SC-007
(posters per row identical at 375/640/768/1024/1280px, before and after) per
[quickstart.md §3](./quickstart.md#3-seeing-an-items-categories-on-the-poster-grid-story-3-p3).

---

## Phase 6: User Story 4 - Keeping the list's actions in reach on a long list (Priority: P4)

**Goal**: a fixed bar showing the list name and the same Add/Stats actions as the top-of-page
header appears once a page-top sentinel scrolls out of view, and never appears on a short list.

**Independent Test**: scroll a long list past the header and confirm the list title stays visible
and both actions still work from where the member is; confirm no bar appears on a short list.

### Implementation for User Story 4

- [x] T029 [US4] Create `src/app/(app)/lists/[slug]/list-sticky-header.tsx`: a client component
      rendered **by** `ListPageHeader`, showing a `fixed top-16 inset-x-0 z-30`, single `h-12` row
      (`border-b bg-background/95 backdrop-blur`) with the truncated list name and Add/Stats icon
      buttons at `h-8 w-8`, visible only when a zero-height sentinel at the top of the page (rendered
      by `ListPageHeader`) leaves the viewport per `IntersectionObserver`; receives `onAdd`/`onStats`
      callbacks and `canAdd` as props so it calls the _same_ `setAddOpen`/`setStatsOpen` setters
      `ListPageHeader` already owns — no second modal instance. Per
      [research.md R14](./research.md#r14--sticky-header-a-sentinel-not-position-sticky). Depends on
      T014 (header action cluster already extended with Tags/History by this point)
- [x] T030 [US4] Wire the sentinel and `ListStickyHeader` into
      `src/app/(app)/lists/[slug]/list-page-header.tsx`: place the zero-height sentinel at the top of
      the header, mount `ListStickyHeader` passing the existing `addOpen`/`statsOpen` setters and the
      `hasSidebar && isMember` add-permission condition the header already uses for its own Add
      button. Depends on T029

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: end-to-end coverage and documentation, after every story is independently verified.

- [x] T031 [P] Add `e2e/lists-challenge.spec.ts` covering the four journeys and role refusals:
      declaring a tag on an empty list and seeing it suggested/zero-counted (US1); setting a window,
      rejecting an invalid one, and seeing the in-window/all-time figure split with the boundary and
      rewatch-credit rules (US2); tags visible on grid cards with posters-per-row assertion (SC-007,
      US3); sticky header appearing on a long list and not on a short one, with the add action absent
      for a non-curating viewer (US4); plus the `403`/`401` refusals for tag management and window
      edits by non-curators/non-owners
- [x] T032 [P] Add a "Running a challenge" section to `docs/lists.md` documenting declared tags and
      challenge tracking: how to declare categories before adding films, setting/clearing the
      window, reading the shared history and in-window figures, and the grid/sticky-header UI
- [ ] T033 Run `yarn lint`, `yarn test`, `yarn test:e2e -- e2e/lists-challenge.spec.ts`, and
      `yarn ci:check` as the completion gate (constitution V); confirm the quickstart.md §5 "nothing
      else moved" checks (ordering, voting, comments, radarr export, notes permissions, Discord
      notification) still hold

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. **BLOCKS all user stories.**
- **User Story 1 (Phase 3)**: Depends on Phase 2 only.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Also depends on User Story 1's vocabulary shape
  (`ListTag`, `TagVocabularyEntry.id`, `computeListStats(items, listTags)`) for `computeWindowStats`
  and the stats-modal split — **not independent of US1's code**, though it is independently
  _testable_ once US1 has shipped, matching the spec's stated build order ("declared tag vocabulary
  first, since the in-window figures report on it").
- **User Story 3 (Phase 5)**: Depends on Phase 2 and on US1's vocabulary plumbing reaching the grid
  card's `item.tags` prop (T014). No dependency on US2.
- **User Story 4 (Phase 6)**: Depends on Phase 2 and on the header's action cluster already carrying
  Tags/History buttons (T014, T025) so the sticky bar's layout is stable. No logical dependency on
  US2's or US3's data.
- **Polish (Phase 7)**: Depends on all four stories being complete.

### Within Each User Story

- Tests (T004, T005, T015–T017) are written first and must fail before their implementation tasks
  land (T006–T007, T018–T020).
- Lib modules before the routes that call them; routes before the client components that call them.
- Story complete before moving to the next priority, per the spec's dependency order.

### Parallel Opportunities

- T004 and T005 (different files, both pre-existing tests being updated) in parallel.
- T015, T016, T017 (three different new/updated test files) in parallel.
- T018 and T020 depend on different (fail-first) tests and touch different files — parallel once
  T015/T017 exist, though T020 also needs T018's `challengeWindowBounds()` export.
- T011 can run in parallel with T010/T012 once T006 lands (different route files).
- T031 (E2E) and T032 (docs) in parallel once all four stories are checkpointed.

---

## Parallel Example: User Story 2 tests

```bash
# Launch all three new/updated test files for User Story 2 together:
Task: "Create src/lib/list-challenge-window.test.ts"
Task: "Update src/lib/list-stats.test.ts for computeWindowStats"
Task: "Create src/lib/list-watch-history.test.ts for mergeListWatchRows"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (schema, migration with backfill, generated client).
2. Complete Phase 3: User Story 1 (declared tag vocabulary).
3. **STOP and VALIDATE**: run [quickstart.md §1](./quickstart.md#1-declaring-the-categories-before-finding-the-films-story-1-p1)
   by hand. This alone lets a challenge organiser declare their category sheet on day one.

### Incremental Delivery

1. Foundational → Foundation ready.
2. Add User Story 1 → validate → this is the MVP.
3. Add User Story 2 → validate → the scoring engine is live.
4. Add User Story 3 → validate → tags visible while browsing.
5. Add User Story 4 → validate → actions stay in reach on long lists.
6. Polish: E2E coverage, docs, full `yarn ci:check` gate.

Each story lands as its own set of commits per plan.md's ordered commit plan (schema → lib → routes
→ UI, one concern per commit), landing in this task list's phase order.

### Commit Mapping (for reference against plan.md's 13-commit plan)

| Commit                                                         | Tasks                                           |
| -------------------------------------------------------------- | ----------------------------------------------- |
| 1. schema + migration + generated client                       | T001–T003                                       |
| 2. rebuild tag vocabulary + validation (lib only)              | T004, T005, T006                                |
| 3. challenge window + window-stats + watch-history lib modules | T015–T020 (T007 rides with T006's stats change) |
| 4. tag routes (declare/rename/delete)                          | T008, T009                                      |
| 5. resolve item tags through list vocabulary                   | T010, T011, T012                                |
| 6. tag manager UI — Story 1 complete                           | T013, T014                                      |
| 7. challenge window settings UI                                | T021, T022                                      |
| 8. shared timeboxed history route                              | T023, T024, T025                                |
| 9. in-window stats UI — Story 2 complete                       | T026, T027                                      |
| 10. grid card tags — Story 3 complete                          | T028                                            |
| 11. sticky header — Story 4 complete                           | T029, T030                                      |
| 12. E2E spec                                                   | T031                                            |
| 13. docs                                                       | T032                                            |
| (gate, not a commit)                                           | T033                                            |

---

## Notes

- [P] tasks touch different files with no unmet dependency.
- Every route task's status codes and error messages are pinned in `contracts/*.md` — match them
  verbatim.
- Verify each `.test.ts` fails before writing its corresponding implementation.
- `src/lib/list-item-ordering.ts`, `list-item-permissions.ts`, `watch-entry-merge.ts`, and every
  write path into `WatchEntry`/`EpisodeStatus` are explicitly **out of scope** — no task should
  touch them (plan.md Constraints; research.md R15).
- No task touches `.env.example`, `README.md`, Docker, or cron config — this feature adds none of
  those.
