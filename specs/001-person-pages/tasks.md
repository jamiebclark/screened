# Tasks: Person/Cast/Crew Detail Pages

**Input**: Design documents from `/specs/001-person-pages/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: E2E tests included (required per spec success criteria)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Foundation for person pages feature - TMDB API integration and TypeScript types

- [ ] T001 [P] [Foundation] Add TypeScript types for TMDB Person API in `src/types/person.ts`
- [ ] T002 [P] [Foundation] Add TypeScript types for Person Filmography in `src/types/person.ts`
- [ ] T003 [Foundation] Extend `tmdbImage()` helper in `src/lib/tmdb.ts` to support profile photos (size "w185")

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core TMDB person API integration and filmography queries that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [Foundation] Implement `getPerson(tmdbId: number)` in `src/lib/tmdb.ts` with 7-day cache
- [ ] T005 [Foundation] Implement `searchPersonByName(name: string)` in `src/lib/tmdb.ts` with 7-day cache
- [ ] T006 [Foundation] Create `src/lib/person-filmography-queries.ts` file
- [ ] T007 [Foundation] Implement `getPersonFilmography(personName, userId)` query with PostgreSQL array contains
- [ ] T008 [P] [Foundation] Add unit tests for `getPerson()` in `src/lib/tmdb.test.ts`
- [ ] T009 [P] [Foundation] Add unit tests for `searchPersonByName()` in `src/lib/tmdb.test.ts`
- [ ] T010 [P] [Foundation] Add unit tests for `getPersonFilmography()` in `src/lib/person-filmography-queries.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Cast and Crew on Title Pages (Priority: P1) 🎯 MVP

**Goal**: Display cast members and director on movie/TV pages with profile photos

**Independent Test**: Navigate to any movie or TV page and verify cast/director names display prominently with photos

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create `PersonAvatar` component in `src/components/person-avatar.tsx` with initials fallback
- [ ] T012 [P] [US1] Create `PersonCastCrewSection` component in `src/components/person-cast-crew-section.tsx`
- [ ] T013 [US1] Modify `src/app/(app)/movies/[tmdbId]/page.tsx` to display cast/crew section below overview
- [ ] T014 [US1] Modify `src/app/(app)/tv/[tmdbId]/page.tsx` to display cast/crew section below overview
- [ ] T015 [US1] Add profile photo fetching logic to PersonCastCrewSection using `searchPersonByName()`
- [ ] T016 [US1] Style PersonCastCrewSection to match existing UI patterns per `docs/ui-ux-standards.md`
- [ ] T017 [US1] Handle missing profile photos with PersonAvatar fallback (initials)
- [ ] T018 [US1] Add loading states for profile photo fetches

### E2E Tests for User Story 1

- [ ] T019 [P] [US1] Create `e2e/title-cast-crew.spec.ts` for cast/crew display verification
- [ ] T020 [P] [US1] Add E2E test: Movie page displays director name
- [ ] T021 [P] [US1] Add E2E test: Movie page displays up to 8 cast members
- [ ] T022 [P] [US1] Add E2E test: TV page displays creator name
- [ ] T023 [P] [US1] Add E2E test: TV page displays up to 8 cast members
- [ ] T024 [P] [US1] Add E2E test: Profile photos display when available

**Checkpoint**: At this point, cast/crew display on title pages should be fully functional and testable independently

---

## Phase 4: User Story 2 - Navigate to Person Detail Pages (Priority: P1) 🎯 MVP

**Goal**: Clickable cast/director names that navigate to person detail pages with profile info

**Independent Test**: Click on any cast member or director name on a title page and verify navigation to a person page with profile information

### Implementation for User Story 2

- [ ] T025 [US2] Create `src/app/(app)/person/[tmdbId]/` directory
- [ ] T026 [US2] Create `src/app/(app)/person/[tmdbId]/page.tsx` Server Component for person detail page
- [ ] T027 [US2] Create `src/app/(app)/person/[tmdbId]/loading.tsx` with skeleton matching page layout
- [ ] T028 [US2] Fetch person details from TMDB in person page RSC
- [ ] T029 [US2] Display person name as h1 heading
- [ ] T030 [US2] Display person profile photo using PersonAvatar component
- [ ] T031 [US2] Display known_for_department (e.g., "Acting", "Directing")
- [ ] T032 [US2] Display biography if available (hide section if empty)
- [ ] T033 [US2] Add metadata (title, og tags) for SEO
- [ ] T034 [US2] Handle invalid person TMDB ID with notFound() (404 page)
- [ ] T035 [US2] Make cast/director names in PersonCastCrewSection clickable links to `/person/[tmdbId]`
- [ ] T036 [US2] Handle cases where person name doesn't resolve to TMDB ID (render as plain text)

