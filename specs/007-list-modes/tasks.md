# Tasks: List Modes & Feature Toggles

**Input**: Design documents from `/specs/007-list-modes/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependency before any code changes

- [x] T001 Install `@dnd-kit/core` and `@dnd-kit/sortable` packages via `yarn add @dnd-kit/core @dnd-kit/sortable`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + generated client + shared preset lib — ALL user stories depend on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Add `DisplayMode` enum (`GRID`, `LIST`) to `prisma/schema.prisma`
- [x] T003 Add `rankingEnabled Boolean @default(false)`, `votingEnabled Boolean @default(true)`, `commentsEnabled Boolean @default(true)`, `displayMode DisplayMode @default(GRID)`, `itemCap Int?` fields to the `List` model in `prisma/schema.prisma`
- [x] T004 Add `position Int?` and `noteIsSpoiler Boolean @default(false)` fields to the `ListItem` model in `prisma/schema.prisma`
- [x] T005 Run `yarn db:migrate --name add_list_modes` to create migration, then run `yarn db:generate` to regenerate the Prisma client
- [x] T006 Create `src/lib/list-presets.ts` defining `ListPreset` type, `ListFeatureFlags` type, and `LIST_PRESETS` record with entries for `watchlist`, `poll`, `ranked`, `custom` per the data-model.md preset table; export an `applyPreset(preset: ListPreset, overrides?: Partial<ListFeatureFlags>): ListFeatureFlags` helper

**Checkpoint**: Schema migrated, Prisma client regenerated, preset lib available — user story work can begin

---

## Phase 3: User Story 1 — Create a Ranked List (Priority: P1) 🎯 MVP

**Goal**: Owner creates a ranked list, adds items, drag-reorders them; positions are numbered and persisted

**Independent Test**: Create a list with `rankingEnabled: true`, add 5 items, call the reorder endpoint, reload — verify positions are numbered 1–5 and persisted

- [x] T007 [US1] Update `PATCH /api/lists/[slug]` in `src/app/api/lists/[slug]/route.ts` to: accept `rankingEnabled`, `votingEnabled`, `commentsEnabled`, `displayMode`, `itemCap` fields; enforce ranking/voting mutex; handle position assignment/clearing in transaction
- [x] T008 [US1] Update `POST /api/lists/[slug]/items` in `src/app/api/lists/[slug]/items/route.ts` to: check item cap and assign position for ranked lists
- [x] T009 [US1] Create `PATCH /api/lists/[slug]/items/reorder` at `src/app/api/lists/[slug]/items/reorder/route.ts`
- [x] T010 [US1] Create `PATCH /api/lists/[slug]/items/[itemId]` at `src/app/api/lists/[slug]/items/[itemId]/route.ts`
- [x] T011 [US1] Create `src/app/(app)/lists/[slug]/list-items-list-view.tsx`
- [x] T012 [US1] Create `src/app/(app)/lists/[slug]/list-item-reorder.tsx` with dnd-kit sortable wrapper
- [x] T013 [US1] Update `src/app/(app)/lists/[slug]/page.tsx` (RSC) to pass flags and conditionally render grid or list view
- [x] T014 [US1] Update `src/app/(app)/lists/[slug]/list-items-grid.tsx` to accept `votingEnabled` prop

**Checkpoint**: Ranked list can be created via PATCH, items reordered via API, list view renders positions — US1 independently testable

---

## Phase 4: User Story 2 — Run a Group Poll (Priority: P1)

**Goal**: List uses votingEnabled; vote controls visible only when enabled; "Votes" sort hidden when disabled

**Independent Test**: Create a list with `votingEnabled: false`, verify vote UI is absent and `POST /vote` returns 403; create one with `votingEnabled: true`, vote from two accounts, verify aggregate score

- [x] T015 [US2] Update `POST /api/lists/[slug]/items/[itemId]/vote` to gate on `votingEnabled`
- [x] T016 [US2] Update `src/app/(app)/lists/[slug]/list-sort-controls.tsx` to accept `showVoteSort` prop
- [x] T017 [US2] Update `parseSort` fallback in page.tsx for disabled voting
- [x] T018 [P] [US2] Update `src/app/(app)/lists/[slug]/list-item-modal.tsx` to accept `votingEnabled` and `commentsEnabled` props

**Checkpoint**: Poll list: voting controls shown/hidden correctly, vote API gated, sort option hidden — US2 independently testable

---

## Phase 5: User Story 3 — Add a Spoiler Note (Priority: P2)

**Goal**: Item notes can be flagged as spoilers; spoiler content is hidden behind a reveal action; reveal is not persisted

**Independent Test**: Add a note to an item and PATCH `noteIsSpoiler: true`; view the list — note text is hidden; click reveal — text appears; navigate away and back — text is hidden again

- [x] T019 [US3] Add `noteIsSpoiler` and `position` to `GridItem` type and `toGridItem` in page.tsx
- [x] T020 [US3] Update modal notes section with spoiler reveal UI
- [x] T021 [US3] Update list-items-list-view.tsx inline notes with spoiler reveal UI

**Checkpoint**: Spoiler notes hidden by default, reveal works client-side, no persistence — US3 independently testable

---

## Phase 6: User Story 4 — Switch Display Mode (Priority: P2)

**Goal**: Owner can toggle between grid and list display; all viewers see the owner-configured mode

**Independent Test**: PATCH a list to `displayMode: "LIST"`, reload the list page — items render as vertical rows; PATCH back to `"GRID"` — items render as poster cards

- [x] T022 [US4] `displayMode` PATCH already handled by T007
- [x] T023 [US4] Create `src/app/(app)/lists/[slug]/list-settings-panel.tsx`
- [x] T024 [US4] Update page.tsx sidebar to render `<ListSettingsPanel>` for owners

**Checkpoint**: Owner can switch display mode via settings panel; all viewers see the updated layout — US4 independently testable

---

## Phase 7: User Story 5 — Configure Feature Toggles on Existing List (Priority: P3)

**Goal**: Owner can toggle comments, voting, ranking, display mode, and item cap from list settings; no list recreation needed

**Independent Test**: Open an existing list's settings panel, disable comments, reload as a different user — comment section is gone and `POST /comments` returns 403

- [x] T025 [US5] Update `POST /api/lists/[slug]/items/[itemId]/comments` to gate on `commentsEnabled`
- [x] T026 [US5] Update list-item-modal.tsx to accept `commentsEnabled` prop; thread through grid
- [x] T027 [US5] `list-settings-panel.tsx` includes all feature toggles (implemented in T023)
- [x] T028 [US5] Update page.tsx to pass `commentsEnabled` to `ListItemsGrid` and `ListItemReorder`

**Checkpoint**: All feature toggles configurable from settings; comments/votes/comments APIs gated; UI responds — US5 independently testable

---

## Phase 8: User Story 6 — Use a List Preset on Creation (Priority: P3)

**Goal**: New list creation flow shows preset cards (Watchlist, Poll, Ranked, Custom); selecting a preset pre-fills feature flags

**Independent Test**: Create lists via each preset and verify the API response reflects the correct flag combination for each preset

- [x] T029 [US6] Update `POST /api/lists` to accept `preset` + feature flags, resolve via `applyPreset()`
- [x] T030 [US6] Update `src/app/(app)/lists/new/page.tsx` with preset selector and advanced settings

**Checkpoint**: All three named presets produce the correct flag combination with zero manual overrides needed — US6 independently testable

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T031 [P] Write Vitest unit tests in `src/lib/list-presets.test.ts` — 9 tests, all passing
- [ ] T032 [P] Write Playwright E2E spec `e2e/lists-ranked.spec.ts`: create a list using the Ranked preset, add 3 items, drag to reorder, verify numbered positions persisted on reload
- [ ] T033 [P] Write Playwright E2E spec `e2e/lists-poll.spec.ts`: create a list using the Poll preset, verify vote controls present; disable voting in settings, verify vote controls absent and sort option hidden
- [x] T034 Run `yarn ci:check` — lint clean, unit tests pass, build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story work
- **Phases 3–8 (User Stories)**: All depend on Phase 2; stories can proceed sequentially or in priority order
- **Phase 9 (Polish)**: Depends on all desired user stories; T031–T033 are parallelizable with each other

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; no dependency on other stories
- **US2 (P1)**: Can start after Phase 2; T014 (grid vote prop) should be done before US2 is tested end-to-end
- **US3 (P2)**: Depends on US1 completing T010 (PATCH item route) and T011 (list view) before spoiler UI tasks
- **US4 (P2)**: `displayMode` PATCH already handled in T007 (US1); US4 adds the settings panel UI
- **US5 (P3)**: Depends on T027 (settings panel) which builds on T023 (US4); should come after US4
- **US6 (P3)**: Depends on Phase 2 (list-presets.ts) and modifies NewListPage independently of other stories

### Within Each User Story

- Schema/API tasks before UI tasks
- `ListPage` RSC changes (T013) before client component changes that depend on new props
- Commit after each logical group per Constitution Principle IV (infrastructure before app code)

---

## Parallel Opportunities

```bash
# Phase 2 — run in sequence (each depends on the previous):
T002 → T003 → T004 → T005 → T006

