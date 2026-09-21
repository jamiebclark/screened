# Research: List Row Layout — Rank Badge & Overview Fallback

**Feature**: `014-list-row-layout` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

All findings come from reading the current component and its consumers; there are no external
dependencies to evaluate and the spec carries no `NEEDS CLARIFICATION` markers.

## Current state (baseline facts)

- Target file: `src/app/(public)/lists/[slug]/list-items-list-view.tsx` (client component; `ListRow`
  - `SpoilerNote` + `ListItemsListView`). Rendered by `page.tsx` when `list.displayMode === "LIST"`.
- Row root: `flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 … cursor-pointer`, plus
  `opacity-50` when `item.isHidden`. Children in order: **rank column** (`w-7 shrink-0`, only when
  `rankingEnabled && item.displayRank !== undefined`) → **poster** (`w-16 h-24`) → **content**
  (`flex-1 min-w-0 sm:flex sm:gap-3`: title block `sm:w-44 sm:shrink-0` + optional note/tags block
  `min-w-0 mt-2 sm:mt-0 sm:flex-1`) → **badge cluster** (`flex items-center gap-2 shrink-0`: vote
  pill, comment badge, `EyeOff`, hide toggle).
- Rank span: `text-sm font-bold text-muted-foreground tabular-nums` — the `tabular-nums` class is
  what `e2e/lists-ranked.spec.ts` ("ranked list displays position numbers in list view") locates via
  `[class*="tabular-nums"]`. It must survive on the rank element.
- Note slot today: rendered only when `item.notes || item.tags.length > 0`; note is either
  `<SpoilerNote>` or `<div class="line-clamp-3"><MarkdownContent/></div>`; tags render below with
  `mt-1`.
- `GridItem.mediaItem.overview: string | null` is already typed in `list-items-grid.tsx` and populated
  by `page.tsx` (`overview: item.mediaItem.overview`). No data change is needed (FR-016 holds).
- Hover background is `bg-muted/50` — a translucent overlay, so the effective row colour differs
  between rest and hover. There is a single colour theme in `src/app/globals.css` (`:root` only; no
  `.dark` / `prefers-color-scheme` block), but FR-009 still asks for a fade that is independent of
  the row background.
- Tailwind is v4.2.4, which ships the `mask-b-from-*` / `mask-b-to-*` utilities (CSS `mask-image`
  linear gradient toward the bottom edge). `text-xs` has `line-height: 1rem`, so three lines of
  `text-xs` = 48px = `max-h-12`.
- E2E specs touching this row: `lists-ranked.spec.ts` (rank visibility via `tabular-nums`; drag
  reorder tests use their own DnD rows), `lists-curation.spec.ts` (`opacity-50` on hidden row;
  walks from the title text up two ancestors before searching for the hide toggle),
  `lists-edit.spec.ts` (grid-mode rank badge, not this component). None asserts on the rank column's
  position or on note rendering → no Playwright changes are required (spec Assumption / FR-017).

## R1 — Rank placement mechanism

**Decision**: Turn the trailing badge cluster into a stretched column and put the rank in normal
flow beneath the badges:

```
<div class="flex flex-col items-end justify-between self-stretch shrink-0 gap-1.5">
  <div class="flex items-center gap-2"> …vote pill / comment badge / EyeOff / hide toggle… </div>
  {rankingEnabled && item.displayRank !== undefined && (
    <span class="text-sm font-bold text-muted-foreground tabular-nums leading-none">{rank}</span>
  )}
</div>
```

The row keeps `items-start`; `self-stretch` makes the cluster as tall as the row (≥ the 96px
poster) and `justify-between` pins the rank to the bottom-right corner while the badges stay at the
top-right, exactly as today. The rank column before the poster is deleted, so the poster becomes the
first child and is flush against the row's `p-3`.

**Rationale**: In-flow layout cannot overlap anything (FR-003) at any width — the cluster's width is
`max(badge row, rank)` and the content column (`flex-1 min-w-0`) stops before it. It needs no
`relative`/`absolute`/`z-index`, works when the badge row is empty (viewer, no votes, no comments,
not hidden — the rank is still rendered at the bottom), inherits `opacity-50` from the row for hidden
items (FR-005), and adds no height: badges (~24px) + gap + rank (~14px) ≪ 96px poster (FR-014).

**Alternatives considered**:

- `absolute bottom-3 right-3` on a `relative` row — rejected: when the badge row is empty on a phone,
  the stacked note/tags column runs the full row width and the rank would sit on top of it; would
  also need reserved padding to avoid the badges. Also conflicts with the "overlays anchor to the
  poster" rule for no gain.
- Keeping the cluster as a single row and appending the rank after the hide toggle — rejected: that
  is "right of the badges", not "beneath" them, and widens the cluster on phones.

## R2 — Overview fallback precedence and whitespace handling

**Decision**: Derive two values at the top of `ListRow`:

```
const note = item.notes?.trim() ? item.notes : null;              // whitespace-only → no note
const overview = !note && item.mediaItem.overview?.trim()
  ? item.mediaItem.overview.trim() : null;                        // only when there is no note
```

