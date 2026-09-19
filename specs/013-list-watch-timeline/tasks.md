# Tasks: List Watch Timeline

**Input**: Design documents from `/specs/013-list-watch-timeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/timeline-page.md, quickstart.md

**Tests**: Included — SC-002/SC-003/SC-005 call for automated assertions and the constitution requires Vitest for lib logic and Playwright for list journeys.

**Organization**: Tasks are grouped by user story. US5 (access follows list visibility) is delivered by the Foundational phase because the proxy allowlist and access block are prerequisites for the page itself; its Playwright coverage lives in its own phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project. `src/app/(public)/` = routes that render without a session, `src/lib/` = business logic, `e2e/` = Playwright. No schema or migration work in this feature.

---

## Phase 1: Setup

**Purpose**: Confirm the environment runs the existing suites before adding to them.

- [x] T001 Verify `DATABASE_URL` in `.env` reaches a local Postgres and `yarn test -- src/lib/list-watch-history.test.ts` passes on `013-list-watch-timeline`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure timeline builder, the uncapped watch fetch, and the anonymous-capable route — everything the page and every story depends on. Delivers US5's access matrix by construction.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Make `take` optional in `fetchListWatchHistory` in `src/lib/list-watch-history.ts` — remove the `= 200` default and only `.slice(0, take)` when `take` is a number; confirm `src/app/(public)/lists/[slug]/history/page.tsx` still passes `take: 200` explicitly
- [x] T003 [P] Create `src/lib/list-watch-timeline.ts` exporting the types from data-model.md (`TimelineMedia`, `TimelineWatcher`, `TimelineEntry`, `AnonymisedTimelineEntry`, `UnwatchedItem`, `MonthMarker`, `ListTimeline<E>`) and `buildListTimeline({ items, watches, window, now })`: anchor each `mediaItemId` at `max(watchedAt)`; sort entries by `anchorAt` asc then `title`; collapse episode rows to one `TimelineWatcher` per (user, UTC day) with `episodeCount`; sort watchers by `watchedAt` asc then name; `axis.start = window.startsAt ?? min(watchedAt)`, `axis.end = window.endsAt ?? max(watchedAt)`, `null` when no window and no entries; `months` = first-of-month (UTC) markers strictly after the start month through the end month, only when start/end months differ, label `"October"` or `"October 2026"` when the year differs from `axis.start`; `today = now` iff `axis.start <= now < utcDayEndExclusive(axis.end)`; `unwatched` = items with no watch, in input order; `windowNotStarted = window.startsAt != null && window.startsAt > now`. Reuse `utcDayStart`/`utcDayEndExclusive` from `src/lib/watch-entry-merge.ts`
- [x] T004 [P] In `src/lib/list-watch-timeline.ts` add `stripWatchers(timeline)` → `ListTimeline<AnonymisedTimelineEntry>` (replace `watches` with `watchCount` = number of raw watch rows for that title; no `user` keys survive) and `groupEntriesByDay(entries)` → `{ dayKey: "YYYY-MM-DD" (UTC), date: Date, entries: E[] }[]` preserving entry order
- [x] T005 Create `src/lib/list-watch-timeline.test.ts` (Vitest, follow `src/lib/list-watch-history.test.ts` for the `row()` fixture style) covering: one entry per title anchored at the **latest** watch; entries ordered oldest→newest then by title; same-day watchers listed on one entry ascending; episode rows collapse to one watcher per user per day with `episodeCount`; axis uses window bounds when set and watch min/max when not; `axis === null` with no window and no watches; single-watch axis collapses to one day without error; `months` empty within one month and correct across Sep→Nov (2 markers, year suffix only when it differs); `today` set inside the span and `null` outside; `unwatched` lists items without watches in input order and is empty when all watched; `entries.length + unwatched.length === items.length`; `windowNotStarted` true only for a future start; `stripWatchers` output JSON contains no `"user"`, `"name"`, or `"avatarUrl"` keys and carries the right `watchCount`; `groupEntriesByDay` yields one group per UTC day
- [x] T006 Run `yarn test -- src/lib/list-watch-timeline.test.ts` and `yarn lint`; commit T002–T005 as `feat(lists): add list watch timeline builder`
- [x] T007 Add `const PUBLIC_LIST_TIMELINE_PAGE = /^\/lists\/(?!new$)[^/]+\/timeline$/;` to `src/proxy.ts`, OR it into `isPublicRoute`, and update the comment above `PUBLIC_LIST_PAGE` so it no longer implies every sub-route is excluded (history stays excluded); commit as `feat(lists): allow anonymous access to the list timeline route`

**Checkpoint**: Builder tested, route reachable without a session — page work can begin

---

## Phase 3: User Story 1 - See the list unfold over time (Priority: P1) 🎯 MVP

**Goal**: `/lists/[slug]/timeline` renders every watched, non-hidden title once, oldest first on a vertical axis with day labels and month markers; members see watcher names/avatars/dates.

**Independent Test**: Create a list with three titles, log watches on different dates, open the Timeline page; titles appear once each in date order with the member's name on each entry.

- [x] T008 [US1] Create `src/app/(public)/lists/[slug]/timeline/page.tsx`: `generateMetadata` mirroring the list page's leak guard (title `"<name> · Timeline"` when `resolveListAccess` is `"granted"`, else `"Timeline"`); the page loads the list by slug with `members { userId }` and `items` filtered `isHidden: false`, ordered `[{ position: "asc" }, { addedAt: "desc" }]`, including `mediaItem { tmdbId, type, title, poster, year }`; `notFound()` on missing; `await auth()` then `resolveListAccess` — `"login"` → `redirect('/login?callbackUrl=' + encodeURIComponent('/lists/<slug>/timeline'))`, `"forbidden"` → `redirect('/lists/<slug>')`; call `fetchListWatchHistory({ mediaItemIds, memberUserIds: unique [ownerId, ...members], window })` with no `take`; `buildListTimeline({ items, watches, window, now: new Date() })`; `canSeeWatchers = isOwner || isMember`; pass `canSeeWatchers ? timeline : stripWatchers(timeline)` to `ListTimeline`
- [x] T009 [P] [US1] Create `src/app/(public)/lists/[slug]/timeline/list-timeline.tsx` (Server Component, no `"use client"`) per contracts/timeline-page.md: `<section aria-label="Watch timeline">` with a two-column layout — fixed rail `w-14 sm:w-20 shrink-0` holding the spine (`border-l` line), start terminal + `axis.start` date, one day label per `groupEntriesByDay` group (`Sat 3 Sep`, UTC), interleaved month markers (`months`) and a **Today** marker (`today`) placed by date, end terminal + `axis.end` date; content column `min-w-0 flex-1` with `<ul>` of compact rows (`rounded-lg border p-3`, `data-testid="timeline-entry"`): poster `w-10 h-15` via `tmdbImageUrl(poster, "w92")` or a `bg-zinc-800` placeholder, title link to `/movies/<tmdbId>` or `/tv/<tmdbId>` with `(year)` muted; when the entry has `watches`, render a wrapping cluster of `Avatar h-6 w-6` + name + date (+ `· N episodes` when `episodeCount > 0`); when it has `watchCount`, render `Watched once` / `Watched N times` in `text-xs text-muted-foreground`
- [x] T010 [US1] Add the page chrome in `page.tsx`/`list-timeline.tsx`: back link `← <list name>` to `/lists/<slug>` (same classes as the history page), `h1` "Timeline" (`text-2xl font-bold`), and `<div className="mx-auto max-w-3xl px-4 py-8">` wrapper; ensure nothing sets a fixed width without an `sm:` prefix so the page has no horizontal scroll at 390px
- [x] T011 [P] [US1] Create `src/app/(public)/lists/[slug]/timeline/loading.tsx` using `Skeleton` from `@/components/ui/skeleton`: back-link + heading + subline skeletons, then six rail/row pairs (`w-14 sm:w-20` rail skeleton beside an `h-[60px] w-full rounded-lg` row skeleton) mirroring the final layout
- [x] T012 [US1] Run `yarn lint` and `yarn build`-safe type check (`yarn tsc --noEmit` if available, else `yarn build`); commit T008–T011 as `feat(lists): render a watch timeline page for each list`

**Checkpoint**: Members can open `/lists/<slug>/timeline` directly and see the ordered timeline

---

## Phase 4: User Story 2 - Timeline respects the list's date range (Priority: P1)

**Goal**: With a challenge window the axis is anchored to it, only in-window watches count, the heading shows the range, and a Today marker appears while the window is in progress.

**Independent Test**: Set a window in the past, log a watch today → empty "in this window" state; widen the window to include today → the title appears and the axis starts at the window start with a Today marker.

- [x] T013 [US2] In `src/app/(public)/lists/[slug]/timeline/page.tsx` render `describeChallengeWindow(window)` under the `h1` (`mt-1 text-sm text-muted-foreground`) when non-null, exactly as the history page does
- [x] T014 [US2] In `src/app/(public)/lists/[slug]/timeline/list-timeline.tsx` render the axis terminals from `axis.start`/`axis.end` (which are already the window bounds when set), the month markers, and the Today marker (`aria-hidden` dot + visible "Today" text in `text-xs font-semibold`), and verify visually that a window starting before the first watch shows the start terminal above the first entry
- [x] T015 [US2] Implement the empty states in `list-timeline.tsx` per contracts/timeline-page.md (dashed `rounded-xl` box, `CalendarRange` icon at `opacity-30`): `windowNotStarted` → "This challenge hasn't started yet." + window description; window set → "Nothing watched in this window yet." + window description; no window → "No member has logged a watch of anything on this list yet."; fold this into the same `feat(lists): render a watch timeline page for each list` commit if T012 has not been committed yet, otherwise commit as `feat(lists): bound the list timeline to the challenge window`

**Checkpoint**: Window bounding and empty states verified per quickstart steps 3–4

---

## Phase 5: User Story 5 - Timeline access follows list visibility (Priority: P1)

**Goal**: Access matches the list page for every (tier, viewer) pair; non-members never receive watcher identities.

**Independent Test**: PUBLIC list timeline logged-out renders with dates and no names; MEMBERS list logged-out redirects to login; PRIVATE list as a non-member redirects to the list page; member sees names.

- [x] T016 [US5] Manually verify per quickstart steps 5–6 that a logged-out visitor on a PUBLIC list gets the anonymised timeline and that the page source contains no member display name; confirm MEMBERS → `/login?callbackUrl=%2Flists%2F<slug>%2Ftimeline`
- [x] T017 [US5] Create `e2e/lists-timeline.spec.ts` with file-local `createList(request, visibility)`, `addMovie(request, slug, tmdbId)`, `logWatch(request, tmdbId)` (POST `/api/media/status` `{ tmdbId, type: "movie", status: "WATCHED" }`), and `gotoTimeline(page, slug)` (waits for the `h1`) helpers, following `e2e/lists-challenge.spec.ts` and `e2e/lists-public.spec.ts`; add tests: (a) PUBLIC list with a watched title opened in a fresh logged-out context shows the title and `Watched once` and does **not** contain `TEST_USER.name`; (b) MEMBERS list opened logged-out redirects to `/login?callbackUrl=%2Flists%2F<slug>%2Ftimeline`; (c) PRIVATE list opened as `TEST_USER_2` (non-member) lands on `/lists/<slug>`

---

## Phase 6: User Story 3 - See what is still unwatched (Priority: P2)

**Goal**: A "Not watched yet (N)" peer section lists non-hidden titles without a qualifying watch, in list order; omitted when empty; hidden items never appear anywhere.

**Independent Test**: Two watched + one unwatched title → the unwatched title appears only under "Not watched yet (1)"; hide it → the section disappears.

- [x] T018 [US3] In `src/app/(public)/lists/[slug]/timeline/list-timeline.tsx` render `timeline.unwatched` as a peer section (`data-testid="timeline-unwatched"`) below the timeline/empty state: `h3 text-base font-semibold` "Not watched yet" with `<span className="text-sm font-normal text-muted-foreground">N</span>`, then compact rows (`rounded-lg border p-3`, `w-10 h-15` poster, title + year link) in list order; omit the section when the array is empty
- [x] T019 [US3] Confirm `page.tsx` queries items with `where: { isHidden: false }` so hidden items reach neither the timeline nor the unwatched group (FR-011); commit T018 as `feat(lists): list unwatched titles under the timeline`

---

## Phase 7: User Story 4 - Reach the timeline from the list (Priority: P2)

**Goal**: A Timeline icon button in the list header for every viewer who can see the list, next to Challenge history for members; the timeline's back link returns to the list.

**Independent Test**: Open a list (as member, non-member, and logged-out on a PUBLIC list), click the Timeline button, land on the timeline, follow the back link.

- [x] T020 [US4] In `src/app/(public)/lists/[slug]/list-page-header.tsx` import `CalendarRange` from `lucide-react` and add an ungated `Button variant="ghost" size="icon" className="h-9 w-9" asChild` wrapping `<Link href={`/lists/${listSlug}/timeline`} aria-label="Timeline">` immediately before the `hasSidebar`-gated Challenge history button; commit as `feat(lists): link to the timeline from the list header`
- [x] T021 [US4] Extend `e2e/lists-timeline.spec.ts` with a member journey: create a MEMBERS list, add two films (27205 Inception, 155 The Dark Knight), `logWatch` Inception, open the list, click `getByLabel("Timeline")`, assert the `h1` "Timeline", one `timeline-entry` containing "Inception" and `TEST_USER.name`, and `timeline-unwatched` containing "The Dark Knight" and "1"; then set a window `2020-01-01 → 2020-01-31` via PATCH and reload → "Nothing watched in this window yet."; widen to `{ challengeStartsAt: today, challengeEndsAt: null }` → Inception visible and "Today" visible; finally click the back link and assert the list `h1`
- [x] T022 [US4] Run `yarn test:e2e -- e2e/lists-timeline.spec.ts` until green; commit T017 + T021 as `test(lists): cover the list watch timeline journeys`

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T023 [P] Add a **Timeline** subsection under "Running a challenge" in `docs/lists.md` describing the page, the latest-watch anchoring, window bounding, the "Not watched yet" group, and that non-members see dates but not who watched; add "with a watch timeline" (or similar) to the Collaborative lists bullet in `README.md`; commit as `docs(lists): describe the list watch timeline`
- [x] T024 Responsive verification per `docs/ui-ux-standards.md` → "Responsive layout": screenshot `/lists/<slug>/timeline` at ~390px and desktop for a member (with a multi-watcher entry) and logged-out on a PUBLIC list; confirm no horizontal scroll, wrapping watcher cluster, and the rail staying fixed width; fix any overflow before proceeding
- [x] T025 Run `yarn ci:check` (lint + format + migrate + test + build) on `013-list-watch-timeline` and fix anything it reports
- [x] T026 Mark all tasks complete in `specs/013-list-watch-timeline/tasks.md`; commit as `docs(specs): mark list watch timeline tasks complete`
- [ ] T027 Deploy per quickstart: `git checkout main && git merge --ff-only 013-list-watch-timeline && git push origin main`; watch the Release workflow with `gh run watch` until semantic-release cuts the minor version and the Docker image is pushed

---

## Dependencies & Execution Order

```text
Phase 1 (T001)
  └─ Phase 2 (T002 → T003/T004 [P] → T005 → T006 → T007)
       └─ Phase 3 US1 (T008, T009 [P], T010, T011 [P] → T012)     🎯 MVP
            ├─ Phase 4 US2 (T013, T014, T015)
            ├─ Phase 5 US5 (T016, T017)
            ├─ Phase 6 US3 (T018, T019)
            └─ Phase 7 US4 (T020, T021 → T022)
                 └─ Phase 8 (T023 [P], T024, T025 → T026 → T027)
```

- US2, US5, US3, US4 all depend only on US1's page existing; they touch different regions of `list-timeline.tsx` / `page.tsx` and can be built in any order after Phase 3, but the e2e tasks (T017, T021) are written into one spec file and committed together in T022.
- T007 (proxy) is foundational for US5's anonymous journey but is independent of the page code.

## Parallel Execution Examples

- Phase 2: T003 and T004 are the same file but separable functions — write together; T005 (tests) can be drafted alongside from data-model.md.
- Phase 3: T009 (`list-timeline.tsx`) and T011 (`loading.tsx`) in parallel with T008 (`page.tsx`).
- Phase 8: T023 (docs) in parallel with T024 (responsive check).

## Implementation Strategy

1. **MVP** = Phases 1–3: a member can open the timeline URL and see the ordered timeline with watcher names. Everything else layers on the same page.
2. Add window bounding + empty states (US2), then the access/anonymisation e2e (US5), then the unwatched group (US3), then the header link + member e2e (US4).
3. Docs, responsive check, `yarn ci:check`, then fast-forward merge to `main` to deploy.