# Phase 3 — after T007 and T008 are done, T009 and T010 can run in parallel:
T007, T008 → (T009 [P], T010 [P]) → T011 → T012 → T013 → T014

# Phase 4 — T015, T016, T017 can run in parallel after T013 (page RSC is updated):
(T015 [P], T016 [P], T017 [P]) → T018

# Phase 9 — all test tasks are parallel:
(T031 [P], T032 [P], T033 [P]) → T034
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only — Ranked + Poll)

1. Complete Phase 1: Install dnd-kit
2. Complete Phase 2: Schema, migration, presets lib
3. Complete Phase 3: US1 (Ranked list)
4. Complete Phase 4: US2 (Poll)
5. **STOP and VALIDATE**: Test ranked drag-reorder and vote gating independently
6. Demo / deploy if ready

### Incremental Delivery

1. Foundation + US1 → Ranked lists work → Deploy
2. - US2 → Voting toggle works → Deploy
3. - US3 → Spoiler notes work → Deploy
4. - US4 → Display mode switch works → Deploy
5. - US5 → Full settings panel → Deploy
6. - US6 → Preset creation flow → Deploy

### Total Task Count

- Phase 1: 1 task
- Phase 2: 5 tasks (foundational)
- Phase 3 (US1): 8 tasks
- Phase 4 (US2): 4 tasks
- Phase 5 (US3): 3 tasks
- Phase 6 (US4): 3 tasks
- Phase 7 (US5): 4 tasks
- Phase 8 (US6): 2 tasks
- Phase 9 (Polish): 4 tasks
- **Total: 34 tasks** (32 complete, 2 E2E specs deferred)
