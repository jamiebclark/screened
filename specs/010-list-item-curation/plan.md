# Implementation Plan: List Item Curation (hide, tags, stats)

**Branch**: `010-list-item-curation` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-list-item-curation/spec.md`

## Summary

Three stacked capabilities on the collaborative list page (`/lists/<slug>`), built in dependency
order. Unlike 009, this feature **does** change the schema: one boolean column and one child model.

1. **Hide / de-activate an item (P1)** — `ListItem.isHidden Boolean @default(false)`: one shared
   flag per item, identical for every viewer, no per-user join table and no viewer-identity filter
   in the read path. A new `PATCH /api/lists/[slug]/items/[itemId]/hidden` sets it absolutely (not a
   flip). The list page renders hidden items in place at half opacity with an `EyeOff` badge, and a
   `?hidden=exclude` query parameter removes them from the view. Crucially, `page.tsx` calls the
   existing `orderListItems()` on the **full** item set and only then drops hidden items via a new
   pure `filterHiddenFromOrdering()` — so ranks are never renumbered and the 009 ranked-order fix
   stays intact. Drag-to-reorder is withdrawn while the filter is active, because the reorder route
   renumbers from the full submitted ordering.
2. **Tags on list items (P2)** — a new `ListItemTag` model (`label` + `normalized`,
   `@@unique([listItemId, normalized])`, cascade from `ListItem`), written through
   `POST …/items/[itemId]/tags` (batch, set-merge, all-or-nothing validation) and
   `DELETE …/items/[itemId]/tags/[tagId]`. The autocomplete vocabulary is **derived in the Server
   Component** from the items the page already loads, by a pure `buildTagVocabulary()` — so FR-012's
   "never suggest tags from another list" is structurally impossible to violate and there is no
   suggestions endpoint to secure.
3. **Stats breakout (P3)** — a pure `computeListStats()` over the already-loaded items, rendered in
   a dialog opened from a **Stats** button in the list header's existing action cluster. Four
   figures: total items, non-hidden items, distinct decades (all items, known years only), distinct
   tags on non-hidden items. Nothing stored, no route, therefore read-only and access-controlled by
   construction.

Five pure lib modules carry the regression-prone logic (`list-item-tags`, `list-stats`,
`list-view-params`, `list-item-permissions`, plus one addition to `list-item-ordering`), which is
what makes the ordering, normalisation and counting rules unit-testable per constitution V.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 App Router (RSC)
**Primary Dependencies**: Prisma 6 (PostgreSQL), NextAuth v5 (JWT), Tailwind v4 + Radix UI
(`Dialog`, `Badge`, `Input`, `Button`), `@dnd-kit/*` (existing, in `list-item-reorder.tsx`),
`lucide-react` (`Eye`, `EyeOff`, `BarChart3`, `X`)
**Storage**: PostgreSQL via Prisma. **Schema change required**: `ListItem.isHidden` (new column) and
`ListItemTag` (new model) — one migration, `add_list_item_hidden_and_tags`.
**Testing**: Vitest (unit, `src/lib/*.test.ts`), Playwright (E2E, `e2e/*.spec.ts`)
**Target Platform**: Self-hosted web app (Docker Compose), modern evergreen browsers + mobile Safari
**Project Type**: Next.js web application — single project, route groups under `src/app/`
**Performance Goals**: no new query per keystroke — tag suggestions are filtered client-side from a
prop, so accepting a suggestion after three characters (SC-004) costs no network round trip. The
list page gains exactly **one** join (`items.tags`) over its existing single `findUnique`; stats and
vocabulary are two in-memory passes over an item-capped array.
**Constraints**:

- `orderListItems()` and `normalizePositions()` in `src/lib/list-item-ordering.ts` are reused
  **unchanged**; no read-path partitioning of list items may be reintroduced (requester's explicit
  constraint, and the 009 regression it fixed).
- Hidden state must be a single boolean on `ListItem` — no per-user join table, no filtering by
  viewer identity in the read path (requester's explicit constraint).
- Migrations only — `yarn db:migrate`; `prisma db push` is prohibited (constitution III).
- Hidden items must keep counting towards `List.itemCap`, and outbound integrations (Radarr export,
  Discord notifications) and vote totals must be unaffected.
- Item **notes** authorisation (`isOwner || isAdder`) must not be widened as a side effect of adding
  curation permissions.

**Scale/Scope**: 3 user stories, 27 functional requirements. 1 migration, 4 new lib modules + 1
extended, 3 new API routes, 4 new client components (hidden filter, hide toggle, tag editor, stats
modal), 6 existing components touched, 5 new/extended Vitest suites, 1 new Playwright spec.

**Unknowns**: none. The spec left no `[NEEDS CLARIFICATION]` markers; all ten of its Assumptions and
every value it left open (tag limits, casing rules, suggestion volume, URL parameter spelling, stats
placement) are resolved in [research.md](./research.md).

**One assumption the spec itself flagged for confirmation** is adopted as written and recorded in
[research.md R5](./research.md): hidden state and tags are editable by the list owner and any
`OWNER`/`CONTRIBUTOR` member **on any item**, which deliberately diverges from the narrower
owner-or-adder rule that governs item notes. The plan isolates that decision in
`src/lib/list-item-permissions.ts`, so reversing it would touch one module and its tests.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](/.specify/memory/constitution.md) (v1.1.0):

- [x] **I. Server Components First** — every rendered value is computed in `page.tsx` (RSC):
      ordering, the hidden filter, the tag vocabulary and all four stats figures. No client component
      fetches list data; the tag autocomplete filters a prop, not a network response. The three
      mutations (hide toggle, tag add, tag remove) are `fetch` calls to Route Handlers followed by
      `router.refresh()`, matching `watch-status-button.tsx`. The optimistic hide toggle keeps local
      state only until the refresh lands, and reverts it on failure — the documented
      `list-item-reorder.tsx` pattern, not a new one.
- [x] **II. Security by Default** — all three new routes call `await auth()` first and return 401
      before touching data, then 404 for an unknown list/item, then 403 via
      `canCurateListItems()` (FR-003, FR-025). Bodies are validated: `isHidden` must be a boolean
      (400), `labels` goes through `validateTagBatch()` whose plain-language `error` is returned
      verbatim (400). Both routes verify the child belongs to the addressed parent
      (`item.listId === list.id`, `tag.listItemId === itemId`) so one list's slug cannot address
      another's rows. Unexpected failures are logged server-side and answered with a generic 500
      message. No new env vars, no secrets client-side, Prisma parameterized API only.
- [x] **III. Migrations Only** — one migration created with
      `yarn db:migrate --name add_list_item_hidden_and_tags`, followed by `yarn db:generate`.
      `prisma/schema.prisma` and `prisma/migrations/<timestamp>_add_list_item_hidden_and_tags/`
      are committed **together**, in the first commit of the stack, before any code that reads the
      new fields. No `db push`. No backfill needed — `@default(false)` is the correct pre-feature
      state for every existing row.
- [x] **IV. Conventional Commits** — the commit plan below is ordered schema → lib → routes → UI →
      tests → docs, one concern per commit, with the three stories landing in their spec'd
      dependency order (hide, then tags, then stats). Every user-visible slice is `feat` so
      semantic-release cuts a minor.
- [x] **V. Test at the Right Level** — five Vitest suites for the pure modules
      (`list-item-tags`, `list-stats`, `list-view-params`, `list-item-permissions`, and
      `list-item-ordering` extended for `filterHiddenFromOrdering`), plus one new Playwright spec
      `e2e/lists-curation.spec.ts` covering all three journeys and the role-based refusals.
      `yarn ci:check` is the completion gate — and because it runs the migration, it also proves the
      new migration applies from scratch.

**Post-Phase-1 re-check**: still passing, and the design tightened two of the principles rather than
straining them.

- Principle I got **stronger**, not weaker: the tag vocabulary and the stats figures were both
  candidates for API routes, and both were resolved to derived props computed in the RSC
  ([research.md R3, R8](./research.md)). The feature adds three write routes and **zero** read
  routes.
- Principle II benefited from the same choice — a `GET …/tags` suggestions endpoint would have been
  a fourth surface needing its own list-visibility check, and a `GET …/stats` a fifth. Neither
  exists. The one place authorisation genuinely differs from an existing handler (curation vs.
  notes) was resolved by adding a **separate route** rather than branching inside
  `PATCH …/items/[itemId]`, precisely so a later refactor cannot widen the notes rule by accident
  ([research.md R5, R6](./research.md)).
- Principle III: the migration is a single additive column plus a single additive table, with no
  data migration and no destructive step.
- No complexity-tracking entries are required; see [Complexity Tracking](#complexity-tracking).

Per-route status codes are specified in [contracts/](./contracts/).

## Project Structure

### Documentation (this feature)

```text
specs/010-list-item-curation/
├── plan.md                          # This file
├── research.md                      # Phase 0 output — 14 resolved decisions + assumption trace
├── data-model.md                    # Phase 1 output — schema change, derived entities, invariants
├── quickstart.md                    # Phase 1 output — hand-verification of all three stories
├── contracts/                       # Phase 1 output
│   ├── list-item-hidden-patch.md    #   PATCH …/items/[itemId]/hidden
│   ├── list-item-tags.md            #   POST …/items/[itemId]/tags, DELETE …/tags/[tagId]
│   └── list-page-view.md            #   ?hidden= query param + stats surface (no API route)
├── checklists/
│   └── requirements.md              # Already present (spec quality gate, all passing)
└── tasks.md                         # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                            # EXTENDED — ListItem.isHidden; new ListItemTag model
└── migrations/
    └── <ts>_add_list_item_hidden_and_tags/  # NEW — committed with the schema

src/
├── lib/
│   ├── list-item-permissions.ts             # NEW — pure: canCurateListItems({isOwner, memberRole})
│   ├── list-item-permissions.test.ts        # NEW — Vitest
│   ├── list-item-tags.ts                    # NEW — pure: normalise, split, validate batch,
│   │                                        #        buildTagVocabulary, suggestTags; TAG_* limits
│   ├── list-item-tags.test.ts               # NEW — Vitest
│   ├── list-stats.ts                        # NEW — pure: computeListStats -> 4 figures
│   ├── list-stats.test.ts                   # NEW — Vitest
│   ├── list-view-params.ts                  # NEW — pure: parseListViewParams (sort + hidden);
│   │                                        #        absorbs the untested parseSort from page.tsx
│   ├── list-view-params.test.ts             # NEW — Vitest
│   ├── list-item-ordering.ts                # EXTENDED — filterHiddenFromOrdering(); isHidden added
│   │                                        #            to OrderableItem. orderListItems() and
│   │                                        #            normalizePositions() UNCHANGED.
│   └── list-item-ordering.test.ts           # EXTENDED — rank preservation under filtering
├── app/
│   ├── api/lists/[slug]/items/[itemId]/
│   │   ├── hidden/route.ts                  # NEW — PATCH { isHidden }; curation permission
│   │   └── tags/
│   │       ├── route.ts                     # NEW — POST { labels: string[] }; set-merge
│   │       └── [tagId]/route.ts             # NEW — DELETE one tag
│   └── (app)/lists/[slug]/
│       ├── page.tsx                         # EXTENDED — include items.tags; parseListViewParams;
│       │                                    #             order-then-filter; stats + vocabulary;
│       │                                    #             canCurate; canReorder gate; 3rd empty state
│       ├── list-hidden-filter.tsx           # NEW — client: ?hidden= toggle, preserves other params
│       ├── list-item-hide-toggle.tsx        # NEW — client: eye toggle, optimistic + revert
│       ├── list-item-tag-editor.tsx         # NEW — client: chips + input + suggestion popover
│       ├── list-stats-modal.tsx             # NEW — client: read-only dialog, 4 figures
│       ├── list-page-header.tsx             # EXTENDED — Stats button in the action cluster
│       ├── list-items-grid.tsx              # EXTENDED — GridItem gains isHidden + tags; faded
│       │                                    #             card + EyeOff badge + hide toggle
│       ├── list-items-list-view.tsx         # EXTENDED — faded row, hide toggle, up-to-3 tag chips
│       ├── list-item-reorder.tsx            # EXTENDED — reorder-disabled note; passes canCurate
│       └── list-item-modal.tsx              # EXTENDED — tag editor + hide toggle in the action row
├── docs/
│   └── lists.md                             # EXTENDED — new "Curating a list" section
└── e2e/
    └── lists-curation.spec.ts               # NEW — hide, tag and stats journeys + role refusals
```

**Structure Decision**: the existing Next.js single-project layout is used unchanged — pure logic in
`src/lib/`, mutations in `src/app/api/**/route.ts`, route-local client components beside
`src/app/(app)/lists/[slug]/page.tsx`. No new directories. The four new lib modules exist because
each holds a rule the spec states precisely and the tests must pin: rank preservation under
filtering, tag normalisation/limits, the four stat definitions, and who may curate. The four new
client components exist because each is one interactive concern; folding them into the already
424-line `list-item-modal.tsx` and 261-line `list-items-grid.tsx` would make both harder to reason
about than the split.

**Explicitly unchanged** (see [research.md R12](./research.md)): `radarr/route.ts`,
`notifyListItemAdded`, `ListItemVote` totals, the `itemCap` check in `POST …/items` (which already
counts hidden items, so FR-026 needs no code — only a test), and
`orderListItems()`/`normalizePositions()`.

### UI/UX density decisions (made now, per constitution)

The constitution requires density to be chosen during planning, not implementation. This feature
introduces two new collections and two new controls.

| Surface                         | Expected count              | Pattern                                                                                                                                                                                                                     |
| ------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag chips on an item            | 0–4 typical, 15 hard cap    | Inline `Badge` pills, `text-xs`, `rounded-full`, wrapping. **Not** cards — they are labels, not entities.                                                                                                                   |
| Tag chips on a list-view row    | show up to **3**, then `+N` | Same pills at `text-[11px]`, appended after the note line. Truncating at 3 keeps the compact `p-3` row from reflowing to two lines.                                                                                         |
| Tag chips on a **grid** card    | **none rendered**           | Deliberate: the poster already carries four overlays (rank/avatar top-left, vote pill top-right, comment badge bottom-right, hide toggle bottom-left). Tags are read and edited in the item modal, which both layouts open. |
| Tag suggestion popover          | ≤ 6                         | Compact rows (`px-3 py-2` , `text-sm`) inside the existing `Popover`, anchored under the input, with the usage count in `text-xs text-muted-foreground`.                                                                    |
| Stats figures                   | exactly 4                   | 2×2 grid of stat tiles, `rounded-lg border p-4`; label `text-xs text-muted-foreground`, value `text-2xl font-semibold`. Four items is the "few items" case, so tiles rather than rows.                                      |
| Hidden-item filter control      | 1 control                   | A pill toggle in the same row as `ListSortControls` (`text-xs px-2.5 py-1 rounded-full border`), matching those buttons exactly. On a ranked list — where the sort row is not rendered — the pill row renders on its own.   |
| Stats entry point               | 1 button                    | Icon button (`BarChart3`, `h-9 w-9`, `variant="ghost"`) in the header's existing action cluster, with `aria-label="List stats"`. Rendered for **every** viewer, unlike Add and Settings which are member-gated.             |
| Hide toggle (grid)              | 1 per card                  | Bottom-left overlay icon button — the one free corner. `Eye`/`EyeOff`, `aria-pressed`.                                                                                                                                      |
| Hide toggle (list view + modal) | 1 per row                   | Trailing ghost icon button in the row's action area, and again in the modal's action row beside delete.                                                                                                                     |

Headings: the stats dialog's title uses the `DialogTitle` styling already in
`list-settings-modal.tsx` — the page-level `h3 text-base font-semibold` rule applies to page
sections, not dialog chrome, so no uppercase/sentence-case mixing is introduced. The grid's existing
per-media-type headings are untouched.

Hidden-item treatment: `opacity-50` **plus** an `EyeOff` badge **plus** `aria-pressed` on the
toggle. Opacity alone would fail FR-004's "without hovering or clicking" for low-contrast vision and
would say nothing to a screen reader, so the second channel is required, not decorative.

Loading / empty / error:

- **Loading** — no new route, so `loading.tsx` is unchanged. The hide toggle and tag input use
  in-place pending states (disabled + `Loader2`), as `list-item-modal.tsx` already does for notes.
- **Empty** — three body states on the list page (no items / all hidden while filtered / items), and
  an explanatory line in the stats dialog when the list has no items. Copy is `text-sm
