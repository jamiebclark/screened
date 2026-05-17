# Tasks: Browse Sort & Filter

**Input**: Design documents from `/specs/006-browse-sort-filter/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New type library and TMDB/utils extensions that all stories depend on.

**⚠️ CRITICAL**: These must complete before any user story work begins.

- [x] T001 Create `src/lib/browse-types.ts` with `BrowseSortOrder` type union and `PersonFilterItem` interface (see data-model.md)
- [x] T002 Add `BrowseFilter` interface and `parseBrowseFilter(params)` to `src/lib/browse-types.ts` — multi-genre fallback from legacy `genre`, validated sort, 4-digit year ints, `id:name` person pairs truncated to 5
- [x] T003 Add `serializeBrowseFilter(filter, preserve)` to `src/lib/browse-types.ts` — returns query string, omits defaults/empty, resets `page` to 1 on filter changes
- [x] T004 [P] Add Vitest tests in `src/lib/browse-types.test.ts` — parse/serialize round-trips, legacy `genre` fallback, invalid sort → null, yearMin > yearMax → swap, >5 persons → truncate
- [x] T005 [P] Refactor `discoverMovies` and `discoverTv` in `src/lib/tmdb.ts` to accept a `DiscoverOptions` object: `genreIds[]`, `sortBy`, `yearMin`, `yearMax`, `withCastIds[]`, `withCrewIds[]`, `page` — update the two existing callsites in `page.tsx` to match
- [x] T006 [P] Add to `src/lib/browse-utils.ts`: `getDefaultSort(filterParam)` → `"title"` for library tabs else `"popularity"`, `buildTmdbSortBy(sort, type)` → TMDB `sort_by` string (TV title → `popularity.desc`), `buildPrismaOrderBy(sort)` → Prisma `orderBy` clause

**Checkpoint**: Types compile, Vitest passes, `discoverMovies`/`discoverTv` still work via updated callsites in page.tsx.

---

## Phase 2: Foundational — Filter Panel Shell

**Purpose**: Replace `browse-filters.tsx` with the new collapsible `BrowseFilterPanel` skeleton, migrating existing type/scope toggles. Required before any story adds controls to the panel.

- [x] T007 Create `src/app/(app)/browse/browse-filter-panel.tsx` as `"use client"` component with collapsible open/closed local state, expand/collapse button, and a `BrowseFilterPanelProps` interface (see data-model.md) — port existing type toggles (movie / tv / all) and user-scope filter buttons (seen / unseen / library / friends) from `browse-filters.tsx`
- [x] T008 Update `src/app/(app)/browse/page.tsx` to import `BrowseFilterPanel` instead of `BrowseFilters`; pass `filter` (the `BrowseFilter` object from `parseBrowseFilter`), `type`, `filterParam`, `genres`, `isLoggedIn`, `yearError`
- [x] T009 Delete `src/app/(app)/browse/browse-filters.tsx` after verifying the panel renders the same type/scope toggles as before

**Checkpoint**: Browse page renders, type tabs and user-scope filter buttons work, panel opens/closes — no regression from existing behavior.

---

## Phase 3: User Story 1 — Multi-Genre Filter (Priority: P1) 🎯 MVP

**Goal**: Users can select multiple genres simultaneously; only titles matching ALL selected genres appear.

**Independent Test**: Select "Horror" and "Comedy" on any browse tab — verify every card in results shows both genre labels.

### Implementation

- [x] T010 [US1] Update `src/app/(app)/browse/page.tsx` to read `filter.genreIds` (plural) from `parseBrowseFilter`; resolve each ID to a name via the genre list; replace single `activeGenreId`/`activeGenreName` with `activeGenreIds: number[]` and `activeGenreNames: string[]`
- [x] T011 [US1] Update TMDB-first path in `src/app/(app)/browse/page.tsx`: pass `genreIds: activeGenreIds` to `discoverMovies`/`discoverTv` (maps to comma-joined `with_genres` in `DiscoverOptions`)
- [x] T012 [US1] Update DB-first paths in `src/app/(app)/browse/page.tsx`: change `genres: { has: activeGenreName }` to `genres: { hasEvery: activeGenreNames }` on the `mediaItem` where clause (library, seen, and friends branches)
- [x] T013 [US1] Update `buildPageUrl` in `src/app/(app)/browse/page.tsx` to serialize `genres` as comma-joined IDs; add backward-compat: if legacy `genre` param is present and `genres` is absent, treat it as a single-element `genres`
- [x] T014 [US1] Update genre pills in `src/app/(app)/browse/browse-filter-panel.tsx` to multi-select toggle behavior: clicking a genre adds/removes it from `filter.genreIds`; active genres show `bg-primary` styling; include an "All Genres" button that clears the genre selection

**Checkpoint**: Multi-genre AND filter works on both TMDB and library paths. Legacy `?genre=28` URLs still work.

---

## Phase 4: User Story 2 — Sort Results (Priority: P1)

**Goal**: Users can choose a sort order; TMDB tabs sort by community metrics, library tabs by personal rating.

**Independent Test**: Switch to "Rating: High to Low" — confirm first result has a higher or equal rating to the second; switch to "Year: Newest First" — confirm results are ordered by year descending.

### Implementation

- [x] T015 [US2] Add a `SortSelect` dropdown to `src/app/(app)/browse/browse-filter-panel.tsx`: options are Popularity / Title A–Z / Year Newest First / Year Oldest First / Rating High to Low / Rating Low to High; hidden when `type=all`; shows the effective sort (applying `getDefaultSort` when `filter.sortOrder` is null)
- [x] T016 [US2] Update TMDB-first path in `src/app/(app)/browse/page.tsx`: compute `effectiveSort` via `getDefaultSort(filterParam)` when `filter.sortOrder` is null; pass `sortBy: buildTmdbSortBy(effectiveSort, type)` to `discoverMovies`/`discoverTv`
- [x] T017 [US2] Update DB-first paths in `src/app/(app)/browse/page.tsx`: replace hardcoded `orderBy: { updatedAt: "desc" }` with `orderBy: buildPrismaOrderBy(effectiveSort)` in the library, seen, and friends query branches
- [x] T018 [US2] Update `buildPageUrl` in `src/app/(app)/browse/page.tsx` to include `sort` param when non-default; update `serializeBrowseFilter` to omit `sort` when it equals the tab default

**Checkpoint**: All six sort options work on both TMDB and library paths. Default sort behavior (popularity for TMDB, title for library) is unchanged when `sort` param is absent.

---

## Phase 5: User Story 3 — Year Range Filter (Priority: P2)

**Goal**: Users can set min and/or max release year; results are bounded to that range.

**Independent Test**: Set yearMin=1970, yearMax=1990 — confirm no result card shows a year outside 1970–1990.

### Implementation

- [x] T019 [US3] Add year range inputs to `src/app/(app)/browse/browse-filter-panel.tsx`: two `<input type="number" min="1800" max="2099">` fields labeled "From year" and "To year"; show inline error when yearMin > yearMax (passed via `yearError` prop); hidden when `type=all`
- [x] T020 [US3] Update `src/app/(app)/browse/page.tsx` to parse `yearMin`/`yearMax` from `parseBrowseFilter`; compute `yearError = !!filter.yearMin && !!filter.yearMax && filter.yearMin > filter.yearMax`; skip all queries and pass `yearError` to `BrowseFilterPanel` when invalid
- [x] T021 [US3] Update TMDB-first path in `src/app/(app)/browse/page.tsx`: pass `yearMin`, `yearMax` to `discoverMovies`/`discoverTv`; `DiscoverOptions` already maps them to `primary_release_date.gte/lte` (movies) and `first_air_date.gte/lte` (tv) with `-01-01`/`-12-31` appended
- [x] T022 [US3] Update DB-first paths in `src/app/(app)/browse/page.tsx`: add `year: { gte: filter.yearMin ?? undefined, lte: filter.yearMax ?? undefined }` to the `mediaItemWhere` object (guards prevent undefined from being passed when year is null)

**Checkpoint**: Year range filter restricts results on both TMDB and library paths. Setting only min or only max works independently. Invalid range shows inline error and returns no results.

---

## Phase 6: User Story 4 — Person Include/Exclude Filter (Priority: P2)

**Goal**: Users can include (AND) or exclude specific people; results reflect those constraints.

**Independent Test**: Type a well-known director's name, select them from suggestions — all result cards are from that director. Add an actor to exclude — none of the results list that actor.

### Implementation

- [x] T023 [US4] Create `src/app/(app)/browse/person-tag-input.tsx` as `"use client"` component: debounced fetch to `/api/search/person?q=<query>` (≥2 chars, 300ms), dropdown of up to 8 suggestions with name + role, chip-per-selection with ×-remove, input disabled when `maxCount` (5) reached, `onChange(persons: PersonFilterItem[])` fires on add/remove
- [x] T024 [US4] Add two `PersonTagInput` instances to `src/app/(app)/browse/browse-filter-panel.tsx`: "Include person" (bound to `filter.includePersons`) and "Exclude person" (bound to `filter.excludePersons`); hidden when `type=all`
- [x] T025 [US4] Update `src/app/(app)/browse/page.tsx` to parse `includePersons`/`excludePersons` from `parseBrowseFilter` (already handles `id:name` pairs)
- [x] T026 [US4] Update TMDB-first path in `src/app/(app)/browse/page.tsx`: split include persons into actors (`withCastIds`) and directors (`withCrewIds`) by role; pass to `discoverMovies`/`discoverTv` (first person used as TMDB native param); if >1 include person or any exclude persons exist, fetch matching `MediaItem` rows by returned `tmdbId`s to get `castTmdbIds`, `directorsTmdbIds`, `cast`, `directors`
- [x] T027 [US4] Add post-filter logic in `src/app/(app)/browse/page.tsx` for TMDB-first path: keep only results where ALL include persons appear in `castTmdbIds` or `directorsTmdbIds`; remove results where ANY exclude person name appears as case-insensitive substring in `cast` or `directors`; items not in local DB pass through
- [x] T028 [US4] Update DB-first paths in `src/app/(app)/browse/page.tsx`: add Prisma `AND` clause for include persons (`castTmdbIds: { has: p.id }` OR `directorsTmdbIds: { has: p.id }`); post-filter results for exclude persons (case-insensitive substring in `cast` or `directors` string arrays)

**Checkpoint**: Person include and exclude work on both TMDB and library paths. Multi-person include uses AND logic. Empty suggestions show "no matches" inline.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Shared UX polish and CI validation across all user stories.

- [x] T029 Add "Clear filters" button to `src/app/(app)/browse/browse-filter-panel.tsx`: visible when any non-default filter or sort is active (genres, sort, yearMin, yearMax, includePersons, excludePersons non-empty); clicking navigates to `/browse` with only `type` and `filter` params preserved
- [x] T030 [P] Hide / disable sort, genre pills, year range, and person inputs in `src/app/(app)/browse/browse-filter-panel.tsx` when `type=all` (trending tab does not support discovery params) — only show type toggle when `type=all`
- [x] T031 [P] Add `e2e/browse-filter.spec.ts` Playwright tests: (1) select two genres → results contain both; (2) "Rating: High to Low" sort → correct ordering; (3) year range 1990–2000 → first result year in range; (4) clear filters → URL has no filter params; (5) shareable URL `?genres=28,35&sort=rating_desc` loads correctly
- [x] T032 Run `yarn ci:check` and fix any lint, format, type, or test failures across all touched files

**Checkpoint**: All user stories pass E2E tests. CI check green.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T004, T005, T006 can run in parallel once T001 is done
- **Phase 2 (Panel Shell)**: Depends on Phase 1 — T007 needs `BrowseFilter` type from T001–T003
- **Phase 3 (US1 — Multi-Genre)**: Depends on Phase 2 — adds genre pill controls to the panel
- **Phase 4 (US2 — Sort)**: Depends on Phase 2 — adds sort dropdown; can start alongside Phase 3 (different files)
- **Phase 5 (US3 — Year)**: Depends on Phase 2 — adds year inputs; independent of US1/US2
- **Phase 6 (US4 — Person)**: Depends on Phase 2 — PersonTagInput is a new file; page.tsx changes depend on US1–US3 being merged first to avoid conflicts
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Independence

- **US1** (genre) and **US2** (sort): Both only on Phase 2 — safe to develop in parallel (different controls, different query params)
- **US3** (year): Independent of US1/US2 — different inputs and different TMDB/DB params
- **US4** (person): Independent logic, but `page.tsx` edits are easiest after US1–US3 land to avoid merge conflicts

### Within Each Story

- Models / types → lib updates → page.tsx query logic → UI controls
- Always update `buildPageUrl` / `serializeBrowseFilter` alongside query logic so URL stays in sync

---

## Parallel Execution Examples

### Phase 1 (after T001–T003 land)

```
Parallel group A:
  T004 — Vitest tests for browse-types
  T005 — TMDB DiscoverOptions refactor
  T006 — browse-utils sort helpers