Slot content order: `note` (spoiler or markdown, unchanged) → `overview` → nothing; tags render
below whichever is present (FR-011/012/013). The spoiler branch keys off `note`, so an unrevealed
spoiler never falls through to the overview (FR-012).

**Rationale**: Matches the spec's edge cases (empty/whitespace note and summary treated as absent)
with two local constants and no change to `GridItem` or the page loader (FR-016). `item.notes` is
still passed untrimmed to `MarkdownContent` so existing note rendering is byte-identical (SC-006).

**Alternatives considered**: trimming in `page.tsx` `makeGridItem` — rejected because it touches the
data shape shared with grid mode and the modal, which are out of scope.

## R3 — Overview visibility by breakpoint and row-height guarantee

**Decision**: The overview `<p>` gets `hidden sm:block`. The note/tags wrapper is rendered when
`note || overview || item.tags.length > 0`, with its classes chosen so that a wrapper that only
holds the overview contributes nothing on phones:

- `note || tags.length > 0` → `min-w-0 mt-2 sm:mt-0 sm:flex-1` (today's classes)
- overview only → `min-w-0 hidden sm:block sm:flex-1`

**Rationale**: FR-007 (nothing below `sm`) and Acceptance 2.3 (phone row height unchanged) — a
hidden wrapper cannot add the `mt-2` margin. From `sm` up the wrapper is the note column
(`sm:flex-1`) as today. The `hidden sm:block` on the `<p>` itself keeps the phone layout free of the
overview even when tags force the wrapper to render.

## R4 — Three-line cap with a bottom fade

**Decision**:

```
<p class="hidden sm:block text-xs text-muted-foreground max-h-12 overflow-hidden mask-b-from-8 mask-b-to-12">
  {overview}
</p>
```

- `max-h-12` (48px) = three lines of `text-xs` (`line-height: 1rem`); `overflow-hidden` hides the rest.
- `mask-b-from-8 mask-b-to-12` = `mask-image: linear-gradient(to bottom, black 2rem, transparent 3rem)`
  — fully opaque for the first two lines (0–32px), the third line fades to transparent by 48px.
- No `line-clamp` (that yields an ellipsis) and no fixed `h-12` (a one-line summary must not reserve
  three lines).

**Rationale**:

- `mask-image` fades the element's own pixels to transparent, so whatever is behind — rest
  background, `hover:bg-muted/50`, any future theme — shows through with no band (FR-009, SC-005).
  A `bg-gradient-to-t from-background` overlay (the pattern used on title pages) would produce a
  visible band on hover because the row's hover colour is not `--background`.
- Pixel-based stops (rather than `mask-b-from-50%`) keep one- and two-line summaries fully opaque
  (edge case "very short plot summary"); a percentage gradient would fade the bottom half of a
  single line. Trade-off accepted: a summary that is exactly three lines with no overflow still
  shows its third line faded. TMDB overviews at the note column's width (~300–500px at `text-xs`)
  are almost always longer, so this is the rare case.
- `text-xs text-muted-foreground` is the row's metadata treatment (FR-010).
- Row height: title block on desktop is ≈ 35px (two-line title) + 16px (meta) + 22px (attribution)
  ≈ 73px; overview 48px + tags (`mt-1` + ~22px) ≈ 74px; both < 96px poster → the poster still sets
  the row height, satisfying FR-014 / SC-003.

**Alternatives considered**:

- `line-clamp-3` — rejected: ellipsis is explicitly disallowed (FR-008).
- Absolute gradient overlay `div` — rejected for the hover band reason above and because it would
  need a `relative` wrapper plus a colour that tracks hover state.
- Percentage mask stops — rejected (short-summary artefact).
- JS overflow detection to apply the mask only when clipped — rejected: `ResizeObserver` per row for
  a cosmetic edge case is disproportionate.

## R5 — Test strategy

**Decision**: No new Vitest (no `src/lib/` logic; the two trim/precedence constants are trivial and
live in the component). No new Playwright spec, no edits to existing specs — none asserts on the
rank column position or note rendering; the `tabular-nums` class and the title/hide-toggle DOM
depth are preserved so `lists-ranked.spec.ts` and `lists-curation.spec.ts` keep passing unchanged.
Verification is the responsive screenshot recipe from `docs/ui-ux-standards.md` (390px, 640px, and
desktop; assert `scrollWidth <= viewport`) plus `yarn ci:check`; the recipe is written up in
[quickstart.md](quickstart.md).

**Rationale**: Constitution V — Playwright is for critical journeys when behaviour changes; this
is a presentational change with existing coverage of the user-visible invariants (rank visible,
hidden row faded, hide toggle reachable).

## R6 — Commit plan

**Decision**: Two `fix(lists)` commits, in this order:

1. `fix(lists): move list-row rank under the trailing badge cluster` — R1 only.
2. `fix(lists): show plot summary in empty list-row note slot on desktop` — R2–R4.

Both are patch-level user-facing fixes per the request; neither touches schema, env, README, or
generated code, so no infrastructure commit precedes them.
