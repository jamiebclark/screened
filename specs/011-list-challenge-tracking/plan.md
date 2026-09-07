# Implementation Plan: List Challenge Tracking (declared tags, timeboxed history, grid tags, sticky header)

**Branch**: `011-list-challenge-tracking` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-list-challenge-tracking/spec.md`

## Summary

Four capabilities on `/lists/<slug>`, built in the spec's dependency order. Two of them change the
schema, and one of those **reshapes data that already exists**.

1. **Declared tag vocabulary (P1)** — a new `ListTag (id, listId, label, normalized, createdAt)` is
   the canonical per-list tag; `ListItemTag` loses `label`/`normalized` and becomes a pure join
   `(listItemId, listTagId)`. A tag's name then lives on exactly one row, so FR-005's "renaming
   propagates everywhere, no item left on the old name" is **structural** rather than a fan-out
   `UPDATE`, and FR-001's declared-but-unused category becomes expressible at all. The reshape
   carries a hand-written backfill inside the migration, ordered copy-before-drop, with
   `SET NOT NULL` as an abort-on-mismatch net so no existing assignment can be silently lost. Three
   new routes (`POST …/tags`, `PATCH`/`DELETE …/tags/[tagId]`) and a `ListTagsModal` reachable from
   the header; the item-tag routes keep their wire contract exactly and simply resolve labels
   through the list's vocabulary, creating a `ListTag` for anything new (FR-008).
2. **Challenge window and shared timeboxed history (P2)** — `List.challengeStartsAt` /
   `challengeEndsAt`, nullable, stored at UTC day start, edited through the existing owner-only
   `PATCH /api/lists/[slug]`. A new RSC route `/lists/[slug]/history` merges `WatchEntry` and
   `EpisodeStatus` for the list's titles across all current members into one attributed, date-ordered
   scoreboard. The in-window figures are split in two on purpose: the date filter lives in a query
   that returns a `Set` of watched media ids, and the counting is a pure
   `computeWindowStats(items, listTags, watchedIds)` — which is what makes the core requirement
   ("a rewatch must not be credited by an older watch") a unit test rather than an integration test,
   and gives FR-024's count-once for free.
3. **Tags on the grid card (P3)** — up to two chips plus `+N` **beneath** the poster, rendered only
   when the item carries tags. The poster's four corners are already occupied by rank/avatar, vote
   pill, comment badge and hide toggle, which is exactly why 010 rendered no tags there; below the
   poster there is no collision, posters-per-row is untouched, and an untagged card gains no height.
4. **Sticky list header (P4)** — a `fixed top-16` bar shown when a zero-height sentinel at the top
   of the page leaves the viewport, rendered **by** `ListPageHeader` so it drives the _same_
   `addOpen`/`statsOpen` state. Two requirements then need no code: "behaves identically to the top
   of the page" (there is one modal instance, not two) and "must not appear on a short list" (a page
   that does not scroll never un-observes the sentinel).

The regression-prone logic lands in pure, unit-tested lib functions — `buildTagVocabulary` and
`validateTagBatch`/`validateTagName` (reshaped), `computeListStats`/`computeWindowStats`,
`parseChallengeWindowInput`/`challengeWindowBounds`, and `mergeListWatchRows` — per constitution V.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 App Router (RSC)
**Primary Dependencies**: Prisma 6 (PostgreSQL 16), NextAuth v5 (JWT), Tailwind v4 + Radix UI
(`Dialog`, `Badge`, `Popover`, `Input`, `Button`, `Avatar`), `lucide-react`
(`Tags`, `History`, `Pencil`, `Trash2`, `CalendarRange`), browser `IntersectionObserver`
**Storage**: PostgreSQL via Prisma. **Schema change required, including a data migration**: new
`ListTag` model; `ListItemTag` reshaped (drops `label`/`normalized`, gains `listTagId`); two nullable
`DateTime` columns on `List`. One migration, `add_list_tags_and_challenge_window`.
**Testing**: Vitest (unit, `src/lib/*.test.ts`), Playwright (E2E, `e2e/*.spec.ts`)
**Target Platform**: Self-hosted web app (Docker Compose), modern evergreen browsers + mobile Safari
**Project Type**: Next.js web application — single project, route groups under `src/app/`
**Performance Goals**: the list page gains **one** relation on its existing `findUnique`
(`list.tags`) and **one** extra query, and only when a window is set — a two-source `select
mediaItemId` used to build the in-window `Set`. Tag suggestions still cost no network round trip
(filtered client-side from a prop). The history feed is a separate route, so the common list visit
does not pay for it. Both counting passes are in-memory over an item-capped array.
**Constraints**:

- **Migrations only** — `yarn db:migrate --name add_list_tags_and_challenge_window`; `db push` is
  prohibited. Schema + migration folder committed together, `yarn db:generate` after (constitution
  III, requester's explicit condition).
- The `ListItemTag` reshape needs hand-written SQL in the generated migration, **ordered so data is
  copied before columns are dropped** (requester's explicit condition; FR-010, SC-002).
- `orderListItems()` / `normalizePositions()` / `filterHiddenFromOrdering()` are reused
  **unchanged**; no read-path partitioning of list items may be reintroduced (requester's explicit
  constraint, carried over from 009/010).
- Every named existing caller must be updated in the same stack: `list-item-tags.ts`,
  `list-stats.ts`, the two `…/items/[itemId]/tags` routes, the items `POST` route, and the tag
  plumbing through `list-page-header` / `list-items-grid` / `list-items-list-view` /
  `list-item-modal` / `list-item-tag-editor` (and `list-add-fab`, which the spec's list omits but
  which consumes `TagVocabularyEntry` too).
- `src/lib/list-item-tags.test.ts` and `src/lib/list-stats.test.ts` assert the denormalized shape
  and must be **updated, not deleted**.
- Prisma-generated enums cannot be imported in `"use client"` components. **This feature adds no
  enum**, so no mirror module is needed — noted because the spec's Input asked for it conditionally.
- Posters per row in grid view must be identical before and after, at every supported width (SC-007).
- No new env var, no cron change, no Docker change.

**Scale/Scope**: 4 user stories, 32 functional requirements, 10 success criteria. 1 migration (with
backfill), 2 new lib modules + 2 reshaped, 3 new API routes + 3 extended, 1 new page route (+
`loading.tsx`), 2 new client components, 7 existing components touched, 2 new + 2 updated Vitest
suites, 1 new Playwright spec.

**Unknowns**: none. The spec left no `[NEEDS CLARIFICATION]` markers; all 24 of its Assumptions and
every value it left open (tag-manager placement, chip counts, history surface, boundary semantics,
id generation in SQL) are resolved in [research.md](./research.md).

**Two assumptions the spec flagged for confirmation** are adopted as written, each isolated in one
module so reversing either is a one-file change:

- **Watch-history visibility inside a list is membership-based** — `watchHistoryVisibility` is
  deliberately **not** consulted, diverging from `fetchTitleWatchHistoryForViewer()` and
  `fetchFriendsWatchHistoryInRange()`. Every query that ignores it lives in the new
  `src/lib/list-watch-history.ts`, with the reasoning at the top of the file. Honouring it would
  make the shared scoreboard silently incomplete, which defeats the feature. One refinement on the
  spec's wording: the **attributed** history is member-only (FR-019 says "every _member_ who can see
  the list"), while the **aggregate** in-window figures — which name nobody — stay as visible as
  today's all-time stats. See [research.md R11](./research.md).
- **Who may set the window** — the window is a list _setting_, so it follows the existing
  owner-only rule in `PATCH /api/lists/[slug]`, not the item-curation rule that governs tags. No new
  route, therefore no new authorisation surface. See
  [contracts/list-settings-patch.md](./contracts/list-settings-patch.md).

**One decision that reverses a prior plan, stated plainly**: [010's R2](../010-list-item-curation/research.md)
rejected a list-scoped vocabulary table on the grounds that "a tag has no existence independent of
the items using it". That premise is precisely what this spec overturns — 010's tags were derived
labels, 011's are declared categories with their own lifecycle. The 010 reasoning was right for
010's requirements and is superseded, not contradicted ([research.md R1](./research.md)).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](/.specify/memory/constitution.md) (v1.1.0):

- [x] **I. Server Components First** — every rendered value is computed in a Server Component: the
      tag vocabulary (`page.tsx`), both stat sets (`page.tsx`), and the whole watch-history feed
      (the new `history/page.tsx`). The feature adds **zero read API routes** — the history is a
      page, not a modal fed by a `GET` ([research.md R12](./research.md)). The five mutations (tag
      create / rename / delete, item-tag add / remove) are `fetch` calls to Route Handlers followed
      by `router.refresh()`, matching `watch-status-button.tsx`; the window is saved by the existing
      single PATCH in `list-settings-panel.tsx`. The two new client components are interactive-only:
      `ListTagsModal` (form state) and `ListStickyHeader` (`IntersectionObserver`), neither of which
      fetches list data.
- [x] **II. Security by Default** — the three new routes call `await auth()` first and return 401
      before touching data, then 404 for an unknown list, then 403 via `canCurateListItems()`
      (FR-003), then verify `tag.listId === list.id` so one list's slug cannot address another's tag.
      Bodies are validated by pure functions whose plain-language `error` is returned verbatim (400),
      with 409 reserved for the rename collision. The new **page** route checks membership before
      reading any watch data and redirects rather than rendering. Unexpected failures are logged
      server-side and answered with a generic 500. The backfill uses parameterless DDL/DML in the
      migration — no string-concatenated SQL anywhere in application code. No new env vars, no
      secrets client-side.
- [x] **III. Migrations Only** — one migration created with
      `yarn db:migrate --name add_list_tags_and_challenge_window`, its body hand-edited to the
      copy-before-drop sequence in [data-model.md §2](./data-model.md), followed by
      `yarn db:generate`. `prisma/schema.prisma` and
      `prisma/migrations/<timestamp>_add_list_tags_and_challenge_window/` are committed **together**,
      in the first commit of the stack, before any code that reads the new shape. No `db push`. The
      one thing `yarn ci:check` cannot prove — that the _backfill_ preserves existing rows — has an
      explicit manual gate in [quickstart.md §0a](./quickstart.md).
- [x] **IV. Conventional Commits** — the commit plan below is ordered schema → generated client →
      lib → routes → UI → tests → docs, one concern per commit, with the four stories landing in
      their spec'd dependency order. Every user-visible slice is `feat`; the tag-shape reshape is
      also `feat` because it changes user-visible behaviour (declarable tags), not just internals.
- [x] **V. Test at the Right Level** — two new Vitest suites (`list-challenge-window`,
      `list-watch-history` for its pure merge/collect helpers) and two **updated** ones
      (`list-item-tags` for the new vocabulary/validate shapes and `validateTagName`, `list-stats`
      for zero-count declared tags and all of `computeWindowStats`), plus one new Playwright spec
      `e2e/lists-challenge.spec.ts` covering the four journeys and the role refusals. The window
      boundary rule and the "old watch does not credit a rewatch" rule are unit tests, not E2E
      assertions, because the split in point 2 above puts them in pure functions. `yarn ci:check` is
      the completion gate.

**Post-Phase-1 re-check**: still passing. Three of the principles came out of the design tighter
rather than strained.

- Principle I got **stronger**: the history view was the obvious candidate for a `GET …/history`
  endpoint plus a client fetch, and was resolved to an RSC route
  ([research.md R12](./research.md)). Combined with keeping the tag list and both stat sets as
  derived props, the feature adds five write routes and **zero** read routes.
- Principle II benefited from the same choice — a `GET …/history` would have been a new surface
  needing its own list-visibility check over other people's watch data, which is the most
  privacy-sensitive read in the feature. It does not exist. The one genuinely new authorisation
  question (who may set the window) was answered by reusing an existing handler rather than adding a
  route, so no new surface appears there either.
- Principle III is where this feature carries real risk, and the design answers it structurally
  rather than procedurally: the migration copies before it drops, and `SET NOT NULL` converts "the
  mapping missed a row" from silent data loss into a transaction abort. The prohibition on
  "fixing" that failure by deleting `NULL` rows is written into both
  [data-model.md §2](./data-model.md) and [quickstart.md §0a](./quickstart.md), because that is the
  one shortcut that would violate FR-010 while appearing to work.
- No complexity-tracking entries are required; see [Complexity Tracking](#complexity-tracking).

Per-route status codes are specified in [contracts/](./contracts/).

## Project Structure

### Documentation (this feature)

```text
specs/011-list-challenge-tracking/
├── plan.md                          # This file
├── research.md                      # Phase 0 output — 15 resolved decisions + assumption trace
├── data-model.md                    # Phase 1 output — schema reshape, migration body, invariants
├── quickstart.md                    # Phase 1 output — hand-verification incl. the backfill gate
├── contracts/                       # Phase 1 output
│   ├── list-tags.md                 #   POST …/tags, PATCH/DELETE …/tags/[tagId]        (NEW)
│   ├── list-item-tags.md            #   POST/DELETE …/items/[itemId]/tags               (CHANGED)
│   ├── list-settings-patch.md       #   PATCH /api/lists/[slug] + challenge window      (CHANGED)
│   └── list-history-view.md         #   /lists/[slug]/history page + in-window figures  (NEW, no API)
└── tasks.md                         # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                     # EXTENDED — new ListTag; ListItemTag reshaped;
│                                                     #   List.challengeStartsAt/EndsAt + tags relation
└── migrations/
    └── <ts>_add_list_tags_and_challenge_window/      # NEW — hand-written backfill, committed with schema

src/
├── lib/
│   ├── list-item-tags.ts                             # RESHAPED — TagVocabularyEntry gains id;
│   │                                                 #   buildTagVocabulary(listTags, items);
│   │                                                 #   validateTagBatch -> {linkTagIds, createTags};
│   │                                                 #   NEW validateTagName. Normalisers unchanged.
│   ├── list-item-tags.test.ts                        # UPDATED — new shapes + validateTagName
│   ├── list-stats.ts                                 # EXTENDED — computeListStats(items, listTags)
│   │                                                 #   + declaredTags + zero-count tags;
│   │                                                 #   NEW computeWindowStats(items, listTags, watchedIds)
│   ├── list-stats.test.ts                            # UPDATED — zero-count tags; window coverage
│   ├── list-challenge-window.ts                      # NEW — parse/validate, bounds, isWithin, describe
│   ├── list-challenge-window.test.ts                 # NEW — Vitest
│   ├── list-watch-history.ts                         # NEW — fetchListWatchHistory,
│   │                                                 #   fetchListInWindowWatchedMediaItemIds,
│   │                                                 #   pure mergeListWatchRows. Holds the
│   │                                                 #   membership-based-visibility divergence.
│   ├── list-watch-history.test.ts                    # NEW — Vitest (pure helpers only)
│   ├── watch-entry-merge.ts                          # UNCHANGED — utcDayStart/utcDayEndExclusive reused
│   └── list-item-ordering.ts                         # UNCHANGED (explicit constraint)
├── app/
│   ├── api/lists/[slug]/
│   │   ├── route.ts                                  # EXTENDED — PATCH accepts the challenge window
│   │   ├── tags/route.ts                             # NEW — POST declare a tag
│   │   ├── tags/[tagId]/route.ts                     # NEW — PATCH rename, DELETE
│   │   ├── items/route.ts                            # EXTENDED — labels resolve through ListTag
│   │   └── items/[itemId]/tags/
│   │       ├── route.ts                              # EXTENDED — link-or-create in one transaction
│   │       └── [tagId]/route.ts                      # EXTENDED — join read for label/normalized
│   └── (app)/lists/[slug]/
│       ├── page.tsx                                  # EXTENDED — include list.tags + items.tags.listTag;
│       │                                             #   window stats; header props
│       ├── list-page-header.tsx                      # EXTENDED — Tags + History entry points;
│       │                                             #   renders ListStickyHeader + sentinel
│       ├── list-tags-modal.tsx                       # NEW — client: declare / rename / delete
│       ├── list-sticky-header.tsx                    # NEW — client: sentinel-driven fixed bar
│       ├── list-settings-panel.tsx                   # EXTENDED — two date inputs + clear window
│       ├── list-stats-modal.tsx                      # EXTENDED — "During the challenge" / "All time"
│       ├── list-items-grid.tsx                       # EXTENDED — chip row beneath the poster
│       ├── list-items-list-view.tsx                  # EXTENDED — vocabulary type only
│       ├── list-item-modal.tsx                       # EXTENDED — vocabulary type only
│       ├── list-item-tag-editor.tsx                  # EXTENDED — vocabulary type only
│       ├── list-add-fab.tsx                          # EXTENDED — vocabulary type only
│       └── history/
│           ├── page.tsx                              # NEW — RSC: attributed, date-ordered scoreboard
│           └── loading.tsx                           # NEW — skeleton mirroring the row layout
├── docs/
│   └── lists.md                                      # EXTENDED — "Running a challenge" section
└── e2e/
    └── lists-challenge.spec.ts                       # NEW — four journeys + role refusals
```

**Structure Decision**: the existing Next.js single-project layout is used unchanged — pure logic in
`src/lib/`, mutations in `src/app/api/**/route.ts`, route-local client components beside
`src/app/(app)/lists/[slug]/page.tsx`. One new directory, `history/`, because the scoreboard is a
route (R12) and a route needs a folder to own its `loading.tsx`.

The two new lib modules exist because each holds a rule the tests must pin and that nothing else
owns: the inclusive-boundary date arithmetic, and the membership-scoped two-source watch read
(including the visibility divergence, deliberately quarantined in one file). `computeWindowStats`
goes **into** `list-stats.ts` rather than a third module so that "a decade", "a country" and
"hidden items don't count" are defined once and shared by the all-time and in-window figures — they
cannot drift apart if they are twenty lines from each other.

**Explicitly unchanged**: `list-item-ordering.ts`, `list-item-permissions.ts` (reused as-is for tag
management, per the spec), `radarr/route.ts`, `notifyListItemAdded`, `ListItemVote`,
`watch-entry-merge.ts` (only read from), and every write path into `WatchEntry` / `EpisodeStatus` —
this feature adds no way to record a watch. See [research.md R15](./research.md).

### UI/UX density decisions (made now, per constitution)

The constitution requires density to be chosen during planning. This feature introduces three new
collections and three new controls.

| Surface                          | Expected count                    | Pattern                                                                                                                                                                                                     |
| -------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Declared tags in the tag manager | **31 typical** (a category sheet) | Compact rows: `divide-y rounded-lg border`, `px-3 py-2`, `text-sm` label, count in `text-sm text-muted-foreground`, trailing rename/delete ghost icon buttons. Far past the ~8 threshold, so **not** cards. |
| Watch-history rows               | **31–200** (capped at 200)        | Compact rows: `rounded-lg border p-3`, `h-10 w-10` member avatar, poster thumb, title + `S1E4` label. Constitution's long-feed case, matching `/history`.                                                   |
| History day headings             | one per active day                | `h2 text-sm font-semibold text-muted-foreground uppercase tracking-wider sticky top-16`, copied from `/history` so the two feeds read the same.                                                             |
| In-window stat tiles             | exactly **4**                     | `rounded-lg border p-4` tiles in a 2×2 grid, label `text-xs text-muted-foreground`, value `text-2xl font-semibold` — identical to the existing all-time tiles.                                              |
| "Still to cover" chips           | 0–31                              | Wrapping `Badge` pills, `text-xs rounded-full`. Labels, not entities.                                                                                                                                       |
| Tag chips on a **grid** card     | show up to **2**, then `+N`       | `text-[10px] rounded-full` pills in a row **beneath** the poster, rendered only when the item has tags. Two, not the list view's three: a grid card is ~40% a row's width and three wrap at `grid-cols-2`.  |
| Tag chips on a list-view row     | up to **3**, then `+N`            | Unchanged from 010.                                                                                                                                                                                         |
| Tag manager entry point          | 1 button                          | `Tags` icon button, `h-9 w-9 variant="ghost"`, `aria-label="Manage list tags"`, in the header's action cluster. Shown to every viewer; controls inside are curator-gated.                                   |
| History entry point              | 1 button                          | `History` icon button, same size, `aria-label="Challenge history"`, member-only.                                                                                                                            |
| Challenge window fields          | 2 inputs                          | Two `<input type="date">` in the existing Settings tab under a `CalendarRange` sub-heading, with a "Clear window" text button. Saved by the tab's existing single Save.                                     |
| Sticky bar                       | 1 element                         | Single `h-12` row: truncated list name + Add and Stats icon buttons at `h-8 w-8`. `fixed top-16 inset-x-0 z-30`, `border-b bg-background/95 backdrop-blur`, matching `nav.tsx`.                             |

Headings: the two stats blocks use `h3 text-base font-semibold` ("During the challenge", "All time")
with the window dates in `text-sm text-muted-foreground` beneath — the constitution's section-heading
rule. The history page's day headings use the uppercase-tracking treatment, which is consistent
because `/history` already establishes it for _day grouping_ specifically, and the page mixes no
sentence-case `h3` sections alongside them.

The header action cluster grows from three buttons to five. At `h-9 w-9` with `gap-1` that is 185px,
and on mobile the cluster is already a full-width row below the identity block
(`flex-col sm:flex-row`), so it fits without wrapping at 375px.

Loading / empty / error:

- **Loading** — the new route gets `history/loading.tsx` with a skeleton mirroring the day-heading +
  row layout (constitution: route-level `loading.tsx`). The tag manager's create/rename/delete use
  in-place pending states (disabled + `Loader2`), as `list-item-tag-editor.tsx` already does.
- **Empty** — four states: tag manager with no tags declared; stats with declared tags but nothing
  covered; history with a window and no in-window watches (short explanation naming the dates, not
  an error — the spec's "window in the past or future" edge case); history with no window and no
  watches. All `text-sm text-muted-foreground`, same typography as surrounding body text.
- **Error** — inline and user-safe, reusing the inline-message pattern from
  `list-item-tag-editor.tsx` for the tag manager and `list-settings-panel.tsx`'s existing error line
  for the window. The delete confirmation states the affected item count from the vocabulary prop
  before it fires (FR-006), so the destructive action is never a surprise. No new toast, no stack
  traces.

### Commit plan (ordered, per constitution IV)

Infrastructure first, then the four stories in dependency order, then tests and docs.

1. `feat(lists): add list tag vocabulary and challenge window schema` — `prisma/schema.prisma`, the
   hand-written `add_list_tags_and_challenge_window` migration, and the regenerated client. Schema
   layer only, nothing reads it yet.
2. `refactor(lists): rebuild tag vocabulary and batch validation on list tags` — `list-item-tags.ts`
   (new `TagVocabularyEntry.id`, new `buildTagVocabulary` signature, link/create `validateTagBatch`,
   new `validateTagName`) with its **updated** Vitest suite. `refactor` and not `feat` because this
   commit alone changes nothing a user sees; the behaviour arrives in 4 and 5.
3. `feat(lists): add challenge window and in-window coverage lib modules` —
   `list-challenge-window.ts` + suite, `computeWindowStats` and the `declaredTags`/zero-count
   changes in `list-stats.ts` + updated suite, and `list-watch-history.ts` + suite for its pure
   helpers. No callers yet.
4. `feat(lists): add routes for declaring, renaming and deleting list tags` —
   `…/tags/route.ts` and `…/tags/[tagId]/route.ts`.
5. `feat(lists): resolve item tags through the list vocabulary` — the two `…/items/[itemId]/tags`
   routes and the items `POST` route, link-or-create in one transaction. Wire contracts unchanged.
6. `feat(lists): manage a list's declared tags from the list page` — `list-tags-modal.tsx`, the
   header entry point, and the vocabulary plumbing through `page.tsx`, `list-items-list-view.tsx`,
   `list-item-modal.tsx`, `list-item-tag-editor.tsx` and `list-add-fab.tsx`. **Story 1 complete.**
