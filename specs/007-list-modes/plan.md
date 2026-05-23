# Implementation Plan: List Modes & Feature Toggles

**Branch**: `007-list-modes` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-list-modes/spec.md`

## Summary

Add per-list feature flags (ranking, voting, comments, display mode, item cap) and list creation presets (Watchlist, Poll, Ranked) to the existing collaborative list system. Schema adds 5 fields to `List` and 2 to `ListItem`, backed by API enforcement and UI that shows/hides controls based on flags. Drag-and-drop reorder via `@dnd-kit/sortable` for ranked lists.

## Technical Context

**Language/Version**: TypeScript (Node 20, Next.js 15 App Router)
**Primary Dependencies**: Next.js 15, Prisma 6, Tailwind v4, Radix UI, Vitest, Playwright, `@dnd-kit/core` + `@dnd-kit/sortable` (new)
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Vitest (unit logic), Playwright (E2E user journeys)
**Target Platform**: Web — self-hosted Docker Compose
**Project Type**: Full-stack web application (RSC + Route Handlers)
**Performance Goals**: No new requirements; reorder writes N rows per op (acceptable for small lists)
**Constraints**: Must use Prisma migrations only; drag-and-drop is desktop-first
**Scale/Scope**: Existing list user base; lists are expected to be small (<100 items)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](.specify/memory/constitution.md) (v1.0.0):

- [x] **I. Server Components First** — `ListPage` (RSC) passes new flags as props to client components; mutations go via `fetch` → Route Handler → `router.refresh()`
- [x] **II. Security by Default** — All new/modified routes call `await auth()`, validate inputs, return correct status codes; no secrets in client env vars
- [x] **III. Migrations Only** — Schema changes use `yarn db:migrate --name add_list_modes`; schema + migration committed together before app code
- [x] **IV. Conventional Commits** — Infrastructure commits first (schema → migration → generated → lib → routes → UI → tests); each layer is a separate commit
- [x] **V. Test at the Right Level** — Vitest for preset/mutex logic in `src/lib/`; Playwright E2E for ranked list creation, vote gating, spoiler reveal

## Project Structure

### Documentation (this feature)

```text
specs/007-list-modes/
├── plan.md              # This file
├── research.md          # Phase 0 output — DnD library, position strategy, mutex approach
├── data-model.md        # Phase 1 output — schema changes, state transitions
├── contracts/
│   └── api-contracts.md # Phase 1 output — new/modified endpoint contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                          # +DisplayMode enum, +5 List fields, +2 ListItem fields
└── migrations/<timestamp>_add_list_modes/ # New migration folder