### E2E Tests for User Story 2

- [ ] T037 [P] [US2] Create `e2e/person-pages.spec.ts` for person page navigation verification
- [ ] T038 [P] [US2] Add E2E test: Clicking cast member navigates to person page
- [ ] T039 [P] [US2] Add E2E test: Clicking director navigates to person page
- [ ] T040 [P] [US2] Add E2E test: Person page displays name as h1
- [ ] T041 [P] [US2] Add E2E test: Person page displays profile photo or initials
- [ ] T042 [P] [US2] Add E2E test: Person page displays known_for department
- [ ] T043 [P] [US2] Add E2E test: Invalid person ID returns 404

**Checkpoint**: At this point, navigation from title pages to person pages should work, and person pages display profile info

---

## Phase 5: User Story 3 - View Person's Library Filmography (Priority: P2)

**Goal**: Person pages show complete filmography filtered to user's connected libraries, organized by media type

**Independent Test**: Navigate to a person page and verify filmography lists only titles from connected libraries, organized into Movies and TV Shows sections

### Implementation for User Story 3

- [ ] T044 [P] [US3] Create `PersonFilmography` component in `src/components/person-filmography.tsx`
- [ ] T045 [US3] Fetch filmography using `getPersonFilmography()` in person page RSC
- [ ] T046 [US3] Pass filmography data to PersonFilmography component
- [ ] T047 [US3] Organize filmography into Movies and TV Shows sections
- [ ] T048 [US3] Sort titles by release date (newest first) within each section
- [ ] T049 [US3] Reuse MediaCard component for each title display
- [ ] T050 [US3] Display poster, title, and release year for each filmography item
- [ ] T051 [US3] Handle empty filmography with helpful message ("No titles featuring [Name] found in your libraries")
- [ ] T052 [US3] Add section headings ("Movies", "TV Shows") with counts
- [ ] T053 [US3] Ensure responsive grid layout (matches existing MediaCard grids)

### E2E Tests for User Story 3

- [ ] T054 [P] [US3] Add E2E test: Person page displays Movies section
- [ ] T055 [P] [US3] Add E2E test: Person page displays TV Shows section
- [ ] T056 [P] [US3] Add E2E test: Filmography titles match titles in user's library
- [ ] T057 [P] [US3] Add E2E test: Titles sorted by release date (newest first)
- [ ] T058 [P] [US3] Add E2E test: Empty filmography shows helpful message
- [ ] T059 [P] [US3] Add E2E test: Filmography only shows library titles (not full TMDB filmography)

**Checkpoint**: At this point, person pages display filtered filmography organized by media type

---

## Phase 6: User Story 4 - Identify Watch Status in Filmography (Priority: P2)

**Goal**: Filmography items show visual indicators for watched, watchlist, and unwatched titles

**Independent Test**: View a person page with mixed watch statuses and verify visual indicators clearly distinguish watched, watchlist, and unwatched titles

### Implementation for User Story 4

