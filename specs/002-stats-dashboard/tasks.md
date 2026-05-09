# Tasks: Stats Dashboard

**Input**: Design documents from `specs/002-stats-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: Grouped by user story. No schema migrations required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story this task belongs to

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Core query/aggregation layer — must land before any page code that consumes it.

**⚠️ CRITICAL**: All page tasks depend on this.

- [x] T001 Create `src/lib/stats-queries.ts` exporting `getStatsData(userId: string): Promise<StatsData>` — two parallel Prisma queries (watched MediaItems + non-null ratings), then JS aggregation to produce `summary`, `genreBreakdown`, `decadeBreakdown`, `ratingsHistogram`, `topDirectors`, `topActors` per data-model.md; use `directors[]` array with fallback to legacy `director` string field

**Checkpoint**: `getStatsData` compiles and returns correctly-typed data.

---

## Phase 2: User Story 1 — View Total Watch Time (Priority: P1) 🎯 MVP

**Goal**: A user visits `/stats` and sees total hours watched, total titles, and average rating. Unauthenticated users are redirected to login. Users with no watch history see an empty state.

**Independent Test**: Visit `/stats` with watch history present; verify total hours, title count, and average rating display and match manual calculations.

- [x] T002 [US1] Create `src/app/(app)/stats/page.tsx` — RSC that calls `getStatsData`, authenticates with `await auth()`, renders a 3-card summary row (Total Hours Watched, Titles Watched, Average Rating) and a full-page empty state when `totalTitles === 0` with a link to `/history`; add `export const metadata = { title: "Stats" }`
- [x] T003 [P] [US1] Create `src/app/(app)/stats/loading.tsx` — `animate-pulse` skeleton mirroring the final layout: header badge + title, 3 summary card placeholders, and 4 section placeholders (genre, decade, histogram, people)

**Checkpoint**: `/stats` loads, shows summary cards, redirects unauthenticated users.

---

## Phase 3: User Story 2 — Genre & Decade Breakdowns (Priority: P2)

**Goal**: Watched titles are visually broken down by genre (ranked) and by release decade (chronological) using horizontal bar charts.

**Independent Test**: Add watched titles spanning multiple genres and decades; verify both sections render with correct relative bar widths and counts.

- [x] T004 [US2] Update `src/app/(app)/stats/page.tsx` — add "Genre Breakdown" section (`h3` heading) with horizontal percentage bars (genre label | bar | count) ranked by count desc; add "By Decade" section with horizontal bars ordered chronologically; show "No data yet" inline note when the respective array is empty

**Checkpoint**: Genre and decade sections render with correct bars; sections are absent or show "No data" when arrays are empty.

---

## Phase 4: User Story 3 — Ratings Histogram (Priority: P3)

**Goal**: Users see a bar chart of how many titles they rated at each value (0.5–5.0), revealing their rating tendencies.

**Independent Test**: Rate several titles at varying levels; verify each bucket count in the histogram matches the actual rating distribution.

- [x] T005 [US3] Update `src/app/(app)/stats/page.tsx` — add "Ratings" section with vertical bar chart across all 10 buckets (0.5 to 5.0); each bar height proportional to `percentage`; show rating label below; show "No ratings yet" note when `ratingsHistogram` is empty

**Checkpoint**: Ratings section renders with correctly-proportioned bars; shows empty note with no ratings.

---

## Phase 5: User Story 4 — Most-Watched Directors & Actors (Priority: P4)

**Goal**: Users see ranked top-10 lists for directors and actors from their watch history.

**Independent Test**: Watch titles with known directors and cast; verify ranked lists reflect correct counts.

- [x] T006 [US4] Update `src/app/(app)/stats/page.tsx` — add "Top Directors" and "Top Actors" sections each rendering a numbered ranked list with name and count badge (top 10); show "No data yet" inline note when the respective array is empty

**Checkpoint**: Director and actor lists render with correct counts; empty notes shown when data is absent.

---

## Phase 6: Navigation

**Goal**: `/stats` is accessible from the main nav.

- [x] T007 [P] Update `src/components/nav.tsx` — skipped: WatchingTabs component already provides History/Stats/Activity tab navigation; standalone nav link is redundant — add `{ href: "/stats", label: "Stats", icon: BarChart2 }` to the `navLinks` array after the "Upcoming" entry; import `BarChart2` from `lucide-react`

**Checkpoint**: Stats link appears in nav on all app routes.

---

## Phase 7: Tests

**Purpose**: E2E coverage for the critical user journeys.

- [x] T008 Write `e2e/stats.spec.ts` — three scenarios:
  1. Seed watched movies/shows with genres and a known runtime, visit `/stats`, assert summary cards show non-zero values and "Genre Breakdown" section is present
  2. Seed rated titles, visit `/stats`, assert "Ratings" section is present with at least one non-zero bar
  3. With no watch history for the test user, visit `/stats`, assert empty state and a link to `/history` are present

---

## Phase 8: Polish

- [x] T009 Run `yarn lint` and `yarn format` on all touched files
- [ ] T010 Run `yarn ci:check` (requires Postgres) — all tests pass, build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No upstream dependencies — start here
- **Phase 2 (US1)**: Depends on T001
- **Phase 3 (US2)**: Depends on T002 (updates the same page file)
- **Phase 4 (US3)**: Depends on T004 (updates the same page file)
- **Phase 5 (US4)**: Depends on T005 (updates the same page file)
- **Phase 6 (Nav)**: Independent — can run any time after branch is created
- **Phase 7 (Tests)**: Depends on T002–T007 being complete
- **Phase 8 (Polish)**: Final gate

### Parallel Opportunities Within Phases

- T003 (`loading.tsx`) is fully independent of T002 — run in parallel
- T007 (nav) is in a different file — run in parallel with any other phase
- T008 (tests) can only start after all UI tasks are done

---

## Implementation Strategy

### MVP (US1 only)

1. T001 → T002 + T003 (parallel) → T007 (parallel)
2. Visit `/stats` manually and verify summary cards and empty state work
3. Commit: `feat(stats): add /stats page with summary stats`

### Full Feature

4. T004 (US2) → T005 (US3) → T006 (US4)
5. T007 nav (can land any time)
6. T008 (tests)
7. T009 + T010 (polish + CI gate)
