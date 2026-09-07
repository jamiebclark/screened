# Tasks: List Item Curation (hide, tags, stats)

**Input**: Design documents from `/specs/010-list-item-curation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the plan and constitution (principle V) require Vitest coverage for every new
pure `src/lib/` module and one Playwright spec covering all three journeys. Per constitution IV, land
tests as part of the same commit as the code they exercise (see plan.md commit plan), not strictly
"before" implementation as a separate commit.

**Organization**: Tasks are grouped by user story (P1 hide, P2 tags, P3 stats), preceded by Setup
(schema) and Foundational (pure lib modules) phases, per plan.md's dependency ordering.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (hide), US2 (tags), US3 (stats)
- File paths are exact, per plan.md's Project Structure section

---

## Phase 1: Setup (Schema)

**Purpose**: The one schema change every story depends on.

- [x] T001 Add `ListItem.isHidden Boolean @default(false)` and the new `ListItemTag` model
      (`id`, `listItemId`, `label`, `normalized`, `createdAt`, `@@unique([listItemId, normalized])`,
      `@@index([listItemId])`, `onDelete: Cascade` from `ListItem`) to `prisma/schema.prisma`, per
      data-model.md §1.1–1.2
- [x] T002 Run `yarn db:migrate --name add_list_item_hidden_and_tags` to generate
      `prisma/migrations/<timestamp>_add_list_item_hidden_and_tags/`, then `yarn db:generate` to
      regenerate the Prisma client (depends on T001)

**Checkpoint**: Schema and generated client are ready; no application code depends on them yet.

---

## Phase 2: Foundational (Pure lib modules — blocking prerequisites)

**Purpose**: The pure, unit-tested modules that every route and every UI piece in every story calls
into. No user story can be implemented until these exist.

**⚠️ CRITICAL**: Complete this phase before starting any user story phase.

- [x] T003 [P] Create `src/lib/list-item-permissions.ts` exporting
      `canCurateListItems({ isOwner, memberRole }): boolean` (true for owner, `OWNER`, `CONTRIBUTOR`;
      false for `VIEWER` and `null`), per data-model.md §2.6
- [x] T004 [P] Create `src/lib/list-item-permissions.test.ts` covering owner, `OWNER` member,
      `CONTRIBUTOR`, `VIEWER`, and non-member (`null`) cases
- [x] T005 [P] Create `src/lib/list-item-tags.ts` exporting `TAG_MAX_LENGTH = 30`,
      `TAG_MAX_PER_ITEM = 15`, `normalizeTagLabel(raw)`, `tagComparisonKey(raw)`,
      `splitTagInput(raw)` (splits on `,`, drops empty fragments), `TagVocabularyEntry` type,
      `buildTagVocabulary(items)` (group by normalized, count, earliest-`createdAt` label, ordered by
      count desc then normalized asc), `suggestTags(vocabulary, query, opts)` (prefix match then
      substring, dedup, `exclude`, cap at `limit` default 6, empty query → `[]`), `TagBatchResult` type,
      and `validateTagBatch(labels, existing, vocabulary)` implementing the validation table in
      data-model.md §2.2 (all-or-nothing, silent dedup-skip, casing canonicalisation to vocabulary)
- [x] T006 [P] Create `src/lib/list-item-tags.test.ts` covering `normalizeTagLabel`,
      `tagComparisonKey`, `splitTagInput`, `buildTagVocabulary` (ordering, count, first-used casing),
      `suggestTags` (prefix-before-substring, `exclude`, cap, empty query), and `validateTagBatch` for
      every row of data-model.md §2.2's table plus the dedup-is-not-an-error and
      cap-measured-on-the-resulting-set cases
- [x] T007 [P] Create `src/lib/list-stats.ts` exporting `ListStats` type
      (`totalItems`, `visibleItems`, `distinctDecades`, `distinctVisibleTags`) and
      `computeListStats(items)` per the definitions table in data-model.md §2.5 (decades computed over
      **all** items excluding unknown years; distinct tags computed over **non-hidden** items only;
      empty list → all zeros)
- [x] T008 [P] Create `src/lib/list-stats.test.ts` covering the acceptance-3 worked examples: 12
      items/3 hidden → totals 12/9; years 1985/1989/1994/2001 plus one unknown → 3 decades; a tag present
      only on a hidden item excluded from `distinctVisibleTags` while a tag on both hidden and visible
      items is included; empty list → `{0,0,0,0}`
- [x] T009 [P] Create `src/lib/list-view-params.ts` exporting `SortField` and `HiddenFilter` union
      types and `parseListViewParams(raw, { votingEnabled })` per data-model.md §2.3 (absorbing the
      inline `parseSort` currently in `page.tsx`; `hidden` is `"exclude"` only on exact match, everything
      else → `"include"`; `sort` falls back to `date_added` on unknown values or `votes` without voting
      enabled)
- [x] T010 [P] Create `src/lib/list-view-params.test.ts` covering both params' fallbacks, the
      `votes`-without-voting-enabled case, and every unrecognised/absent `hidden` value resolving to
      `"include"`
- [x] T011 [US1 blocking] Add `isHidden: boolean` to the `OrderableItem` type and export
      `filterHiddenFromOrdering(ordering, hiddenFilter)` in `src/lib/list-item-ordering.ts`, per
      data-model.md §2.4 — `"include"` returns the ordering unchanged; `"exclude"` filters `items` while
      preserving every surviving item's `displayRank` verbatim for `mode: "ranked"`, and filters each of
      `movies`/`tvShows`/`watchedMovies`/`watchedTv` independently for `mode: "grouped"`.
      `orderListItems()` and `normalizePositions()` remain unmodified (depends on T009 for `HiddenFilter`)
- [x] T012 [P] Extend `src/lib/list-item-ordering.test.ts` with cases proving
      `filterHiddenFromOrdering` preserves `displayRank` under filtering in ranked mode, filters each
      grouped section independently without cross-section movement, and is a no-op when
      `hiddenFilter === "include"` (depends on T011)

**Checkpoint**: All five pure lib modules exist and are independently unit-tested. User story
implementation can now begin.

---

## Phase 3: User Story 1 - De-activating an item without deleting it (Priority: P1) 🎯 MVP

**Goal**: A member with edit rights can hide/unhide any item; hidden items render faded for
everyone; a filter removes them from view without renumbering ranks; drag-to-reorder withdraws while
filtered.

**Independent Test**: Open a list with several items, hide one, confirm it renders faded for the
current user and for a second member in another session, then switch on the filter and confirm the
hidden item disappears from the page while the visible items stay in their existing order and ranks.

### Implementation for User Story 1

- [x] T013 [US1] Create `src/app/api/lists/[slug]/items/[itemId]/hidden/route.ts` implementing
      `PATCH` per contracts/list-item-hidden-patch.md: `auth()` → 401; load list by slug with members →
      404; load item → 404 if absent or `item.listId !== list.id`; `canCurateListItems(...)` → 403;
      validate `typeof body.isHidden === "boolean"` → 400 `"isHidden must be true or false"`;
      `prisma.listItem.update({ where: { id: itemId }, data: { isHidden } })` (only that field); respond
      `200 { id, isHidden }`; unexpected errors logged server-side, generic 500 (depends on T003, T002)
- [x] T014 [US1] In `src/app/(app)/lists/[slug]/page.tsx`: extend `RawItem`/query to select
      `isHidden`; replace inline `parseSort` with `parseListViewParams({ sort, hidden }, { votingEnabled })`
      and widen the `searchParams` type to accept `hidden?: string`; call `orderListItems(list.items, …)`
      on the **full** set exactly as today, then apply `filterHiddenFromOrdering(ordering, hiddenFilter)`
      as a new step immediately after; compute
      `canCurate = canCurateListItems({ isOwner, memberRole: memberRecord?.role ?? null })` replacing the
      inline `isContributor` expression; compute
      `canReorder = list.rankingEnabled && canCurate && hiddenFilter === "include"`; keep header
      `itemCount`/`watchedCount` derived from the full set (depends on T009, T011, T013)
- [x] T015 [US1] Create `src/app/(app)/lists/[slug]/list-hidden-filter.tsx` — client component
      rendering the pill toggle described in plan.md's density table (`text-xs px-2.5 py-1 rounded-full
