# Contract: list page view surface (`/lists/[slug]`)

**Feature**: `010-list-item-curation` | **Status**: EXTENDED surface
**File**: `src/app/(app)/lists/[slug]/page.tsx` (+ its route-local client components)

The hidden-item filter and the stats breakout add **no API route** — the filter is a query
parameter read by the Server Component, and the stats are derived in the same render. This document
is their contract: what the URL accepts, what the page guarantees, and what the stats surface shows.

---

## 1. Query parameter contract

| Param    | Values                                 | Default      | Behaviour                                                                                                                                            |
| -------- | -------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sort`   | `date_added` `title` `votes` `release` | `date_added` | Unchanged from today. `votes` falls back to `date_added` when the list has voting disabled.                                                          |
| `hidden` | `exclude`                              | (absent)     | `exclude` removes hidden items from the rendered page. Absent, empty, or any unrecognised value renders the default view: hidden items shown, faded. |

Parsed by `parseListViewParams()` in `src/lib/list-view-params.ts`. Unrecognised values never error
and never 404 — they fall back to the default, so a hand-edited or truncated shared URL still
renders the list.

**Guarantees:**

- **FR-005** — because the state is in the address, a reload keeps the filter, and pasting the URL
  to another member reproduces the same view.
- The filter control preserves `sort` (and any other existing param) when it navigates, using the
  same `new URLSearchParams(searchParams.toString())` + `router.push` pattern as
  `list-sort-controls.tsx`.
- Switching the filter off removes the `hidden` key entirely rather than writing `hidden=include`,
  so the default URL stays clean.

## 2. Render guarantees

| Guarantee                                                                                                                                                         | Requirement    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Items are ordered by `orderListItems()` over the **full** item set, then filtered. `displayRank` is never recomputed after filtering.                             | FR-007, SC-008 |
| A hidden item renders in place, at `opacity-50`, with an `EyeOff` badge and an accessible label.                                                                  | FR-004         |
| Hidden items are never rendered as a separate section, in either layout.                                                                                          | FR-007         |
| The header's item count and watched count are computed from the full set, filter or no filter.                                                                    | FR-006         |
| Drag handles are not rendered when `hidden=exclude`, and a one-line explanation appears above the items: "Reordering is off while hidden items are filtered out." | FR-008         |
| The eye toggle is rendered only when `canCurateListItems(...)` is true. Everyone else still sees which items are hidden and can still use the filter.             | FR-002, FR-003 |
| Tag chips are rendered for every viewer; the tag input only when `canCurateListItems(...)` is true.                                                               | FR-010, FR-011 |

### Three distinct body states

| Condition                                                  | What renders                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `list.items.length === 0`                                  | Today's "No items yet" dashed panel, unchanged.                                       |
| Items exist, `hidden=exclude`, nothing survives the filter | "Every item on this list is hidden." plus a one-click control that clears the filter. |
| Otherwise                                                  | The ordered, filtered items.                                                          |

The second state is required by the spec's first edge case: an all-hidden filtered list must not
look like an empty list.

## 3. Stats breakout contract

**Entry point**: a `Stats` button in the list header's existing action cluster (beside Add and
Settings), rendered for **every** viewer who can see the page — including view-only members and
non-members of a public list (FR-019, FR-007 of story 3, acceptance 3.7).

**Surface**: a Radix `Dialog` (`src/components/ui/dialog.tsx`), so the list stays behind it
(acceptance 3.5). No route, no `loading.tsx`, no fetch on open — the figures arrive as props from the
Server Component.

**Contents**: exactly four labelled figures, no more:

| Label         | Value                 | Definition                                                                                                     |
| ------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Items         | `totalItems`          | Every item, hidden included.                                                                                   |
| Still in play | `visibleItems`        | Items not hidden.                                                                                              |
| Decades       | `distinctDecades`     | Distinct calendar decades of release year across **all** items; items with an unknown year contribute nothing. |
| Tags in use   | `distinctVisibleTags` | Distinct tags (case-insensitively) on **non-hidden** items only.                                               |

**Guarantees:**

- Read-only: the dialog contains no control that mutates the list (FR-024). Its only interactive
  element is close.
- `totalItems === 0` → all four read `0` **and** the dialog shows one line of explanatory copy
  ("Nothing to summarise yet — add some titles.") instead of four bare zeros (FR-023).
- The figures reflect the list as loaded, not as filtered: opening the stats with `hidden=exclude`
  active shows the same four numbers as without it.
- Access is inherited from the page, so a person who cannot view the list cannot read its stats
  (FR-025).

## 4. Props added to existing client components

| Component                  | Added props                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `list-page-header.tsx`     | `stats: ListStats`                                                                               |
| `list-items-grid.tsx`      | `canCurate: boolean`, `tagVocabulary: TagVocabularyEntry[]`; `GridItem` gains `isHidden`, `tags` |
| `list-items-list-view.tsx` | `canCurate: boolean`                                                                             |
| `list-item-reorder.tsx`    | `canCurate: boolean`, `tagVocabulary`, `reorderDisabledReason: string \| null`                   |
| `list-item-modal.tsx`      | `canCurate: boolean`, `tagVocabulary: TagVocabularyEntry[]`                                      |

`ListStats` and `TagVocabularyEntry` are plain TypeScript types from `src/lib/list-stats.ts` and
`src/lib/list-item-tags.ts` — no Prisma import crosses into a client component, and no new enum
mirror is needed ([research.md R13](../research.md)).

## 5. Test expectations

- Vitest: `list-view-params.test.ts` (both params, fallbacks, `votes`-without-voting),
  `list-item-ordering.test.ts` extended (`filterHiddenFromOrdering` preserves `displayRank` in
  ranked mode; filters each grouped section without cross-section movement; `include` is a no-op),
  `list-stats.test.ts` (the acceptance-3 worked examples: 12/3 hidden, decades with a null year, a
  tag only on hidden items, the empty list).
- Playwright (`e2e/lists-curation.spec.ts`): filter on → hidden item gone, others keep their ranks;
  reload keeps the filter; drag handle absent while filtered; all-hidden empty state; stats modal
  opens from the header and its four figures match a hand-counted fixture.