- [ ] T060 [US4] Add watch status data to filmography query (join with UserMediaStatus)
- [ ] T061 [US4] Pass watch status to PersonFilmography component
- [ ] T062 [US4] Add watch status badges to MediaCard instances in PersonFilmography
- [ ] T063 [US4] Display "watched" indicator (checkmark/badge) on watched titles
- [ ] T064 [US4] Display "watchlist" indicator (bookmark icon) on watchlist titles
- [ ] T065 [US4] Display user rating on rated titles
- [ ] T066 [US4] Ensure indicators match existing watch status badge patterns in codebase
- [ ] T067 [US4] Handle null watch status (user hasn't tracked title)

### E2E Tests for User Story 4

- [ ] T068 [P] [US4] Add E2E test: Watched titles display checkmark/badge
- [ ] T069 [P] [US4] Add E2E test: Watchlist titles display bookmark icon
- [ ] T070 [P] [US4] Add E2E test: Rated titles display user rating
- [ ] T071 [P] [US4] Add E2E test: Unwatched titles have no indicator
- [ ] T072 [P] [US4] Add E2E test: Watch status indicators match actual user watch history

**Checkpoint**: At this point, filmography clearly shows which titles user has watched/tracked

---

## Phase 7: User Story 5 - Access Title Details from Filmography (Priority: P3)

**Goal**: Clickable filmography titles navigate to title detail pages

**Independent Test**: Click on any filmography item and verify navigation to that title's detail page

### Implementation for User Story 5

- [ ] T073 [US5] Make MediaCard instances in PersonFilmography clickable (should already work if using existing MediaCard)
- [ ] T074 [US5] Verify navigation to `/movies/[tmdbId]` for movie filmography items
- [ ] T075 [US5] Verify navigation to `/tv/[tmdbId]` for TV filmography items
- [ ] T076 [US5] Test back button navigation from title page to person page

### E2E Tests for User Story 5

- [ ] T077 [P] [US5] Add E2E test: Clicking movie in filmography navigates to movie page
- [ ] T078 [P] [US5] Add E2E test: Clicking TV show in filmography navigates to TV page
- [ ] T079 [P] [US5] Add E2E test: Back button returns to person page

**Checkpoint**: At this point, users can navigate seamlessly between person and title pages

---

## Phase 8: User Story 6 - View Watch Statistics for Person (Priority: P3)

**Goal**: Person pages display aggregate statistics (titles watched, average rating, total watch time)

**Independent Test**: View a person page for someone whose work you've watched and verify statistics are calculated correctly

### Implementation for User Story 6

- [ ] T080 [US6] Calculate watched count from filmography data in person page RSC
- [ ] T081 [US6] Calculate average rating from filmography ratings
- [ ] T082 [US6] Calculate total watch time (sum of movie runtimes) from filmography
- [ ] T083 [US6] Create stats display component or section on person page
- [ ] T084 [US6] Display "X titles watched" stat
- [ ] T085 [US6] Display "Average rating: X/5" stat (only if user has rated titles)
- [ ] T086 [US6] Display "Total watch time: X hours" stat (movies only)
- [ ] T087 [US6] Handle edge case: person with 0 watched titles (hide stats section)

### E2E Tests for User Story 6

- [ ] T088 [P] [US6] Add E2E test: Person page displays watched count
- [ ] T089 [P] [US6] Add E2E test: Person page displays average rating (when titles are rated)
- [ ] T090 [P] [US6] Add E2E test: Person page displays total watch time
- [ ] T091 [P] [US6] Add E2E test: Stats section hidden when no titles watched

**Checkpoint**: All user stories should now be independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, error handling, and final QA

- [ ] T092 [P] [Polish] Test filmography query performance with 100+ title library (should be <500ms)
- [ ] T093 [P] [Polish] Add database indexes if performance testing shows need (see data-model.md)
- [ ] T094 [Polish] Verify TMDB API caching (check Network tab for 7-day cache headers)
- [ ] T095 [P] [Polish] Test person pages on mobile responsive layout
- [ ] T096 [P] [Polish] Test with large filmographies (50+ titles per person)
- [ ] T097 [Polish] Add error boundary for person page fetch failures
- [ ] T098 [Polish] Test rate limit handling (degrade gracefully if TMDB rate limited)
- [ ] T099 [P] [Polish] Run `yarn lint` and fix any issues
- [ ] T100 [P] [Polish] Run `yarn format` on all modified files
- [ ] T101 [Polish] Run `yarn test` (unit tests should pass)
- [ ] T102 [Polish] Run `yarn test:e2e` (all E2E tests should pass)
- [ ] T103 [Polish] Run `yarn ci:check` (full CI validation)
- [ ] T104 [P] [Polish] Manual testing per quickstart.md checklist
- [ ] T105 [P] [Polish] Update README.md if needed (probably not for this feature)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories ✅ MVP candidate
- **User Story 2 (P1)**: Can start after Foundational - Depends on US1 (uses PersonAvatar component) ✅ MVP candidate
- **User Story 3 (P2)**: Can start after Foundational - Uses components from US1/US2
- **User Story 4 (P2)**: Depends on US3 (extends filmography display)
- **User Story 5 (P3)**: Depends on US3 (makes filmography clickable)
- **User Story 6 (P3)**: Depends on US3 (calculates stats from filmography)

### Within Each User Story

- Tests SHOULD be written first but can proceed in parallel with implementation (already have spec)
- Models/queries before components
- Components before page integration
- Core functionality before enhancements
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001, T002, T003)
- All Foundational tests marked [P] can run in parallel (T008, T009, T010)
- All US1 E2E tests marked [P] can run in parallel (T019-T024)
- All US2 E2E tests marked [P] can run in parallel (T037-T043)
- And so on for each user story's tests
- PersonAvatar (T011) and PersonCastCrewSection (T012) can be built in parallel
- Different user stories can be worked on in parallel by different team members after Foundational completes