7. `feat(lists): let a list record a challenge window` — the `PATCH /api/lists/[slug]` extension and
   the two date inputs in `list-settings-panel.tsx`.
8. `feat(lists): add a shared timeboxed watch history to lists` — `history/page.tsx`,
   `history/loading.tsx`, and the member-only History entry point.
9. `feat(lists): report in-window category, decade and country coverage` — the "During the
   challenge" / "All time" split in `list-stats-modal.tsx` and the window-stats wiring in
   `page.tsx`. **Story 2 complete.**
10. `feat(lists): show item tags on grid cards` — the chip row in `list-items-grid.tsx`.
    **Story 3 complete.**
11. `feat(lists): keep list actions in reach while scrolling` — `list-sticky-header.tsx` and the
    sentinel in `list-page-header.tsx`. **Story 4 complete.**
12. `test(lists): cover challenge tracking journeys end to end` — `e2e/lists-challenge.spec.ts`,
    including the role refusals, the posters-per-row assertion (SC-007) and the short-list
    no-sticky-bar assertion.
13. `docs(lists): document declared tags and challenge tracking` — `docs/lists.md`.

Commits 1–6, 7–9, 10 and 11 are each independently shippable and testable, matching the spec's
P1–P4 slicing. Commit 1 must land before 2–11, and 2 before 4–6, because the generated client shape
is a compile-time dependency. `README.md` and `.env.example` need no change — no env var, no cron
behaviour, no Docker change.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

Three decisions that could read as added complexity are justified reductions:

- **A three-table tag model** where 010 had one. It is one more table, but it removes the _only_
  mechanism by which a tag's name could disagree with itself, which is what FR-005 and FR-010
  require. The alternative — keeping `label`/`normalized` on the assignment and adding `ListTag`
  beside it — is fewer moving parts to describe and strictly more ways to be wrong; the requester
  ruled it out explicitly ([research.md R1](./research.md)).
- **A separate page route for the history** rather than a modal. One more directory, but it
  eliminates a read API route that would have had to re-implement a privacy-sensitive visibility
  check, and it keeps the fetch in a Server Component ([research.md R12](./research.md)).
- **Splitting the in-window figures into a query and a pure counter.** Two functions instead of one,
  and it is the reason the feature's central rule — an old watch must not credit a rewatch — is a
  unit test with no database ([research.md R10](./research.md)).