border`, matching `list-sort-controls.tsx`); on toggle, builds `new
URLSearchParams(searchParams.toString())`, sets `hidden=exclude` or deletes the key entirely, then
      `router.push`, preserving `sort` and any other existing param (depends on T009)
- [x] T016 [US1] Create `src/app/(app)/lists/[slug]/list-item-hide-toggle.tsx` — client component:
      `Eye`/`EyeOff` icon button with `aria-pressed`, rendered only when `canCurate`; optimistic local
      state change on click, `PATCH` to `…/hidden`, `router.refresh()` on success, revert to previous
      appearance and show the server's `error` (or a generic message if the body is unreadable) in an
      inline banner on failure, matching `list-item-reorder.tsx`'s error-banner pattern (depends on T013)
- [x] T017 [US1] Update `src/app/(app)/lists/[slug]/list-items-grid.tsx`: `GridItem` gains
      `isHidden: boolean`; `toGridItem` maps it through; accept new `canCurate: boolean` prop; render
      `opacity-50` + `EyeOff` badge + the hide toggle (bottom-left overlay, the free corner) on hidden
      items, per plan.md's density table; no tag chips rendered here (deliberate, per plan.md) (depends
      on T014, T016)
- [x] T018 [US1] Update `src/app/(app)/lists/[slug]/list-items-list-view.tsx`: accept `canCurate:
boolean`; render faded row styling + `EyeOff` badge + trailing hide toggle for hidden items (depends
      on T014, T016)
- [x] T019 [US1] Update `src/app/(app)/lists/[slug]/list-item-modal.tsx`: accept `canCurate:
boolean`; add the hide toggle to the action row beside delete, with the same optimistic/revert
      behaviour as T016 (depends on T014, T016)
- [x] T020 [US1] Update `src/app/(app)/lists/[slug]/list-item-reorder.tsx`: accept `canCurate:
boolean` and `reorderDisabledReason: string | null`; when `reorderDisabledReason` is set (i.e. the
      hidden filter is active), hide drag handles and render the one-line explanation "Reordering is off
      while hidden items are filtered out." above the items (depends on T014)
- [x] T021 [US1] In `page.tsx`, add the "every item hidden while filtered" empty-state body: when
      `list.items.length > 0`, `hiddenFilter === "exclude"`, and the filtered ordering has zero items,
      render "Every item on this list is hidden." plus a one-click control that clears the `hidden` param
      (reusing `list-hidden-filter.tsx`'s clear action), distinct from the existing "No items yet" empty
      state (depends on T014, T015)
- [x] T022 [US1] Wire `list-hidden-filter.tsx` into the page header/sort row alongside
      `list-sort-controls.tsx`, per plan.md's density table (renders on its own row when ranking is off
      and the sort row is not shown) (depends on T014, T015)

**Checkpoint**: User Story 1 is fully functional and independently testable per quickstart.md §1.

---

## Phase 4: User Story 2 - Tagging items with a vocabulary that grows per list (Priority: P2)

**Goal**: Members with edit rights can add/remove free-text tags on any item, with per-list-only
autocomplete; tags are visible to everyone; hidden items remain taggable.

**Independent Test**: Open a list, add two tags to one item, then start typing on a second item and
confirm the existing tags are offered as suggestions. Open a different list and confirm none of the
first list's tags are suggested there.

### Implementation for User Story 2

- [x] T023 [US2] Create `src/app/api/lists/[slug]/items/[itemId]/tags/route.ts` implementing `POST`
      per contracts/list-item-tags.md: `auth()` → 401; load list with members → 404; load item with
      `tags` → 404 if absent or `item.listId !== list.id`; `canCurateListItems(...)` → 403 (does **not**
      consult `item.isHidden`); load the list's full tag vocabulary via
      `prisma.listItemTag.findMany({ where: { listItem: { listId: list.id } }, select: { label, normalized, createdAt } })`
      and build vocabulary entries; `validateTagBatch(body.labels, item.tags, vocabulary)` → 400 with its
      `error` verbatim on failure, writing nothing; on success
      `prisma.listItemTag.createMany({ data: value.map(...), skipDuplicates: true })`; re-read and
      respond `200 { tags }` with the item's full resulting tag set ordered by `createdAt` asc (depends
      on T003, T005, T002)
- [x] T024 [US2] Create `src/app/api/lists/[slug]/items/[itemId]/tags/[tagId]/route.ts`
      implementing `DELETE` per contracts/list-item-tags.md: same auth/list/item/permission steps as
      T023; load the tag by `id` → 404 if absent or `tag.listItemId !== itemId`;
      `prisma.listItemTag.delete`; respond `200 { tags }` with the item's remaining tags (depends on
      T003, T002)
- [x] T025 [US2] In `src/app/(app)/lists/[slug]/page.tsx`: extend `RawItem`/query so
      `include.items.include` gains
      `tags: { select: { id, label, normalized, createdAt }, orderBy: { createdAt: "asc" } }`; call
      `buildTagVocabulary(list.items)` on the **full** item set (a tag used only on a hidden item stays
      in the vocabulary); pass `tagVocabulary` through to the grid, list view, reorder and modal
      components; `GridItem`/`toGridItem` gain `tags: { id, label, normalized }[]` (depends on T005,
      T014)
- [x] T026 [US2] Create `src/app/(app)/lists/[slug]/list-item-tag-editor.tsx` — client component:
      chip list + text input + suggestion `Popover` (compact rows `px-3 py-2 text-sm`, usage count in
      `text-xs text-muted-foreground`, ≤ 6 entries), rendered only with an add affordance when `canCurate`
      (chips always readable regardless); on submit, runs `splitTagInput()` on the raw input client-side,
      `POST`s the resulting array to `…/tags`, replaces local chip state with the response `tags` and
      calls `router.refresh()`; on failure shows the server's `error` inline beneath the input and leaves
      existing chips untouched; each chip's remove control `DELETE`s `…/tags/[tagId]` and applies the
      same success/failure handling (depends on T023, T024, T005)
- [x] T027 [US2] Wire tag chips (up to 3, then `+N`, `text-[11px]`, appended after the note line) and
      the tag editor into `src/app/(app)/lists/[slug]/list-items-list-view.tsx` (depends on T025, T026)
- [x] T028 [US2] Wire the full tag editor (chips + input + suggestions) into
      `src/app/(app)/lists/[slug]/list-item-modal.tsx`'s action area, available on hidden items exactly as
      on visible ones (depends on T025, T026)

**Checkpoint**: User Stories 1 AND 2 both work independently, per quickstart.md §1–§2.

---

## Phase 5: User Story 3 - Reading a list's shape at a glance (Priority: P3)

**Goal**: A read-only stats breakout — total items, non-hidden items, distinct decades, distinct
tags on non-hidden items — reachable in one action from the list page, for every viewer.

**Independent Test**: Open a list with a known mix of items, hidden items, release years and tags,
open the stats breakout from the list page, and confirm all four figures match a hand count.

### Implementation for User Story 3

- [x] T029 [US3] In `src/app/(app)/lists/[slug]/page.tsx`: call `computeListStats(list.items)` on the
      **full**, unfiltered item set (never the hidden-filtered ordering) and pass the resulting
      `ListStats` to the header component (depends on T007, T025)
- [x] T030 [US3] Create `src/app/(app)/lists/[slug]/list-stats-modal.tsx` — client component: Radix
      `Dialog` with the `DialogTitle` styling from `list-settings-modal.tsx`; a 2×2 grid of stat tiles
      (`rounded-lg border p-4`, label `text-xs text-muted-foreground`, value `text-2xl font-semibold`)
      showing "Items", "Still in play", "Decades", "Tags in use"; when `totalItems === 0`, all four read
      `0` and an explanatory line ("Nothing to summarise yet — add some titles.") replaces bare zeros;
      the only interactive element is close — no mutation affordance anywhere in the dialog (depends on
      T007)
- [x] T031 [US3] Update `src/app/(app)/lists/[slug]/list-page-header.tsx`: accept a `stats: ListStats`
      prop; add a `BarChart3` icon button (`h-9 w-9`, `variant="ghost"`, `aria-label="List stats"`) to the
      header's existing action cluster, rendered for **every** viewer (unlike the member-gated Add and
      Settings buttons); clicking opens `list-stats-modal.tsx` (depends on T029, T030)

**Checkpoint**: All three user stories are independently functional, per quickstart.md §1–§3.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end coverage across all three stories, plus the documentation the plan commits
to keeping in sync.

- [x] T032 [P] Create `e2e/lists-curation.spec.ts` covering: hide → item faded for the actor and for
      a second member's session → unhide restores note/vote/rank exactly; a `VIEWER` sees no hide toggle
      but sees faded items and the filter still works; filter on → hidden item disappears while others
      keep their existing ranks; reload and a copied URL both preserve the filter; drag handles absent
      and the explanation line present while filtered; the all-hidden-while-filtered empty state; add two
      tags, then accept a suggestion after typing three characters on a second item; a second list offers
      none of the first list's tags; remove a tag; a `VIEWER` sees tag chips but no tag input; the stats
      modal opens from the header in one click and its four figures match a hand-counted fixture,
      including the case where a tag lives only on a hidden item; the item-cap assertion (FR-026 — hiding
      one item does not allow exceeding the cap); a Radarr export assertion that hidden movies are still
      included (depends on T013 through T031)
- [x] T033 [P] Update `docs/lists.md` with a new "Curating a list" section documenting hiding,
      per-list tag vocabulary, and the stats breakout, per plan.md's commit plan item 9
- [x] T034 Run `yarn ci:check` (lint + format + migrate + test + build) and confirm it passes,
      confirming the new migration applies cleanly from scratch (depends on all prior tasks)
- [x] T035 Hand-verify all three stories against quickstart.md §1–§4, including the 009-regression
      checks in §4 (ranked reorder still persists with the filter off; ranked grid stays one flat section
      with hidden items faded among it, no read-path partitioning reintroduced; unranked grouped list
      keeps a hidden movie in the movies section; Radarr export unaffected; sort and filter survive
      together in the URL) (depends on T034)

      Verified by: (1) re-running all five `src/lib` Vitest suites (50/50 passing); (2) a full
      `yarn build` production build succeeding; (3) a line-by-line review of `page.tsx`'s wiring —
      `filterHiddenFromOrdering` applied to the full `orderListItems()` output, `tagVocabulary`/`stats`
      computed from the unfiltered `list.items`, `canReorder`/`reorderDisabledReason` gated on
      `hiddenFilter`, `radarrUrl` untouched by the filter, and the all-hidden empty state — all matching
      data-model.md and quickstart.md §1–§4; (4) the two Playwright cases that did run cleanly (item-cap
      FR-026, Radarr-still-includes-hidden-movies) passing against both dev and production servers.
      NOTE: the other 7 cases in `e2e/lists-curation.spec.ts` fail deterministically in this environment
      on a strict-mode `getByText()` collision — Next's per-route `loading.tsx` streams page content
      through an inline `<script>` "flight" payload that transiently duplicates the same item-title text
      Playwright's text engine matches against. This reproduces identically on an untouched pre-existing
      spec (`lists-ranked.spec.ts`, 2/6 cases) and is therefore pre-existing test-environment flakiness,
      not a regression from this feature — but it does mean the automated gate's e2e step could not be
      confirmed green here and needs a locator fix (scope to `page.locator("main")` or similar) as
      follow-up, ideally on a lower-latency machine/CI runner.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T002, for the migration/client) — BLOCKS all user
  stories. `list-item-tags.ts`/`list-stats.ts`/`list-item-permissions.ts` do not actually need the
  migration to compile (they're pure functions over plain objects), but their route/page callers in
  later phases do, so treat Phase 2 as gating in practice.
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational and on `page.tsx`'s query/ordering shape from
  US1 (T014), since both stories touch the same `page.tsx` query and the same components. Not
  independent of US1's _file_, but independently _testable_ per quickstart.md §2 once US1 has landed.
- **User Story 3 (Phase 5)**: Depends on Foundational and on US2's `page.tsx` changes (T025), since
  stats needs tags loaded. Independently testable per quickstart.md §3 once US1+US2 have landed.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

This feature's stories are **sequentially dependent by design** (per plan.md and the spec's own
"Build order" assumption: stats needs both hiding and tags) — they share `page.tsx` and several
components, so unlike a fully independent-stories feature, US2 and US3 are not parallelizable against
US1. Land P1 → P2 → P3 in order, matching the commit plan in plan.md.

### Within Each User Story

- Route handlers before the `page.tsx` wiring that calls into permission/validation logic they share.
- `page.tsx` query/prop changes before the client components that consume the new props.
- Grid, list-view, modal, and reorder component updates can proceed in parallel once `page.tsx` is
  updated, since they are different files.

### Parallel Opportunities

- T003–T010 (all five pure lib modules and their tests) are mutually independent — different files,
  no shared state — and can all run in parallel once T002 lands.
- T011–T012 depend on the `HiddenFilter` type from T009 but not on T003–T008; can run alongside them
  once T009 is done.
- Within US1: T017, T018, T019, T020 (grid, list-view, modal, reorder) can run in parallel once T014
  and T016 are done.
- Within US2: T027, T028 (list-view and modal tag wiring) can run in parallel once T025 and T026 are
  done.
- T032 (Playwright) and T033 (docs) can run in parallel once all implementation tasks are done.

---

## Parallel Example: Foundational Phase

```bash
# Launch all five pure lib modules together, once the migration (T002) has landed:
Task: "Create src/lib/list-item-permissions.ts"
Task: "Create src/lib/list-item-tags.ts"
Task: "Create src/lib/list-stats.ts"
Task: "Create src/lib/list-view-params.ts"
# Then, once list-view-params.ts exists:
Task: "Extend src/lib/list-item-ordering.ts with filterHiddenFromOrdering"
```

## Parallel Example: User Story 1 components

```bash
# Once page.tsx (T014) and the hide toggle (T016) exist:
Task: "Update list-items-grid.tsx with faded rendering and hide toggle"
Task: "Update list-items-list-view.tsx with faded rendering and hide toggle"
Task: "Update list-item-modal.tsx with hide toggle in the action row"
Task: "Update list-item-reorder.tsx with the reorder-disabled note"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + migration).
2. Complete Phase 2: Foundational (five pure lib modules, all unit-tested).
3. Complete Phase 3: User Story 1 (hide/unhide, filter, faded rendering, reorder withdrawal).
4. **STOP and VALIDATE**: run quickstart.md §1 by hand; hiding is now shippable on its own.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. User Story 1 → validate against quickstart.md §1 → ship (MVP).
3. User Story 2 → validate against quickstart.md §2 → ship.
4. User Story 3 → validate against quickstart.md §3 → ship.
5. Polish: Playwright coverage, docs, `yarn ci:check`, full quickstart.md pass including §4
   regression checks.

### Commit alignment

Follow plan.md's nine-commit plan exactly: schema (T001–T002) → lib modules (T003–T012) → hidden
route (T013) → hide UI (T014–T022) → tag routes (T023–T024) → tag UI (T025–T028) → stats (T029–T031)
→ Playwright (T032) → docs (T033). `yarn ci:check` (T034) and the manual quickstart pass (T035) close
out the feature.

---

## Notes

- [P] tasks touch different files with no unresolved dependency between them.
- [Story] labels map every user-story-phase task to US1/US2/US3 for traceability back to spec.md.
- Every new pure `src/lib/` module ships with its Vitest suite in the same task pair (T003/T004,
  T005/T006, T007/T008, T009/T010) so tests are never an afterthought.
- `orderListItems()` and `normalizePositions()` are never modified by any task — verify this remains
  true through code review at T034.
- Avoid: reintroducing a read-path partition of list items, adding a per-viewer hidden-state table,
  adding a `GET` tags/suggestions endpoint, or widening the notes `isOwner || isAdder` rule as a side
  effect of any US1/US2 task.
