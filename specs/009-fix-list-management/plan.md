# Implementation Plan: Fix List Management (rename, reorder, layout, search)

**Branch**: `009-fix-list-management` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-fix-list-management/spec.md`

## Summary

Four defects on the collaborative list page (`/lists/<slug>`) are fixed end-to-end. All four are
regressions/gaps in existing surfaces, not new subsystems — no schema change is required.

1. **Reorder does not persist (P1)** — the drag saves fine; the _render_ throws the order away.
   `src/app/(app)/lists/[slug]/page.tsx` always splits items into `movies / tvShows / watchedMovies
/ watchedTv` and concatenates them, even when `rankingEnabled` is true, so a mixed-type or
   partly-watched ranked list is regrouped on every load. Fix: a pure ordering module in
   `src/lib/list-item-ordering.ts` that returns a single flat ranked sequence when the list is
   ranked, plus hardening of `PATCH /api/lists/[slug]/items/reorder` to renumber contiguously from
   the submitted full ordering, and client-side revert + error surface on failure.
2. **Cannot rename / edit description (P1)** — `PATCH /api/lists/[slug]` already accepts `name` and
   `description` but validates neither, and no UI exposes them. Fix: a pure validator in
   `src/lib/list-validation.ts` (shared by create and update), plus name/description fields at the
   top of the owner settings panel.
3. **Add-title search too limited (P2)** — `GET /api/search` hard-codes `.slice(0, 8)`, ignores
   `page`, and supports no year or TV-only restriction, so short/generic titles ("House" 1985,
   "Arena" 1989) are unreachable. Fix: pure param parsing/validation in
   `src/lib/title-search-params.ts`, `searchTv` + year/page support in `src/lib/tmdb.ts`, an
   extended `/api/search` contract, and media-type / year / "load more" controls in the list
   add-title dialog.
4. **Layout locked after creation (P3)** — the display-mode radio and its persistence path already
   work; the control is buried under three checkboxes behind a hidden-until-dirty save button, and
   for a _ranked_ list the grid layout ignores ranked order, which makes switching look broken. Fix:
   restructure the settings panel so layout is a labelled first-class control, and make the grid
   honour ranked order (single ranked grid, rank badge, no media-type sections).

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 App Router (RSC)
**Primary Dependencies**: Prisma 6 (PostgreSQL), NextAuth v5 (JWT), Tailwind v4 + Radix UI,
`@dnd-kit/core` + `@dnd-kit/sortable` (already used by `list-item-reorder.tsx`), TMDB REST API
**Storage**: PostgreSQL via Prisma. **No schema change** — `List.name`, `List.description`,
`List.displayMode`, and `ListItem.position` all already exist.
**Testing**: Vitest (unit, `src/lib/*.test.ts`), Playwright (E2E, `e2e/*.spec.ts`)
**Target Platform**: Self-hosted web app (Docker Compose), modern evergreen browsers + mobile Safari
(drag handles use `touch-none` already)
**Project Type**: Next.js web application — single project, route groups under `src/app/`
**Performance Goals**: add-title search renders results within 2 s of the user finishing typing
(SC-005); 350 ms debounce retained; TMDB responses cached by `tmdbFetch` (`revalidate: 3600`)
**Constraints**: TMDB `/search/multi` accepts no year parameter (see research.md R3); TMDB pages are
fixed at 20 results; reorder must stay a single transaction so no item is left without a position
**Scale/Scope**: 4 user stories, 31 functional requirements. ~4 lib modules (2 new, 2 extended),
2 API routes extended, 6 client components touched, 0 migrations.

**Unknowns**: none. Every value the spec left to the implementation (length limits, page size,
year bounds, multi+year semantics) is resolved in [research.md](./research.md).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](/.specify/memory/constitution.md) (v1.1.0):

- [x] **I. Server Components First** — ordering, grouping, and rank numbering stay in the RSC
      (`page.tsx`) via a pure lib module. Client components (`list-settings-panel`,
      `list-item-reorder`, `list-add-fab`) mutate via `fetch` to Route Handlers and then call
      `router.refresh()`. The add-title dialog's search state is client-only (no `router.refresh()`
      on search — only after a successful add), which is the documented exception.
- [x] **II. Security by Default** — `PATCH /api/lists/[slug]` and
      `PATCH /api/lists/[slug]/items/reorder` keep their `await auth()` → 401 guard and their
      owner / contributor checks (FR-005, FR-014, FR-018, FR-029). New validation returns 400 with
      a human-readable `error` string (FR-025, FR-031). `GET /api/search` keeps its 401 guard;
      TMDB failures are logged server-side and returned as a generic message (FR-025). No new env
      vars, no secrets client-side.
- [x] **III. Migrations Only** — no schema change, therefore no migration and no `db push`.
- [x] **IV. Conventional Commits** — commit plan below is ordered lib → routes → UI → tests → docs,
      one concern per commit.
- [x] **V. Test at the Right Level** — three new/extended Vitest suites for the pure lib modules
      (`list-item-ordering`, `list-validation`, `title-search-params`); Playwright coverage extended
      in `e2e/lists-ranked.spec.ts` (UI drag persistence, ranked grid order, viewer has no handle)
      and a new `e2e/lists-edit.spec.ts` (rename, description, layout switch, non-owner refusal).
      `yarn ci:check` is the completion gate.

**Post-Phase-1 re-check**: still passing. The design adds no client-side data fetching for rendered
list data, no schema change, and no new route without an `auth()` guard. See
[contracts/](./contracts/) for the per-route status codes.

## Project Structure

### Documentation (this feature)

```text
specs/009-fix-list-management/
├── plan.md              # This file
├── research.md          # Phase 0 output — root causes + resolved decisions
├── data-model.md        # Phase 1 output — entities, invariants, no migration
├── quickstart.md        # Phase 1 output — how to verify each of the four fixes
├── contracts/           # Phase 1 output — API contracts
│   ├── lists-slug-patch.md
│   ├── list-items-reorder-patch.md
│   └── search-get.md
├── checklists/
│   └── requirements.md  # Already present (spec quality gate, all passing)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── list-item-ordering.ts          # NEW — pure: ranked flat order vs. grouped sections,
│   │                                  #        contiguous display ranks, position normalisation
│   ├── list-item-ordering.test.ts     # NEW — Vitest
│   ├── list-validation.ts             # NEW — pure: name/description limits + trim/validate
│   ├── list-validation.test.ts        # NEW — Vitest
│   ├── title-search-params.ts         # NEW — pure: parse/validate q, type, year, page, limit
│   ├── title-search-params.test.ts    # NEW — Vitest
│   └── tmdb.ts                        # EXTENDED — searchTv(); year+page on searchMovie/searchMulti;
│                                      #            popularity on TmdbSearchResult
├── app/
│   ├── api/
│   │   ├── lists/
│   │   │   ├── route.ts               # EXTENDED — POST validates via list-validation
│   │   │   └── [slug]/
│   │   │       ├── route.ts           # EXTENDED — PATCH validates name/description; 400 on bad input
│   │   │       └── items/reorder/
│   │   │           └── route.ts       # EXTENDED — require full ordering; renumber 1..n in one txn
│   │   └── search/
│   │       └── route.ts               # EXTENDED — type=movie|tv|multi, year, page, limit; paging meta
│   └── (app)/lists/[slug]/
│       ├── page.tsx                   # EXTENDED — use list-item-ordering; ranked bypasses grouping
│       ├── list-items-grid.tsx        # EXTENDED — ranked mode: one flat grid + rank badge
│       ├── list-item-reorder.tsx      # EXTENDED — revert + error message on failed save
│       ├── list-items-list-view.tsx   # EXTENDED — display rank from sequence, not raw position
│       ├── list-settings-panel.tsx    # EXTENDED — name + description fields; layout promoted
│       └── list-add-fab.tsx           # EXTENDED — media-type + year refinements, load more,
│                                      #            stale-response guard, empty state
├── docs/
│   └── lists.md                       # EXTENDED — document rename/layout editing + search refinements
└── e2e/
    ├── lists-ranked.spec.ts           # EXTENDED — UI drag persists; ranked grid order; viewer read-only
    └── lists-edit.spec.ts             # NEW — rename, description, layout switch, non-owner refused
```

**Structure Decision**: The existing Next.js single-project layout is used unchanged — business
logic in `src/lib/`, mutations in `src/app/api/**/route.ts`, route-local client components beside
`src/app/(app)/lists/[slug]/page.tsx`. No new directories. The three new lib modules exist so the
regression-prone parts (ordering, validation, search-param handling) are pure and unit-testable,
per constitution principle V.

### UI/UX density decisions (made now, per constitution)

The feature introduces no new collection, but it changes two existing ones and adds one control
group. Densities are fixed here so tasks do not have to decide:

| Surface                                   | Expected count       | Pattern                                                                                                                                             |
| ----------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ranked list rows (`list-items-list-view`) | 10–100+              | Keep existing compact rows (`p-3`, `w-16 h-24` poster). Unchanged.                                                                                  |
| Ranked grid (`list-items-grid`)           | 10–100+              | Keep existing `MediaCard` grid, one flat section, rank badge top-left as a small pill. No h3 per media type when ranked.                            |
| Add-title search results                  | 8 default, 20 loaded | Compact rows (`px-3 py-2.5`, `28×42` poster) — as today; "Load more" is a full-width ghost button below the list.                                   |
| Settings panel edit fields                | 2 fields + 1 control | Stacked form rows inside the existing Settings tab; layout becomes a labelled 2-up segmented control (as today, moved up and re-labelled "Layout"). |

Section headings in the settings panel stay `text-sm font-medium` inline labels to match the
surrounding modal — the panel is not a page, so the `h3 text-base font-semibold` page rule does not
apply. The grid's per-media-type headings keep their current uppercase-tracking style for unranked
lists (unchanged) and are simply not rendered when the list is ranked.

### Commit plan (ordered, per constitution IV)

1. `feat(lists): add pure ordering, validation and search-param lib modules` (+ their Vitest suites)
2. `feat(tmdb): support tv search, year and page parameters`
3. `fix(lists): renumber ranked positions contiguously on reorder`
4. `fix(lists): validate list name and description on create and update`
5. `feat(search): support media type, year, paging and result limit`
6. `fix(lists): honour ranked order in both list and grid layouts`
7. `feat(lists): edit name, description and layout from list settings`
8. `feat(lists): refine add-title search by type, year and paging`
9. `test(lists): cover list edit and reorder journeys end to end`
10. `docs(lists): document list editing and search refinements`

## Complexity Tracking

> No constitution violations. Section intentionally empty.
