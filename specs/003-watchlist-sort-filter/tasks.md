# Tasks: Watchlist Sort & Filter

**Input**: Design documents from `specs/003-watchlist-sort-filter/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Add `runtime` to the watchlist query and type — required by both the runtime sort option (US1) and the runtime filter (US3). Must complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `runtime: true` to the `mediaItem` select block in `prisma.userMediaStatus.findMany` in `src/app/(app)/watchlist/page.tsx`
- [x] T002 Add `runtime: r.mediaItem.runtime` to the WatchlistItem mapping array in `src/app/(app)/watchlist/page.tsx` (depends on T001)
- [x] T003 Add `runtime: number | null` field to the `WatchlistItem.mediaItem` type in `src/app/(app)/watchlist/watchlist-client.tsx`

**Checkpoint**: `runtime` is available on every `WatchlistItem` object; TypeScript compiles cleanly.

---

## Phase 2: User Story 1 — Sort Watchlist by Field (Priority: P1) 🎯 MVP

**Goal**: Users can sort the watchlist by runtime (shortest/longest), in addition to the five existing sort options. Sort is reflected in the URL and survives refresh.

**Independent Test**: Navigate to `/watchlist`, select "Runtime (shortest)" from the sort dropdown, confirm the list reorders with shortest-runtime titles first, copy the URL, open in a new tab, and confirm the same sort is applied.

- [x] T004 [US1] Add `runtime_asc` and `runtime_desc` entries to `SORT_ORDERS` in `src/app/(app)/watchlist/page.tsx` using `{ mediaItem: { runtime: { sort: 'asc'|'desc', nulls: 'last' } } }`
- [x] T005 [US1] Add `"Runtime (shortest)"` and `"Runtime (longest)"` labels to `SORT_LABELS` in `src/app/(app)/watchlist/watchlist-client.tsx`
- [x] T006 [US1] Update the `SortKey` union (or `SORT_ORDERS` satisfies check) in `src/app/(app)/watchlist/page.tsx` to include the two new keys

**Checkpoint**: The sort dropdown shows two new runtime options; selecting one reorders the list server-side and updates the URL.

---

## Phase 3: User Story 2 — Genre Filter with URL Persistence (Priority: P2)

**Goal**: The existing type (movie/tv) and genre filters are preserved in the URL so they survive refresh and can be shared. Changing a filter updates the URL without a full page reload.

**Independent Test**: Select genre "Action", verify URL contains `?genres=Action`, refresh the page, confirm Action filter is still active. Then select "Movies" type filter, verify URL contains `type=movie`, and refresh to confirm it persists.

- [x] T007 [US2] Remove `useState` for `typeFilter` and `selectedGenres` in `src/app/(app)/watchlist/watchlist-client.tsx`; derive both by reading `useSearchParams()` at the top of the component
- [x] T008 [US2] Add a `handleTypeChange` function in `src/app/(app)/watchlist/watchlist-client.tsx` that calls `router.push()` with updated `type` param (omit param when value is "all")
- [x] T009 [US2] Update the type filter button group's `onClick` to call `handleTypeChange` instead of `setTypeFilter` in `src/app/(app)/watchlist/watchlist-client.tsx`
- [x] T010 [US2] Add a `handleGenreToggle` function in `src/app/(app)/watchlist/watchlist-client.tsx` that builds the updated comma-separated `genres` param and calls `router.push()`
- [x] T011 [US2] Update `toggleGenre` usage in the `DropdownMenuCheckboxItem` to call `handleGenreToggle` in `src/app/(app)/watchlist/watchlist-client.tsx`
- [x] T012 [US2] Update `hasActiveFilters` in `src/app/(app)/watchlist/watchlist-client.tsx` to read `typeFilter` and `selectedGenres` from URL params (not React state)
- [x] T013 [US2] Update `clearFilters` in `src/app/(app)/watchlist/watchlist-client.tsx` to call `router.push()` removing `type`, `genres`, `maxRuntime`, `yearFrom`, and `yearTo` params (but preserving `sort`)
- [x] T014 [US2] Update `handleSortChange` in `src/app/(app)/watchlist/watchlist-client.tsx` to preserve existing filter params when changing sort (use `new URLSearchParams(searchParams.toString())` as base)
- [x] T015 [US2] Update `filteredItems` `useMemo` dependency array in `src/app/(app)/watchlist/watchlist-client.tsx` to depend on URL-derived `typeFilter` and `selectedGenres` values instead of state variables

**Checkpoint**: Selecting a type or genre filter updates the URL, the filtered count shows correctly, refreshing the page preserves the filter, and the "Clear" button removes all filter params.

---

## Phase 4: User Story 3 — Filter by Runtime (Priority: P3)

**Goal**: Users can filter the watchlist to only show titles with runtime at or below a selected threshold. The filter is reflected in the URL.

**Independent Test**: Set runtime filter to "Up to 90 min". Confirm only items with `runtime ≤ 90` are shown (items with null runtime are excluded). Copy URL, open new tab, confirm filter is still active.

**Depends on**: Phase 3 complete (URL param infrastructure established)

- [x] T016 [US3] Derive `maxRuntime: number | null` from `useSearchParams()` in `src/app/(app)/watchlist/watchlist-client.tsx` (parse `searchParams.get("maxRuntime")` as integer; null if absent or non-numeric)
- [x] T017 [US3] Add runtime predicate to `filteredItems` `useMemo` in `src/app/(app)/watchlist/watchlist-client.tsx`: exclude item if `maxRuntime !== null && (item.mediaItem.runtime === null || item.mediaItem.runtime > maxRuntime)`
- [x] T018 [US3] Add a runtime `Select` control to the filter bar in `src/app/(app)/watchlist/watchlist-client.tsx` with options: "Any length" (clear), "Up to 1 hr" (60), "Up to 90 min" (90), "Up to 2 hrs" (120), "Up to 2.5 hrs" (150), "Up to 3 hrs" (180) — uses `router.push()` on change
- [x] T019 [US3] Include `maxRuntime` in `hasActiveFilters` check in `src/app/(app)/watchlist/watchlist-client.tsx`
- [x] T020 [US3] Add `maxRuntime` to `filteredItems` useMemo dependency array in `src/app/(app)/watchlist/watchlist-client.tsx`

**Checkpoint**: Runtime filter control appears in the filter bar; selecting a threshold hides longer titles; "Clear" removes the runtime param; URL reflects the active threshold.

---

## Phase 5: User Story 4 — Filter by Release Year Range (Priority: P3)

**Goal**: Users can filter the watchlist to titles within a release year range (start year, end year, or both). The range is reflected in the URL.

**Independent Test**: Enter `1990` in "From" and `1999` in "To". Confirm only titles with `year` between 1990 and 1999 inclusive are shown. Clear the range and confirm all titles return.

**Depends on**: Phase 3 complete (URL param infrastructure established)

- [x] T021 [US4] Derive `yearFrom: number | null` and `yearTo: number | null` from `useSearchParams()` in `src/app/(app)/watchlist/watchlist-client.tsx`
- [x] T022 [US4] Add year range predicates to `filteredItems` `useMemo` in `src/app/(app)/watchlist/watchlist-client.tsx`: exclude item if `yearFrom !== null && (item.mediaItem.year === null || item.mediaItem.year < yearFrom)`, and symmetrically for `yearTo`
- [x] T023 [US4] Add year range inputs to the filter bar in `src/app/(app)/watchlist/watchlist-client.tsx`: two `<Input type="number" placeholder="From" className="h-8 w-20 text-sm" />` and `<Input type="number" placeholder="To" ... />` that call `router.push()` on `onChange` with debounce or on `onBlur`
- [x] T024 [US4] Include `yearFrom` and `yearTo` in `hasActiveFilters` check in `src/app/(app)/watchlist/watchlist-client.tsx`
- [x] T025 [US4] Add `yearFrom`, `yearTo` to `filteredItems` useMemo dependency array in `src/app/(app)/watchlist/watchlist-client.tsx`

**Checkpoint**: Year range inputs appear in the filter bar; entering a year range filters correctly; "Clear" removes both year params from URL.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and the E2E test suite.

- [x] T026 Update the empty-filter-results `<p>` in `src/app/(app)/watchlist/watchlist-client.tsx` to a full empty-state `<div>` with message "No titles match the current filters." and a "Clear filters" `Button` that calls `clearFilters()`
- [x] T027 Add input validation in `src/app/(app)/watchlist/page.tsx`: ensure `sortParam` is checked against `SORT_ORDERS` keys before use (already done — verify still correct after new keys added)
- [x] T028 [P] Write Playwright E2E test file `e2e/watchlist.spec.ts` covering: default sort renders watchlist; changing sort to Title A–Z reorders and persists in URL; genre filter shows only matching titles and URL reflects selection; type filter (Movies) shows only movies; runtime filter hides items over threshold; year range filter shows only titles in range; clear filters restores full list; refresh with active filters preserves the filtered view

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 Sort (Phase 2)**: Depends on Phase 1 (needs `runtime` on items)
- **US2 Genre URL (Phase 3)**: Depends on Phase 1 — can start in parallel with Phase 2
- **US3 Runtime Filter (Phase 4)**: Depends on Phase 3 (URL param infrastructure)
- **US4 Year Range (Phase 5)**: Depends on Phase 3 (URL param infrastructure) — can start in parallel with Phase 4
- **Polish (Phase 6)**: Depends on Phases 2–5

### User Story Dependencies

- **US1**: Depends on Foundational only. Independent of US2–US4.
- **US2**: Depends on Foundational. Independent of US1.
- **US3**: Depends on US2 (URL param pattern established). Can run in parallel with US4.
- **US4**: Depends on US2. Can run in parallel with US3.

### Parallel Opportunities

- T004, T005, T006 (US1) can start while T007–T015 (US2) is being worked on — they touch different parts of the codebase
- T016–T020 (US3) and T021–T025 (US4) can run in parallel once US2 is complete
- T028 (E2E tests) can be written in parallel with any phase

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: US1 Sort (T004–T006) — runtime sort visible
3. Complete Phase 3: US2 Genre URL persistence (T007–T015) — filters survive refresh
4. **STOP and VALIDATE** — sort + genre/type filter fully working, URL-shareable
5. Proceed to Phase 4 and 5 for runtime + year range filters

### Full Delivery

1. Phases 1–3 → MVP
2. Phase 4 (US3) and Phase 5 (US4) in parallel → complete filter suite
3. Phase 6 → polish + E2E tests → `yarn ci:check`

---

## Notes

- [P] tasks = different files or no shared dependencies
- Derived URL state (T007) is the critical architectural change — all subsequent filter tasks build on it
- `useSearchParams()` requires a `Suspense` boundary — `watchlist/loading.tsx` already exists, so this is covered
- Commit after Phase 1, after Phase 2–3 combined (Commit 1 + 2 from plan), and after Phase 6 (Commit 3)
- Run `yarn lint` after each phase; run `yarn ci:check` before marking complete