```

### After Phase 2 (panel shell)

```
Parallel group B (US1 + US2 can proceed together):
  T010–T014 — Multi-genre filter (US1)
  T015–T018 — Sort controls (US2)
```

### After US1 + US2 land

```
Parallel group C:
  T019–T022 — Year range (US3)
  T023–T028 — Person filter (US4) — start PersonTagInput T023 immediately
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2 only — both P1)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Panel Shell (T007–T009)
3. Complete Phase 3: Multi-Genre (T010–T014)
4. Complete Phase 4: Sort (T015–T018)
5. **STOP and VALIDATE**: Genre + sort working on TMDB and library paths
6. Ship — P2 stories (year range, person filter) can follow in the next cycle

### Full Delivery

1. Setup + Panel Shell → foundation ready
2. US1 (genre) + US2 (sort) in parallel → validate → ship MVP
3. US3 (year) + US4 (person, start with PersonTagInput) in parallel → validate → ship
4. Polish (T029–T032) → CI green → PR

---

## Notes

- [P] = different files / no incomplete-task dependencies; safe to parallelize
- Commit after each phase or logical group per the plan's commit order (types → lib → UI → page)
- `parseBrowseFilter` is the single source of truth for URL → state; all page.tsx query logic reads from it
- Person exclude on TMDB path is best-effort (items not yet in local DB pass through) — this is an accepted limitation per spec assumptions
- `page` query param resets to 1 automatically in `serializeBrowseFilter` whenever filter values change
