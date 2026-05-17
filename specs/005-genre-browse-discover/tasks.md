# Tasks: Genre-Linked Browse & Discover Page

**Input**: Design documents from `/specs/005-genre-browse-discover/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

---

## Phase 1: Foundational — TMDB API wrappers

**Purpose**: Add the four TMDB functions that every subsequent phase depends on.

**⚠️ CRITICAL**: Browse page and filter logic cannot be built until these exist.

- [ ] T001 Add `TmdbGenre` type and `getMovieGenres()` function to `src/lib/tmdb.ts` (GET /genre/movie/list, revalidate 86400)
- [ ] T002 Add `getTvGenres()` function to `src/lib/tmdb.ts` (GET /genre/tv/list, revalidate 86400)
- [ ] T003 Add `discoverMovies(genreId?, page?)` function to `src/lib/tmdb.ts` (GET /discover/movie, sort_by=popularity.desc, revalidate 3600)
- [ ] T004 Add `discoverTv(genreId?, page?)` function to `src/lib/tmdb.ts` (GET /discover/tv, sort_by=popularity.desc, revalidate 3600)

**Checkpoint**: `src/lib/tmdb.ts` exports `getMovieGenres`, `getTvGenres`, `discoverMovies`, `discoverTv`. TypeScript compiles with no errors.

---

## Phase 2: User Story 2 — Browse Page (Priority: P1) 🎯 MVP

**Goal**: `/browse` page with genre pills, type toggle, and discover results grid.

**Independent Test**: Visit `/browse`, select "Action" genre pill under Movies, verify grid refreshes to show Action movies with watch-status overlays.

### Implementation

- [ ] T005 [US2] Create `src/app/(app)/browse/browse-filters.tsx` — `"use client"` component accepting `genres: TmdbGenre[]`, `activeGenreId: number | null`, `type: string`, `filter: string | null`, `isLoggedIn: boolean` props; genre pills + type toggle + filter row; updates URL via `router.push()` on interaction
- [ ] T006 [US2] Create `src/app/(app)/browse/page.tsx` — RSC; parse search params (`type`, `genre`, `genreName`, `filter`, `page`); fetch genre list + discover results; call `getUserTmdbMediaStateByRef` when session exists; resolve `genreName` → genre ID from genre list; render `<BrowseFilters>` + `MediaCard` grid + pagination controls
- [ ] T007 [US2] Create `src/app/(app)/browse/loading.tsx` — skeleton with genre pill row placeholder + 4×5 grid of poster-ratio skeleton cards, matching the final layout

**Checkpoint**: `/browse` loads, genre pills and type toggle work, results grid shows with watch-status overlays for logged-in users.

---

## Phase 3: User Story 1 — Genre Badge Links on Detail Pages (Priority: P1)

**Goal**: Genre badges on movie and TV detail pages become clickable links to `/browse`.

**Independent Test**: Navigate to any movie detail page, click a genre badge, land on `/browse?genre=<id>&type=movie` with that genre pre-selected.

### Implementation

- [ ] T008 [P] [US1] In `src/app/(app)/movies/[tmdbId]/page.tsx`: wrap each genre `<Badge>` (lines ~151-155) in `<Link href={/browse?genre=${g.id}&type=movie}>` with hover styles; remove `<TitlePageTopNav />` import and usage
- [ ] T009 [P] [US1] In `src/app/(app)/tv/[tmdbId]/page.tsx`: wrap each genre `<Badge>` (lines ~163-167) in `<Link href={/browse?genre=${g.id}&type=tv}>` with hover styles; remove `<TitlePageTopNav />` import and usage
- [ ] T010 [US1] Delete `src/components/title-page-top-nav.tsx`

**Checkpoint**: Genre badges on movie and TV detail pages are links; clicking one opens Browse with the correct genre/type pre-selected. No "Home"/"Search" nav appears on detail pages.

---

## Phase 4: User Story 1 (continued) — Genre Links in List Item Modal

**Goal**: Genre text in the list item modal becomes clickable badge links to `/browse`.

**Independent Test**: Open any list, click an item, click a genre badge in the modal — lands on `/browse?genreName=<name>&type=movie|tv` with the genre resolved.

### Implementation

- [ ] T011 [US1] In `src/app/(app)/lists/[slug]/list-item-modal.tsx` (lines ~99-103): replace comma-joined genre text with `<div className="flex flex-wrap gap-1 mt-1">` containing `<Link onClick={onClose} href={/browse?genreName=${encodeURIComponent(g)}&type=${mediaItem.type === "MOVIE" ? "movie" : "tv"}}>` wrapping a `<Badge variant="secondary">` per genre

**Checkpoint**: Genre tags in list item modal are clickable; clicking one closes the modal and opens Browse with the genre pre-resolved from the name.

---

## Phase 5: User Story 3 — Seen/Unseen Filter (Priority: P2)

**Goal**: Logged-in users can filter Browse results to Seen / Not Seen.

**Independent Test**: Log in, go to `/browse?type=movie&filter=seen` — only movies from your Watched list appear in the grid.

### Implementation

- [ ] T012 [US3] In `src/app/(app)/browse/page.tsx`: when `filter=seen`, query `UserMediaStatus` for user's WATCHED tmdbIds and post-filter discover results; when `filter=unseen`, exclude those same tmdbIds from results; pass `filter` prop to `<BrowseFilters>` so the active button is highlighted

**Checkpoint**: Seen/Not Seen filter buttons appear for logged-in users; filtering produces correct results with no titles violating the active filter.

---

## Phase 6: User Story 4 — Library & Friends' Library Filters (Priority: P3)

**Goal**: Logged-in users can filter Browse results to their own library or friends' libraries.

**Independent Test**: Log in as a user with accepted friends, go to `/browse?filter=friends` — only titles tracked by any accepted friend appear.

### Implementation

- [ ] T013 [US4] In `src/app/(app)/browse/page.tsx`: when `filter=library`, query `UserMediaStatus` for user's any-status tmdbIds and post-filter; when `filter=friends`, call `listFriendUserIds(userId)` then query `UserMediaStatus` where `userId IN friendIds` for the current page's tmdbIds and post-filter; surface empty state when user has no friends

**Checkpoint**: In My Library and Friends' Library filters produce correct results. Empty state shown when no friends are connected.

---

## Phase 7: Polish & Tests

- [ ] T014 [P] Add Playwright smoke test in `e2e/browse.spec.ts`: navigate to a movie detail page → click a genre badge → assert `/browse` URL contains correct `genre` and `type` params → assert genre pill is highlighted in the results page
- [ ] T015 [P] Add Vitest unit test in `src/lib/tmdb.test.ts` (or a new `browse.test.ts`): test `genreName` → genre ID resolution logic (extract the lookup into a pure function `findGenreByName(genres, name)` if not already pure)
- [ ] T016 Run `yarn lint` across all modified files and fix any new issues
- [ ] T017 Run `yarn ci:check` and confirm all tests pass

---

## Dependencies & Execution Order

- **Phase 1** (T001–T004): No dependencies. Start here.
- **Phase 2** (T005–T007): Depends on Phase 1 complete.
- **Phase 3** (T008–T010): Depends on Phase 1 complete. Can run in parallel with Phase 2.
- **Phase 4** (T011): Depends on Phase 1 complete. Can run in parallel with Phase 2 and 3.
- **Phase 5** (T012): Depends on Phase 2 complete (browse page exists).
- **Phase 6** (T013): Depends on Phase 2 complete.
- **Phase 7** (T014–T017): Depends on all prior phases.

### Parallel Opportunities

- T001–T004: Each touches different endpoint in tmdb.ts — write sequentially in one pass (same file)
- T005 and T007: Can be written in parallel (different files)
- T008 and T009: Different files — fully parallel
- T012 and T013: Both modify `browse/page.tsx` — sequential

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3)

1. Add TMDB wrappers (Phase 1)
2. Build Browse page with genre/type filtering (Phase 2)
3. Wire genre badge links on detail pages (Phase 3)
4. **Validate**: Click genre on movie page → Browse shows filtered results

### Full Delivery

- Add modal genre links (Phase 4)
- Add seen/unseen filter (Phase 5)
- Add library/friends filters (Phase 6)
- Tests + CI check (Phase 7)