---

## Parallel Example: Foundational Phase

```bash
# Launch foundation in parallel:
Task: "Add unit tests for getPerson() in src/lib/tmdb.test.ts"
Task: "Add unit tests for searchPersonByName() in src/lib/tmdb.test.ts"
Task: "Add unit tests for getPersonFilmography() in src/lib/person-filmography-queries.test.ts"
```

## Parallel Example: User Story 1

```bash
# Launch US1 components in parallel:
Task: "Create PersonAvatar component in src/components/person-avatar.tsx with initials fallback"
Task: "Create PersonCastCrewSection component in src/components/person-cast-crew-section.tsx"

# Launch US1 E2E tests in parallel:
Task: "Add E2E test: Movie page displays director name"
Task: "Add E2E test: Movie page displays up to 8 cast members"
Task: "Add E2E test: TV page displays creator name"
Task: "Add E2E test: TV page displays up to 8 cast members"
Task: "Add E2E test: Profile photos display when available"
```

## Parallel Example: User Story 3

```bash
# Launch US3 E2E tests in parallel:
Task: "Add E2E test: Person page displays Movies section"
Task: "Add E2E test: Person page displays TV Shows section"
Task: "Add E2E test: Filmography titles match titles in user's library"
Task: "Add E2E test: Titles sorted by release date (newest first)"
Task: "Add E2E test: Empty filmography shows helpful message"
Task: "Add E2E test: Filmography only shows library titles"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (cast/crew display)
4. Complete Phase 4: User Story 2 (person pages with navigation)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo MVP (users can browse from title to person)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP! ✅)
3. Add User Story 3 → Test independently → Deploy/Demo (filmography added)
4. Add User Story 4 → Test independently → Deploy/Demo (watch status indicators)
5. Add User Story 5 → Test independently → Deploy/Demo (clickable filmography)
6. Add User Story 6 → Test independently → Deploy/Demo (stats)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (MVP - critical path)
   - Developer B: User Story 3 (filmography - can start in parallel)
   - Developer C: Tests and polish
3. Stories complete and integrate independently

### Recommended MVP Scope

**Minimum Viable Product = User Stories 1 + 2 (Priority P1)**

This delivers:

- ✅ Cast/crew display on title pages
- ✅ Navigation to person detail pages
- ✅ Person profile information
- ✅ Complete browsing workflow

User Stories 3-6 are enhancements that add filmography features but MVP works without them.

---

## Task Count Summary

- **Total Tasks**: 105
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 7 tasks (3 tests in parallel)
- **User Story 1**: 14 tasks (6 tests in parallel)
- **User Story 2**: 16 tasks (7 tests in parallel)
- **User Story 3**: 16 tasks (6 tests in parallel)
- **User Story 4**: 13 tasks (5 tests in parallel)
- **User Story 5**: 7 tasks (3 tests in parallel)
- **User Story 6**: 12 tasks (4 tests in parallel)
- **Polish (Phase 9)**: 14 tasks (many in parallel)

**MVP Task Count**: 40 tasks (Setup + Foundation + US1 + US2)

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- E2E tests verify user journeys end-to-end (complementing existing unit tests)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths are exact locations for implementation
- Follow existing codebase patterns per CLAUDE.md and `.cursor/rules/`
