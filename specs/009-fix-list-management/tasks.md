# Tasks: Fix List Management (rename, reorder, layout, search)

**Input**: Design documents from `/specs/009-fix-list-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Explicitly requested by the spec ("Deliverable: ... with unit tests for new pure logic
and updated/added E2E coverage"). Vitest tasks are included per new lib module; Playwright tasks
extend/add the two specs named in plan.md.

**Organization**: Tasks are grouped by user story (US1–US4, in spec priority order). Setup and
Foundational phases hold the shared lib modules and TMDB extension that every story's routes/UI
depend on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on an incomplete task)
- **[Story]**: US1 (reorder persists), US2 (rename/description), US3 (search refinement), US4 (layout)
- File paths are exact, from plan.md's Project Structure section

## Path Conventions

Single Next.js project at repo root: `src/lib/`, `src/app/api/**/route.ts`,
`src/app/(app)/lists/[slug]/*.tsx`, `e2e/*.spec.ts`, `docs/`.

---

## Phase 1: Setup

**Purpose**: No new dependencies, no scaffolding — the project already builds and lints. This
feature needs no Setup phase beyond confirming the environment quickstart.md describes.

- [x] T001 Confirm `yarn dev` boots and `/lists` renders using the existing dev DB (per
      `specs/009-fix-list-management/quickstart.md` Prerequisites); no code change, just a
      readiness check before starting Foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Three new pure lib modules and one TMDB extension are shared by two or more user
stories' routes/UI (list-item-ordering by US1+US4's rendering paths; list-validation by US2's
create+update; title-search-params + tmdb by US3 only, but factored out first since the route and
UI both consume it in the same shape). Building these first, with their own unit tests, lets every
story's route/UI tasks be short and mechanical.

**⚠️ CRITICAL**: No user story route or UI task may start until its lib module(s) below exist and
their tests pass.

- [x] T002 [P] Create `src/lib/list-item-ordering.ts` exporting `orderListItems()` and
      `normalizePositions()` per `data-model.md`'s "Derived / in-memory shapes" section: ranked
      lists return one flat sequence sorted by `(position ?? Infinity, addedAt ASC)` with a derived
      `displayRank` (1-based index); unranked lists reproduce today's four-way partition
      (movies / tvShows / watchedMovies / watchedTv) lifted from
      `src/app/(app)/lists/[slug]/page.tsx` lines 208–295's filtering logic. `normalizePositions`
      sorts entries by submitted `position` ascending (ties broken by `id`) and rewrites
      `position` as `index + 1`.
- [x] T003 [P] Write `src/lib/list-item-ordering.test.ts` (Vitest): ranked mode preserves a mixed
      movie/TV, partly-watched input order and assigns contiguous `displayRank` starting at 1; an
      item with `position: null` in ranked input sorts to the end; unranked mode reproduces the
      current four-section partition unchanged (pin against today's output, per research.md R9);
      `normalizePositions` renumbers `[3,2,1]` → `1,2,3` in submitted order, is stable for duplicate
      `position` values, and is a no-op on an already-contiguous ordering.
- [x] T004 [P] Create `src/lib/list-validation.ts` exporting `LIST_NAME_MAX_LENGTH = 100`,
      `LIST_DESCRIPTION_MAX_LENGTH = 1000`, and `validateListDetails(input)` per `data-model.md`'s
      `list-validation.ts` section and the error-string table in the same file: absent key omitted
      from result; `name` trimmed/non-empty/≤100 chars; `description` trimmed, `""`/whitespace/
      `null` → `null`, ≤1000 chars; non-string `name`/`description` rejected as `"Name must be
text"` / `"Description must be text"`.
- [x] T005 [P] Write `src/lib/list-validation.test.ts` (Vitest) covering the full accept/reject
      table from `data-model.md`: whitespace-only name, exactly-at-limit and one-over-limit for both
      fields, `null` and `""` description clearing to `null`, emoji/markdown passed through
      literally (not stripped/escaped), non-string inputs for both fields, absent keys omitted from
      the result.
- [x] T006 [P] Create `src/lib/title-search-params.ts` exporting `TITLE_SEARCH_MIN_YEAR = 1874`,
      `TITLE_SEARCH_DEFAULT_LIMIT = 8`, `TITLE_SEARCH_MAX_LIMIT = 20`,
      `parseTitleSearchParams(params, now?)` and `buildTitleSearchQuery(input)` per
      `data-model.md`'s `title-search-params.ts` section and the validation table in the same file
      (`type` movie|tv|multi, default `movie`; `year` 1874..currentYear+10 or absent; `page` 1..500,
      default 1; `limit` 1..20, default 8; empty `q` is valid and signals `results: []`).
- [x] T007 [P] Write `src/lib/title-search-params.test.ts` (Vitest): the parse table's defaults and
      every rejection message; boundary years `1874`, `currentYear + 10`, and one past each bound;
      non-numeric `year`/`page`/`limit`; empty/absent `q`; and `buildTitleSearchQuery` round-tripping
      through `parseTitleSearchParams` while omitting absent optional params.
- [x] T008 [US3-shared] Extend `src/lib/tmdb.ts`: add `page` parameter to `searchMovie(query, year?,
page = 1)`; add new `searchTv(query, year?, page = 1)` mirroring `searchMovie` (maps to TMDB
      `/search/tv` with `first_air_date_year`, stamps `media_type: "tv"` on each result since TMDB's
      typed search omits it, and guarantees `results` is always an array at the fetch boundary per
      the project's external-API-normalization convention); add optional `popularity?: number` to
      the `TmdbSearchResult` type (TMDB already returns this field).

**Checkpoint**: All three lib modules and their Vitest suites pass (`yarn test -- src/lib/list-item-ordering.test.ts src/lib/list-validation.test.ts src/lib/title-search-params.test.ts`); `tmdb.ts` compiles. User story work can now begin.

---

## Phase 3: User Story 1 - Reordering a ranked list sticks (Priority: P1) 🎯 MVP

**Goal**: A drag-to-reorder on a ranked list persists across reload and for every member, in both
layouts, regardless of media-type mix or per-viewer watched state; a failed save reverts the UI and
shows a message.

**Independent Test**: Open a ranked list with ≥3 mixed-type items (per quickstart.md's fixture),
drag the last item to first, reload, confirm it is still first; log in as a second member and
confirm the same order; block the reorder network call and confirm the UI reverts with an error.

### Tests for User Story 1

- [x] T009 [P] [US1] Extend `e2e/lists-ranked.spec.ts`: drag the last row above the first through
      the UI (not just the API), reload, and assert the order held.
- [x] T010 [P] [US1] Extend `e2e/lists-ranked.spec.ts`: a ranked list mixing a movie and a TV show,
      with one item marked `WATCHED` by the viewer, keeps the dragged order across a reload (the RC1
      regression from research.md).
- [x] T011 [P] [US1] Extend `e2e/lists-ranked.spec.ts`: a partial `positions` payload (missing one
      item) to `PATCH /api/lists/[slug]/items/reorder` is rejected with `400`.
- [x] T012 [P] [US1] Extend `e2e/lists-ranked.spec.ts`: a `VIEWER` member sees no
      `[aria-label="Drag to reorder"]` handle on a ranked list, and their direct
      `PATCH .../items/reorder` returns `403`.

### Implementation for User Story 1

- [x] T013 [US1] In `src/app/api/lists/[slug]/items/reorder/route.ts`, tighten validation per
      `contracts/list-items-reorder-patch.md`: reject if any submitted `id` does not belong to the
      list (`"One or more items do not belong to this list"`), reject duplicate `id`s (`"Each item
may appear only once"`), and reject unless `positions.length === list.items.length`
      (`"Reorder must include every item on the list"`). Change the not-ranked message to `"This
list is not ranked, so items cannot be reordered"`.
- [x] T014 [US1] In the same route, after validation passes, call `normalizePositions()` from
      `src/lib/list-item-ordering.ts` on the submitted `positions` before building the
      `prisma.$transaction([...])` writes, so the stored result is always contiguous `1..n`
      regardless of the submitted values (FR-004, invariant I1). Keep the response shape
      (`200 { success: true }`, `500 { error: "Could not save the new order" }`) unchanged.
- [x] T015 [US1] In `src/app/(app)/lists/[slug]/page.tsx`, replace the unconditional four-way
      partition (lines ~208–295 and the `[...movies, ...tvShows, ...watchedMovies, ...watchedTv]`
      concatenation at line ~357) with a call to `orderListItems()` from
      `src/lib/list-item-ordering.ts`: when `list.rankingEnabled`, pass the single flat ranked
      sequence (with `displayRank`) to both `ListItemsGrid` and `ListItemsListView`; when not
      ranked, keep today's grouped sections exactly as before (research.md R9 — byte-for-byte
      unchanged for unranked lists).
- [x] T016 [US1] In `src/app/(app)/lists/[slug]/list-items-list-view.tsx`, render each row's rank
      number from the item's `displayRank` (its index in the rendered sequence) instead of the raw
      `item.position` (currently line ~76), so gaps left by deleted items never surface (invariant
      I5/I8).
- [x] T017 [US1] In `src/app/(app)/lists/[slug]/list-items-grid.tsx`, when the list is ranked: render
      one flat section (no per-media-type/watched `h3` headings), each card carrying a small rank
      badge (top-left pill) from `displayRank`, and no drag handle (research.md R8 — grid stays
      read-order-only). Preserve the existing four-section behavior unchanged when the list is not
      ranked.
- [x] T018 [US1] In `src/app/(app)/lists/[slug]/list-item-reorder.tsx`, fix the fire-and-forget PATCH
      (currently ignores the response around line ~121): snapshot the pre-drag array, apply the
      optimistic reorder, `await` the PATCH, and on `!res.ok` revert `setItems` to the snapshot and
      surface `body.error` (or a fallback message) in the project's `text-sm text-destructive`
      pattern — do **not** call `router.refresh()` on failure (it would race the revert, per
      `contracts/list-items-reorder-patch.md`'s client contract). On success, clear the error and
      call `router.refresh()`.

**Checkpoint**: User Story 1 is fully functional and independently testable — ranked reorder
persists identically for every viewer and both layouts; a failed save reverts with a visible error.

---

## Phase 4: User Story 2 - Renaming a list and editing its description (Priority: P1)

**Goal**: A list owner can edit name and description from the list page settings surface; the API
validates and rejects invalid input; the change appears everywhere without a manual reload; the
slug/URL never changes.

**Independent Test**: Open a list you own, edit name and description, save, and confirm the new
values appear on the list page and in the lists index without a reload; clear the name and confirm
rejection with the old name retained; as a non-owner, confirm no editing affordance and a direct
PATCH returns 403.

### Tests for User Story 2

- [x] T019 [P] [US2] Create `e2e/lists-edit.spec.ts`: owner renames via the UI (gear → Settings tab)
      and sees the new `h1` without a manual reload, and `/lists` shows the new name.
- [x] T020 [P] [US2] In `e2e/lists-edit.spec.ts`: owner clears the description and saves; the
      paragraph disappears and nothing else shifts; the list's URL (`/lists/<slug>`) is unchanged
      after the rename.
- [x] T021 [P] [US2] In `e2e/lists-edit.spec.ts`: owner clears the name and saves — rejected with a
      visible "List name is required" message, old name retained; owner pastes a 150-character name
      — rejected with the 100-character limit message.
- [x] T022 [P] [US2] In `e2e/lists-edit.spec.ts`: a second user with a `CONTRIBUTOR` (and separately
      a `VIEWER`) membership sees no name/description editing affordance in the Settings tab, and a
      direct `PATCH /api/lists/[slug]` with a `name` change from that user returns `403`.

### Implementation for User Story 2

- [x] T023 [US2] In `src/app/api/lists/route.ts` (`POST`), replace the ad-hoc `!name?.trim()` check
      (line ~68) with `validateListDetails({ name, description })` from
      `src/lib/list-validation.ts`; return `400 { error }` on failure before creating the list.
- [x] T024 [US2] In `src/app/api/lists/[slug]/route.ts` (`PATCH`), call `validateListDetails({ name,
description })` before writing (validation order: parse JSON → `validateListDetails` →
      `displayMode` → `itemCap` → ranking/voting mutex, per `contracts/lists-slug-patch.md`); return
      `400 { error }` on the first failure with nothing written. Strip `discordWebhookUrl` from the
      PATCH response (the GET handler at line ~42 already does this; PATCH currently returns the raw
      updated row and leaks the same secret — bundle this fix here per the contract's Invariants
      section).
- [x] T025 [US2] In `src/app/(app)/lists/[slug]/list-settings-panel.tsx`, add `name` and
      `description` fields at the top of the Settings tab (above the Layout control from US4, per
      research.md R7's ordering: name → description → Layout → feature toggles → item cap),
      pre-filled from the current list, included in the single PATCH body the panel already sends
      (currently only `rankingEnabled`/`votingEnabled`/`commentsEnabled`/`displayMode`/`itemCap` at
      lines ~75–82); on `res.ok` call `router.refresh()` so the header re-renders with the new values
      (FR-012).
- [x] T026 [US2] In `src/app/(app)/lists/[slug]/list-page-header.tsx`, confirm `name`/`description`
      continue to render as plain text nodes (not through any markdown/HTML renderer) so emoji/markup
      are always displayed literally (data-model.md's note that this already holds and "must not be
      changed") — no code change expected; add a one-line guard only if the current render path is
      found to interpret markup.

**Checkpoint**: User Stories 1 AND 2 both work independently — rename/description edit is live,
validated, and owner-only; reorder from US1 is unaffected.

---

## Phase 5: User Story 3 - Finding hard-to-search titles when adding to a list (Priority: P2)

**Goal**: The add-title search supports media-type restriction, year restriction, and paging beyond
the first result set, so the 1985 film "House" and 1989 film "Arena" are findable and addable.

**Independent Test**: Open the add-title flow on any list, search "House", restrict to movies and
set the year to 1985, and confirm the 1985 film is selectable and can be added.

### Tests for User Story 3

- [x] T027 [P] [US3] Create `e2e/search.spec.ts` (or extend an existing search spec if one is found
      to exist — check first) with API-level assertions:
      `GET /api/search?q=House&type=movie&year=1985` returns the 1985 film in `results`, and
      `GET /api/search?q=Arena&type=movie&year=1989` returns the 1989 film in `results` (FR-024,
      SC-004); `GET /api/search?q=House&year=abc` returns `400`.
- [x] T028 [P] [US3] In the same spec, a UI pass through the list add-title dialog: restrict to
      movies, set year 1985, search "House", and add the resulting 1985 film to a list.

### Implementation for User Story 3

- [x] T029 [US3] Rewrite `src/app/api/search/route.ts` to use `parseTitleSearchParams()` from
      `src/lib/title-search-params.ts` on the incoming `URLSearchParams`; return `400 { error }` on
      any parse failure (before calling TMDB). Empty/absent `q` short-circuits to
      `200 { results: [], page: 1, totalPages: 0, totalResults: 0 }` without calling TMDB.
- [x] T030 [US3] In the same route, implement the TMDB mapping table from
      `contracts/search-get.md`: `type=movie` → `searchMovie(q, year, page)`; `type=tv` →
      `searchTv(q, year, page)`; `type=multi` with no `year` → `searchMulti(q, page)` (existing);
      `type=multi` **with** `year` → fan out to `searchMovie` and `searchTv` in parallel for the same
      page, merge sorted by `popularity` desc then `title` asc then `tmdbId` asc, with
      `totalPages = max(movie.total_pages, tv.total_pages)` and
      `totalResults = movie.total_results + tv.total_results` (research.md R3). Filter `person`
      results out of any `/search/multi` response **before** applying `limit` (RC3 — currently
      filtered after the slice, wasting result slots). Replace the current `.slice(0, 8)` (line ~26)
      with the parsed `limit` (default 8).
- [x] T031 [US3] In the same route, wrap the TMDB call(s) so an upstream failure returns
      `502 { error: "Title search is temporarily unavailable" }` (replacing today's blanket `500`),
      with the underlying exception `console.error`'d server-side only (FR-025, FR-031).
- [x] T032 [US3] In `src/app/(app)/lists/[slug]/list-add-fab.tsx`, add a media-type selector (All /
      Films / TV, defaulting to `multi` as today) and a year input, both wired via
      `buildTitleSearchQuery()` from `src/lib/title-search-params.ts` with `limit=20`; changing
      either resets `page` to `1` and **replaces** results (research.md R6).
- [x] T033 [US3] In the same component, add a "Load more" full-width ghost button rendered only
      while `page < totalPages`, which increments `page` and **appends** results while preserving
      `query`/`mediaType`/`year` (FR-028); not rendered once the last page is reached.
- [x] T034 [US3] In the same component, add a monotonic `requestSeq` ref: a resolved search response
      is applied to state only if its sequence is still the latest issued, so rapid typing never lets
      a stale response overwrite a newer one (FR-027, research.md R6). Keep the existing 350ms
      debounce on `query`.
- [x] T035 [US3] In the same component, add an empty state shown when `q` is non-empty, not loading,
      and `results.length === 0`: "No titles matched. Try a different year, or search both films and
      TV." plus a **Clear filters** button that resets `mediaType` to `multi` and `year` to `""` and
      re-searches (FR-026).
- [x] T036 [US3] Confirm each result row still shows release year and film/TV type (existing markup
      at lines ~244–255 per research.md — FR-023 is satisfied by current rendering and must be
      preserved through the new state shape); adjust only if the refactor in T032–T035 changed the
      row's data source.

**Checkpoint**: All three of US1, US2, US3 work independently — the two reported titles ("House"
1985, "Arena" 1989) are findable and addable; reorder and rename are unaffected.

---

## Phase 6: User Story 4 - Changing a list's layout after creation (Priority: P3)

**Goal**: The layout (GRID/LIST) control is a labelled, discoverable, owner-only control in the
settings panel, and switching it re-renders immediately in the correct order for both ranked and
unranked lists.

**Independent Test**: Open a list you own that was created in grid layout, switch it to list
layout, and confirm the items re-render in the list layout and stay that way after a reload.

### Tests for User Story 4

- [x] T037 [P] [US4] In `e2e/lists-edit.spec.ts` (from T019), add: owner switches layout from Grid to
      List (or vice versa) via the relabelled "Layout" control, the item rendering changes
      immediately without a manual reload, and it survives a reload; for a ranked list, ranked order
      and rank numbers are unchanged across the switch.
- [x] T038 [P] [US4] In the same spec, a non-owner member sees no Layout control, and a direct
      `PATCH /api/lists/[slug]` with a `displayMode` change from that user returns `403`.

### Implementation for User Story 4

- [x] T039 [US4] In `src/app/(app)/lists/[slug]/list-settings-panel.tsx`, promote the display-mode
      radio (currently near the bottom, lines ~163–182, labelled "Display mode") to a labelled
      first-class "Layout" control positioned per research.md R7's order (name → description →
      **Layout** → feature toggles → item cap), and ensure the panel's single **Save settings**
      button is always rendered (disabled until dirty) rather than hidden until `isDirty` (line
      ~207), with an inline "Saved" confirmation after a successful save (research.md RC4 finding
      1).
- [x] T040 [US4] Verify (and if needed, fix) that `list-items-grid.tsx`'s ranked-mode rendering from
      T017 is used regardless of which layout the panel switches to, so a ranked list never loses its
      rank badges/order when switched to GRID (research.md RC4 finding 2 — this is the same
      correctness fix as T017; this task is the US4-side verification that the settings panel wiring
      exercises it end to end).

**Checkpoint**: All four user stories work independently and together — this is the full feature.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final verification across all four stories.

- [x] T041 [P] Update `docs/lists.md` to document: renaming/editing description and layout from the
      Settings tab, the refined add-title search (media type, year, paging), and the ranked-order
      fix (per plan.md's commit plan item 10).
- [x] T042 Run `yarn ci:check` (lint + format + migrate + test + build; requires `DATABASE_URL`) and
      fix any failures before considering the feature complete — this is the project's completion
      gate per plan.md and CLAUDE.md.
- [x] T043 Walk through every "Verify each fix by hand" step in
      `specs/009-fix-list-management/quickstart.md` (US1–US4 sections plus the "Regression check —
      unranked lists are untouched" section) against the running dev server, confirming no
      regression to unranked-list rendering, existing `picker-form.tsx`/`editable-list-search-add.tsx`
      search callers, or the existing API-level reorder test.
      (No real TMDB key or authenticated browser session was available in this headless
      environment, so the live-server click-through and `yarn test:e2e` runs against real TMDB
      could not be executed here. Verified instead via: full `yarn ci:check` green — lint, format,
      migrate, 306 unit tests, and `next build` all pass; confirmed `picker-form.tsx` and
      `editable-list-search-add.tsx` only read `data.results` from `/api/search`, so the additive
      `page`/`totalPages`/`totalResults` fields and default `type=movie`/`type=multi` behavior are
      unaffected. A human with a real `TMDB_API_KEY` and a logged-in browser should still run the
      quickstart's manual steps and `yarn test:e2e -- e2e/lists-ranked.spec.ts e2e/lists-edit.spec.ts
e2e/search.spec.ts` before shipping.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories — every story's route/UI
  tasks import at least one of `list-item-ordering.ts`, `list-validation.ts`,
  `title-search-params.ts`, or the extended `tmdb.ts`.
- **User Story 1 (Phase 3, P1)**: Depends on Foundational (`list-item-ordering.ts`, T002–T003). No
  dependency on US2/US3/US4.
- **User Story 2 (Phase 4, P1)**: Depends on Foundational (`list-validation.ts`, T004–T005). Touches
  the same file as US4 (`list-settings-panel.tsx`) — see note below.
- **User Story 3 (Phase 5, P2)**: Depends on Foundational (`title-search-params.ts` T006–T007 and
  the `tmdb.ts` extension T008). No dependency on US1/US2/US4.
- **User Story 4 (Phase 6, P3)**: Depends on Foundational and on US1's grid-ranking fix (T017) being
  in place, since T040 verifies that fix end to end. Touches the same file as US2
  (`list-settings-panel.tsx`).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

**Same-file note**: US2 (T025) and US4 (T039) both edit
`src/app/(app)/lists/[slug]/list-settings-panel.tsx`. They are not marked `[P]` relative to each
other; do T025 before T039 (name/description fields land, then the layout control is promoted above
them) to avoid merge conflicts, even though both stories are otherwise independent.

### User Story Dependencies

- **US1 (P1)**: Independent — only needs Foundational.
- **US2 (P1)**: Independent — only needs Foundational. Sequenced after US1 in this plan only because
  both are P1 and US1 is the MVP; either order is functionally valid.
- **US3 (P2)**: Independent — only needs Foundational.
- **US4 (P3)**: Functionally depends on US1's ranked-grid fix (T017) to be meaningful (research.md
  RC4 finding 2) — implement US1 before US4.

### Within Each User Story

- Tests (T009–T012, T019–T022, T027–T028, T037–T038) are written first and should fail before their
  story's implementation tasks land.
- Route/API validation tasks precede the UI tasks that depend on their response shape.
- Story is complete and independently testable before moving to the next priority.

### Parallel Opportunities

- T002, T004, T006 (the three new lib modules) can be written in parallel — different files, no
  shared state.
- T003, T005, T007 (their Vitest suites) can be written in parallel once their respective module
  exists.
- T008 (`tmdb.ts` extension) can proceed in parallel with T002–T007 — unrelated files.
- Within US1: T009–T012 (all in `e2e/lists-ranked.spec.ts`, same file) are not `[P]` against each
  other in practice even though labelled `[P]` for independence-from-implementation; treat as
  sequential edits to one file, but they can be drafted in any order.
- Within US3: T027–T028 (new spec file) can run in parallel with each other's drafting; T029–T031
  (route) block T032–T036 (UI) since the UI consumes the extended response shape.
- Once Foundational (Phase 2) completes, US1 and US3 can be implemented in full parallel by
  different people (no shared files). US2 and US4 must coordinate on
  `list-settings-panel.tsx` (see same-file note above).

---

## Parallel Example: Foundational Phase

```bash
# Launch the three new lib modules together (different files):
Task: "Create src/lib/list-item-ordering.ts per data-model.md"
Task: "Create src/lib/list-validation.ts per data-model.md"
Task: "Create src/lib/title-search-params.ts per data-model.md"
Task: "Extend src/lib/tmdb.ts with searchTv, page param, popularity field"

# Then their tests, once each module exists:
Task: "Write src/lib/list-item-ordering.test.ts"
Task: "Write src/lib/list-validation.test.ts"
Task: "Write src/lib/title-search-params.test.ts"
```

## Parallel Example: User Story 1 vs User Story 3

```bash
# After Foundational completes, these can proceed with zero file overlap:
Developer A: T009-T018 (US1 — reorder route, page.tsx, grid/list-view, drag component)
Developer B: T027-T036 (US3 — search route, tmdb mapping, add-title dialog)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational — at minimum T002/T003 (`list-item-ordering.ts`) to unblock US1;
   T004–T008 can follow if US1 alone is the MVP target, but land them too since US2/US3 are also P1/P2.
3. Complete Phase 3: User Story 1 (T009–T018).
4. **STOP and VALIDATE**: run `e2e/lists-ranked.spec.ts`, confirm reorder persists per
   quickstart.md's US1 walkthrough.
5. Deploy/demo if ready — this alone fixes the reported silent-data-loss bug.

### Incremental Delivery

1. Setup + Foundational → foundation ready (all three lib modules, tmdb extension).
2. Add US1 → validate independently → this is the MVP (fixes the P1 data-loss bug).
3. Add US2 → validate independently → rename/description live.
4. Add US3 → validate independently → "House" 1985 and "Arena" 1989 are findable (SC-004).
5. Add US4 → validate independently → layout is switchable and discoverable; depends on US1's T017.
6. Polish (Phase 7) → docs, `yarn ci:check`, full quickstart.md walkthrough.

### Parallel Team Strategy

With two developers after Foundational:

- Developer A: US1 (T009–T018), then US4 (T037–T040, since US4 depends on US1's T017).
- Developer B: US2 (T019–T026), then US3 (T027–T036).
- Coordinate on `list-settings-panel.tsx`: Developer B lands T025 (US2 fields) before Developer A
  lands T039 (US4 layout promotion), per the same-file note above.

---

## Notes

- [P] tasks = different files, no dependencies on an incomplete task.
- [Story] label maps each task to its user story for traceability back to spec.md.
- Every implementation task cites the exact contract (`contracts/*.md`) or data-model.md section it
  satisfies — re-read that document if a task's intent is unclear.
- No schema change, no migration, no new environment variable in this feature (plan.md, quickstart.md).
- Commit per plan.md's ordered commit plan (lib → routes → UI → tests → docs), one concern per commit,
  landing infrastructure (T002–T008) before the routes/UI that depend on it.
- Verify tests fail before implementing where tests are written first (T009–T012, T019–T022,
  T027–T028, T037–T038 against current `main` behavior).