src/
├── lib/
│   └── list-presets.ts                    # NEW — preset definitions + ListFeatureFlags type
├── app/
│   ├── (app)/lists/
│   │   ├── new/page.tsx                   # MODIFY — add preset selector + feature toggles
│   │   └── [slug]/
│   │       ├── page.tsx                   # MODIFY — pass new flags to children
│   │       ├── list-items-grid.tsx        # MODIFY — accept votingEnabled prop, hide votes
│   │       ├── list-items-list-view.tsx   # NEW — list-view display with positions + inline notes
│   │       ├── list-sort-controls.tsx     # MODIFY — hide "votes" sort when votingEnabled=false
│   │       ├── list-settings-panel.tsx    # NEW — owner settings sidebar panel
│   │       ├── list-item-modal.tsx        # MODIFY — spoiler note reveal; hide comments if disabled
│   │       └── list-item-reorder.tsx      # NEW — dnd-kit sortable wrapper for ranked list view
│   └── api/lists/
│       ├── route.ts                       # MODIFY — POST accepts preset + feature flags
│       └── [slug]/
│           ├── route.ts                   # MODIFY — PATCH accepts + enforces feature flags
│           └── items/
│               ├── route.ts               # MODIFY — item cap check + position assignment
│               ├── reorder/route.ts       # NEW — bulk position update
│               └── [itemId]/
│                   ├── route.ts           # NEW — PATCH for noteIsSpoiler + notes
│                   ├── vote/route.ts      # MODIFY — check votingEnabled
│                   └── comments/route.ts  # MODIFY — check commentsEnabled
```

**Structure Decision**: Single Next.js project. New files are co-located with existing list route files. Lib module `list-presets.ts` is the only new `src/lib/` file; it's a pure constant module suitable for both server and client use (no Prisma imports).

## Complexity Tracking

> No constitution violations. All patterns follow established project conventions.

---

## Phase 0: Research (Complete)

See [research.md](research.md).

**Key decisions**:

1. **DnD library**: `@dnd-kit/sortable` — actively maintained, TypeScript-first, React 19 compatible
2. **Position storage**: Sequential integers with full re-index on reorder (lists are small)
3. **Mutex enforcement**: Application-layer only (PATCH handler + UI), no DB constraint
4. **Spoiler reveal**: Local React `useState`, never persisted
5. **Votes on disable**: Preserved in DB, hidden in UI

---

## Phase 1: Design & Contracts (Complete)

See [data-model.md](data-model.md) and [contracts/api-contracts.md](contracts/api-contracts.md).

---

## Phase 2: Implementation Order

Tasks generated by `/speckit-tasks`. Order of commits must follow Constitution Principle IV:

### Commit group 1 — Schema & Generated Code

1. Add `DisplayMode` enum + 5 `List` fields + 2 `ListItem` fields to `schema.prisma`
2. Run `yarn db:migrate --name add_list_modes` → commit migration folder
3. Run `yarn db:generate` → commit generated Prisma client

### Commit group 2 — Library Layer

4. Create `src/lib/list-presets.ts` with `LIST_PRESETS`, `ListFeatureFlags` type, `applyPreset()` helper

### Commit group 3 — API Routes

5. Update `POST /api/lists` — preset resolution + feature flags
6. Update `PATCH /api/lists/[slug]` — feature flag persistence + mutex + position assignment/clear
7. Update `POST /api/lists/[slug]/items` — item cap check + position assignment
8. Create `PATCH /api/lists/[slug]/items/reorder` — bulk position update
9. Create `PATCH /api/lists/[slug]/items/[itemId]` — notes + noteIsSpoiler update
10. Update vote route — `votingEnabled` gate
11. Update comments route — `commentsEnabled` gate

### Commit group 4 — UI: Creation Flow

12. Install `@dnd-kit/core` + `@dnd-kit/sortable`
13. Update `NewListPage` — preset selector cards + optional toggle overrides

### Commit group 5 — UI: List Display

14. Update `ListPage` (RSC) — pass new flags down; resolve `canVote` using `votingEnabled`
15. Update `ListItemsGrid` — hide vote controls when `votingEnabled = false`
16. Update `ListSortControls` — hide "Votes" option when `votingEnabled = false`
17. Create `ListItemsListView` — list-view rows with position numbers + inline notes
18. Create `ListItemReorder` — dnd-kit sortable wrapper used inside list view
19. Update `ListItemModal` — spoiler note reveal UI; hide comments section when disabled

### Commit group 6 — UI: Settings Panel

20. Create `ListSettingsPanel` — owner-only sidebar section with feature toggle controls

### Commit group 7 — Tests

21. Vitest: `src/lib/list-presets.test.ts` — preset defaults, mutex logic
22. Playwright: `e2e/lists-ranked.spec.ts` — ranked list creation + reorder
23. Playwright: `e2e/lists-poll.spec.ts` — poll voting + vote-gated sort

---

## Key Design Decisions

### `canVote` resolution

Currently `canVote = isMember || isOwner`. After this change:

```typescript
const canVote = (isMember || isOwner) && list.votingEnabled;
```

This is computed server-side in `ListPage` and passed to client components. No client-side flag exposure required.

### `canComment` (new)

```typescript
const canComment = (isMember || isOwner) && list.commentsEnabled;
```

Passed to `ListItemModal` to gate the comment section.

### `canReorder` (new)

```typescript
const canReorder = list.rankingEnabled && (isOwner || isContributor);
```

Drag handles in list view only render when `canReorder = true`.

### Sort options gating

`ListSortControls` receives a new `showVoteSort: boolean` prop. When `false`, the "Votes" option is omitted from the sort control and the URL param `sort=votes` falls back to `date_added` in `parseSort()`.

### Display mode routing

`ListPage` renders either `<ListItemsGrid>` or `<ListItemsListView>` based on `list.displayMode`. Both accept the same items data shape; list view adds `position` and renders inline notes with spoiler support.

### Existing lists backward compatibility

- All existing lists get `votingEnabled = true` (no behavior change — voting was always on)
- All other flags default to `false`/`GRID`/`null` (no behavior change)
- Existing `sort=votes` URLs continue to work on lists where voting is still enabled