text-muted-foreground`, same typography as the surrounding body.
- **Error** — inline, user-safe, reusing the error banner pattern from `list-item-reorder.tsx` for
  the hide toggle and an inline message under the tag input. No toast is introduced; no stack traces.

### Commit plan (ordered, per constitution IV)

Infrastructure first, then the three stories in their dependency order, then tests and docs.

1. `feat(lists): add hidden flag and tag model to list items` — `prisma/schema.prisma` + the
   `add_list_item_hidden_and_tags` migration + regenerated client. Schema layer only.
2. `feat(lists): add pure curation, tag, stats and view-param lib modules` — the four new
   `src/lib/` modules with their Vitest suites, plus `filterHiddenFromOrdering` and the
   `OrderableItem.isHidden` addition in `list-item-ordering.ts` with its extended suite. No callers
   yet.
3. `feat(lists): add hidden-state route for list items` — `…/items/[itemId]/hidden/route.ts`.
4. `feat(lists): surface the hide toggle and hidden-item filter` — `page.tsx` order-then-filter,
   `list-hidden-filter.tsx`, `list-item-hide-toggle.tsx`, faded rendering in grid/list/modal, the
   reorder withdrawal note and the all-hidden empty state. Story 1 complete.
5. `feat(lists): add tag routes for list items` — `…/tags/route.ts` and `…/tags/[tagId]/route.ts`.
6. `feat(lists): add per-item tags with per-list autocomplete` — `list-item-tag-editor.tsx`,
   vocabulary threading through `page.tsx`, chips on rows and in the modal. Story 2 complete.
7. `feat(lists): add a stats breakout to the list page` — `list-stats-modal.tsx` and the header
   Stats button. Story 3 complete.
8. `test(lists): cover hide, tag and stats journeys end to end` — `e2e/lists-curation.spec.ts`,
   including the role refusals, the item-cap assertion (FR-026) and the Radarr no-change assertion.
9. `docs(lists): document hiding, tagging and the stats breakout` — `docs/lists.md`.

Commits 3+4, 5+6 and 7 are each independently shippable and independently testable, matching the
spec's P1/P2/P3 slicing. No `.env.example` or `README.md` change is needed — the feature adds no env
var, no cron behaviour and no Docker change.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

The two decisions that could have looked like added complexity are justified reductions:

- **A separate `…/hidden` route** instead of extending the existing item `PATCH` — one more file,
  but it keeps two different authorisation rules (curation vs. notes) in two different handlers,
  which is the safer arrangement, not the more complex one ([research.md R5, R6](./research.md)).
- **Four small client components** instead of extending two large ones — `list-item-modal.tsx` is
  already 424 lines and `list-items-grid.tsx` 261; adding a tag editor, a suggestion popover, a
  toggle and a dialog inline would push both past the point of easy review.
