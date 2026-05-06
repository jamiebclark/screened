# Tasks: Upcoming from Watchlist

**Input**: Design documents from `specs/004-upcoming-watchlist/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: Grouped by user story. No schema migrations required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story this task belongs to

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Enrichment backfill and query layer — must land before the route that consumes them.

**⚠️ CRITICAL**: Route and nav tasks depend on these.

- [x] T001 Bump `CURRENT_ENRICHMENT_VERSION` from 1 to 2 and add conditional `releaseDate` backfill inside `enrichAndEmbed` in `src/lib/media-item.ts` — call `getMovie`/`getTvShow` when `item.releaseDate === null` and write the field before stamping the new version
- [x] T002 Create `src/lib/upcoming-queries.ts` exporting `getUpcomingWatchlistItems(userId: string)` — two parallel Prisma queries returning `{ comingSoon: UpcomingItem[], justReleased: UpcomingItem[] }` per data-model.md

**Checkpoint**: Enrichment version bumped; query function exists and compiles.

---

## Phase 2: User Story 1 — View Upcoming Releases (Priority: P1) 🎯 MVP

**Goal**: A user visits `/upcoming` and sees all their watchlist items with future release dates, sorted ascending.

**Independent Test**: Add a movie with a future `releaseDate` to the watchlist via the API, visit `/upcoming`, confirm it appears.

- [x] T003 [US1] Create `src/app/(app)/upcoming/page.tsx` — RSC that calls `getUpcomingWatchlistItems`, renders both arrays as flat lists (no grouping headers yet), sorted per data-model.md; authenticate with `await auth()`
- [x] T004 [P] [US1] Create `src/app/(app)/upcoming/loading.tsx` — skeleton mirroring the final layout (two section placeholders with animated rows)

**Checkpoint**: `/upcoming` loads, shows future watchlist items, redirects unauthenticated users to login.

---

## Phase 3: User Story 2 — Coming Soon vs Just Released Sections (Priority: P2)

**Goal**: Items are visually split into "Coming Soon" (future) and "Just Released" (past 30 days, unwatched) sections with distinct headings. Sections with no items are omitted.

**Independent Test**: Add one future movie and one movie released 10 days ago (both on watchlist), visit `/upcoming`, confirm two labeled sections appear with correct items in each.

- [x] T005 [US2] Update `src/app/(app)/upcoming/page.tsx` — replace flat list with two conditional sections: "Coming Soon" (`comingSoon.length > 0`) and "Just Released" (`justReleased.length > 0`), each with an `h3` heading and sorted per spec (coming soon: asc, just released: desc); use `formatReleaseDate` helper already in watchlist page for consistent date display
- [x] T006 [P] [US2] Add `/upcoming` link (`CalendarDays` icon, label "Upcoming") to `navLinks` array in `src/components/nav.tsx` — positioned after "History"

**Checkpoint**: Two labeled sections render correctly; nav link appears; section with no items is absent from DOM.

---

## Phase 4: User Story 3 — Empty State and Navigation (Priority: P3)

**Goal**: When both sections are empty, a helpful empty state is shown with a link to the watchlist. The watchlist "Releasing soon" teaser gains a "See all" link to `/upcoming`.

**Independent Test**: With a watchlist that has no upcoming or recently-released items, visit `/upcoming` and confirm a non-blank empty state and a "Browse watchlist" or "Go to watchlist" link are present.

- [x] T007 [US3] Update `src/app/(app)/upcoming/page.tsx` — add full-page empty state (shown when both `comingSoon` and `justReleased` are empty) with a `Button asChild` link to `/watchlist`, following the empty state pattern in `src/app/(app)/watchlist/page.tsx`
- [x] T008 [P] [US3] Update the "Releasing soon" section in `src/app/(app)/watchlist/page.tsx` — add a "See all upcoming →" `Link` to `/upcoming` below the item list (only render when `upcomingRows.length > 0`)

**Checkpoint**: Empty state visible with nav affordance; watchlist links to `/upcoming` when upcoming items exist.

---

## Phase 5: Tests

**Purpose**: E2E coverage for the critical user journeys.

- [x] T009 Write `e2e/upcoming.spec.ts` — three scenarios:
  1. Seed a future-released movie onto the watchlist, visit `/upcoming`, assert it appears in "Coming Soon" sorted correctly
  2. Seed a movie with `releaseDate` within the last 30 days (unwatched) and a future movie, visit `/upcoming`, assert both sections render with correct items
  3. With no upcoming/recent watchlist items, visit `/upcoming`, assert empty state and "Go to watchlist" link are present

---

## Phase 6: Polish

- [x] T010 Run `yarn lint` and `yarn format` on all touched files
- [x] T011 Run `yarn ci:check` (requires Postgres) — all tests pass, build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No upstream dependencies — start here
- **Phase 2 (US1)**: Depends on T001 + T002
- **Phase 3 (US2)**: Depends on T003 (updates the same page file)
- **Phase 4 (US3)**: Depends on T003; T008 is independent (different file)
- **Phase 5 (Tests)**: Depends on T003–T008 being complete
- **Phase 6 (Polish)**: Final gate

### Parallel Opportunities Within Phases

- T001 and T002 are in different files — run in parallel
- T004 (loading.tsx) and T006 (nav) are independent — run in parallel once T003 exists
- T008 (watchlist link) can run in parallel with any US3 task

---

## Implementation Strategy

### MVP (US1 only)

1. T001 → T002 → T003 → T004
2. Visit `/upcoming` manually and verify it works
3. Commit: `feat(upcoming): add /upcoming page for watchlist release dates`

### Full Feature

4. T005 + T006 (US2, parallel)
5. T007 + T008 (US3, parallel)
6. T009 (tests)
7. T010 + T011 (polish + CI gate)
