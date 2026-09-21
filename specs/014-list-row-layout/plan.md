# Implementation Plan: List Row Layout — Rank Badge & Overview Fallback

**Branch**: `014-list-row-layout` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-list-row-layout/spec.md`

## Summary

Two presentational fixes to `ListRow` in `src/app/(public)/lists/[slug]/list-items-list-view.tsx`,
the list-mode row on the list detail page. (1) Delete the leading `w-7` rank column so the poster is
the first, flush-left element; move the rank into the trailing badge cluster, which becomes a
`flex-col self-stretch justify-between` column with the badges at the top-right and the rank pinned
to the bottom-right — in normal flow, so it can never overlap the vote pill or comment badge at any
width. (2) When an item has no (non-whitespace) curator note but `mediaItem.overview` is present,
render the overview in the note slot from `sm` up as `text-xs text-muted-foreground`, capped at
three lines (`max-h-12 overflow-hidden`) with a CSS `mask-image` bottom fade
(`mask-b-from-8 mask-b-to-12`) that is background-independent, so hover and any theme show no band.
Notes and spoiler notes render exactly as today and always win; tags stay below the slot content.
No API, schema, data-shape, env, or test changes; ships as two `fix(lists)` commits.

## Technical Context

**Language/Version**: TypeScript 5 / Node 22
**Primary Dependencies**: Next.js 16 App Router (client component), React 19, Tailwind v4.2.4
(`mask-b-from-*` / `mask-b-to-*` utilities), lucide-react
**Storage**: N/A — reads `GridItem.mediaItem.overview` already delivered by `page.tsx`; no Prisma
change
**Testing**: Existing Playwright suites `e2e/lists-ranked.spec.ts`, `e2e/lists-curation.spec.ts`
(must pass unmodified); responsive screenshot verification per `docs/ui-ux-standards.md`; no new
Vitest (no `src/lib/` logic)
**Target Platform**: Web (self-hosted Docker Compose); verified at 390px, 640px (`sm` edge), 1280px
**Project Type**: Web application — single Next.js project
**Performance Goals**: None beyond today; two `trim()` calls per row, no new effects/observers
**Constraints**: FR-014 row density (`p-3 rounded-lg`, `w-16 h-24` poster) unchanged; overview row
must not exceed the poster-set 96px row height; no horizontal scroll at 390px; rank keeps
`tabular-nums` class hook; title `<p>` and hide-toggle remain reachable by existing e2e locators
**Scale/Scope**: 1 file edited (~30 lines changed), 0 new files, 2 commits

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](.specify/memory/constitution.md) (v1.1.0):

- [x] **I. Server Components First** — no data fetching or mutation is added. The edited file is
      already a `"use client"` component (it owns `SpoilerNote` reveal state and row click handlers);
      the change stays inside it. No `router.refresh()` involvement.
- [x] **II. Security by Default** — no new or changed routes, inputs, or env vars. The overview is
      TMDB text already rendered elsewhere in the app; it is rendered as a text node, not markdown.
- [x] **III. Migrations Only** — no schema change; nothing to migrate.
- [x] **IV. Conventional Commits** — two ordered `fix(lists)` commits (research R6): rank placement
      first, overview fallback second; each is one user-facing concern; no infrastructure commit
      needed.
- [x] **V. Test at the Right Level** — no pure-logic module is introduced, so no Vitest; existing
      Playwright list suites cover the user-visible invariants (rank visible, hidden row faded, hide
      toggle reachable) and must pass unmodified (FR-017 / SC-007). `yarn ci:check` before merge.

**UI/UX standards check**: Density is inherited, not new — the list-mode row is already the
"long feed → compact row" pattern (`p-3 rounded-lg`, 64×96 poster) and FR-014 keeps it. Responsive
rules: poster + title remain side-by-side at all widths (they fit at 390px today and gain the rank
column's 40px); the note column keeps `sm:flex-1` / stacks below `sm`; no fixed widths without
`sm:`; no horizontal scroll. The "overlays anchor to the poster" rule is intentionally not applied
to the rank (spec Assumption) — and the chosen in-flow design is not an overlay at all, so there is
no absolute positioning to anchor. Hierarchy, headings, loading/empty/error states are untouched.

**Post-design re-check (after Phase 1)**: No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/014-list-row-layout/
├── plan.md              # This file
├── research.md          # Phase 0 — R1 rank mechanism, R2 precedence, R3 breakpoint, R4 fade, R5 tests, R6 commits
├── data-model.md        # Phase 1 — consumed GridItem fields, derived values, note-slot state machine
├── quickstart.md        # Phase 1 — seed list, responsive screenshot recipe, gates, commit names
├── contracts/
│   └── list-row.md      # DOM/class contract for ListRow + stable e2e hooks
├── checklists/requirements.md
└── tasks.md             # Phase 2 — /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
src/app/(public)/lists/[slug]/
├── list-items-list-view.tsx   # EDITED — ListRow: remove rank column; badge cluster → column with rank at bottom;
│                              #          note slot: note → overview (sm+, masked) → empty; tags unchanged
├── list-items-grid.tsx        # read-only: GridItem type (mediaItem.overview already present)
└── page.tsx                   # read-only: makeGridItem already passes overview

e2e/
├── lists-ranked.spec.ts       # unchanged — relies on `tabular-nums` on the rank element
└── lists-curation.spec.ts     # unchanged — relies on `opacity-50` row + "Hide item" label
```

**Structure Decision**: Single-file change inside the existing route-local component; no shared
component or lib module is warranted for two derived constants and class changes.

## Design (from research)

### Commit 1 — rank placement (R1)

In `ListRow`:

1. Delete the `{/* Rank number */}` block that precedes the poster.
2. Replace the trailing `div.flex.items-center.gap-2.shrink-0` with:
   - outer `div` `flex flex-col items-end justify-between self-stretch shrink-0 gap-1.5`
   - inner `div` `flex items-center gap-2` containing the existing vote pill / comment badge /
     `EyeOff` / hide toggle, unchanged
   - after it, `{rankingEnabled && item.displayRank !== undefined && <span className="text-sm font-bold text-muted-foreground tabular-nums leading-none">{item.displayRank}</span>}`
3. Row root classes unchanged (`items-start` stays; the column stretches itself).

### Commit 2 — overview fallback (R2–R4)

In `ListRow`:

1. Derive `note` and `overview` (data-model.md → Derived render values).
2. Slot wrapper condition becomes `note || overview || item.tags.length > 0`; classes via `cn`:
   `"min-w-0 sm:flex-1"` + (`note || tags.length > 0` ? `"mt-2 sm:mt-0"` : `"hidden sm:block"`).
3. Slot content: `note ? (noteIsSpoiler ? <SpoilerNote notes={item.notes}/> : <div className="line-clamp-3"><MarkdownContent content={item.notes}/></div>) : overview ? <p className="hidden sm:block text-xs text-muted-foreground max-h-12 overflow-hidden mask-b-from-8 mask-b-to-12">{overview}</p> : null`.
4. Tags block unchanged, still after the slot content.

### Verification (R5, quickstart §2–3)

Screenshots at 390 / 640 / 1280 with `scrollWidth <= width`; hover check for band; hidden-row fade;
ranking toggle; then `yarn lint`, the two list suites, `yarn ci:check`.

## Complexity Tracking

No constitution violations; table intentionally empty.
