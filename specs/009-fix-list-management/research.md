# Phase 0 Research: Fix List Management

**Feature**: `009-fix-list-management` | **Date**: 2026-09-06

The spec left no `[NEEDS CLARIFICATION]` markers. This document therefore does two things:
(1) records the **root cause** of each of the four reported defects, read out of the current code,
and (2) resolves every value or behaviour the spec deliberately left to the implementation.

---

## Root-cause findings

### RC1 — Reorder persists in the database but is discarded when rendering

**Symptom (US1)**: drag succeeds optimistically, original order returns after refresh.

**Finding**: the write path is correct. `PATCH /api/lists/[slug]/items/reorder`
(`src/app/api/lists/[slug]/items/reorder/route.ts:58`) writes every submitted position inside one
`prisma.$transaction`, and the E2E test `e2e/lists-ranked.spec.ts:54` proves the values land.

The _read_ path is where the order dies. `src/app/(app)/lists/[slug]/page.tsx` queries with
`orderBy: [{ position: "asc" }, { addedAt: "desc" }]` (line 146) — correct — and then, regardless of
`list.rankingEnabled`, partitions the items four ways (lines 208–295):

```ts
const movies = makeGridItems(
  unwatchedItems.filter((i) => i.mediaItem.type === MOVIE),
);
const tvShows = makeGridItems(
  unwatchedItems.filter((i) => i.mediaItem.type === TV),
);
const watchedMovies = makeGridItems(
  watchedItems.filter((i) => i.mediaItem.type === MOVIE),
);
const watchedTv = makeGridItems(
  watchedItems.filter((i) => i.mediaItem.type === TV),
);
```

and the LIST layout is handed `[...movies, ...tvShows, ...watchedMovies, ...watchedTv]` (line 357).
So on reload the saved sequence is re-sorted into "unwatched movies, unwatched TV, watched movies,
watched TV". For a ranked list that mixes media types, or where the viewer has watched some items,
the displayed order after reload differs from what was dragged — and because the partition is
per-viewer (`watchedIdSet` depends on the signed-in user), two members can even see different
orders from the same stored positions. This matches every scenario in US1 and edge case
"Reorder while another member adds an item".

**Fix direction**: when `rankingEnabled`, do not partition at all — render one flat sequence in
stored-position order in both layouts (FR-002, FR-003).

**Secondary finding**: `ListItemsListView` prints the raw `item.position` as the rank number
(`list-items-list-view.tsx:76`). Stored positions can be non-contiguous (an item deleted from a
ranked list leaves a gap; ranking turned on assigns 1..n but deletes are not backfilled), so the
column can read `1, 2, 4`. FR-004 wants contiguous ranks, so the displayed rank must come from the
item's index in the rendered sequence and the reorder route must renumber `1..n` on every write.

**Third finding**: `list-item-reorder.tsx:121` fires the PATCH and ignores the response
(`await fetch(...)` with no `res.ok` check), then always calls `router.refresh()`. A failed save is
invisible — the optimistic order stays until the refresh silently replaces it. FR-007 requires an
explicit revert plus a user-safe message.

### RC2 — Name and description are writable by the API but unreachable from the UI

**Symptom (US2)**: no way to rename a list after creation.

**Finding**: `PATCH /api/lists/[slug]` already accepts `name` and `description`
(`src/app/api/lists/[slug]/route.ts:53–61`) and writes them in all three branches. Nothing in the
UI ever sends them: `ListSettingsPanel` posts only `rankingEnabled`, `votingEnabled`,
`commentsEnabled`, `displayMode`, `itemCap` (`list-settings-panel.tsx:75–82`). The list page header
renders `name`/`description` as static text (`list-page-header.tsx:99–102`).

The API is also unvalidated: `name: body.name ?? list.name` accepts `""` and `"   "`, wiping the
list's identity, and there is no length ceiling anywhere (create only checks `!name?.trim()`,
`src/app/api/lists/route.ts:68`). FR-010 and FR-011 both need server-side enforcement.

**Fix direction**: shared pure validator used by both `POST /api/lists` and
`PATCH /api/lists/[slug]`, plus name/description fields in the owner settings panel. The slug is
never recomputed on update, so FR-013 (URL stability) already holds and must simply not be broken.

### RC3 — `/api/search` truncates to 8, cannot page, and cannot filter by year or TV-only

**Symptom (US3)**: the 1985 film _House_ and 1989 film _Arena_ return nothing usable.

**Finding**: `src/app/api/search/route.ts` reads only `q` and `type`, treats `type` as a boolean
("movie" ⇒ `/search/movie`, anything else ⇒ `/search/multi`), then `.slice(0, 8)` (line 26). No
`page`, no `year`. `/search/multi` mixes in `person` results, which are filtered out _after_ the
slice is computed from the unfiltered ordering — so popular same-named people and newer remakes
crowd out the target film. TMDB has a 2008 _House_ TV series, a 2004 _House of Flying Daggers_, the
2004–2012 _House M.D._, etc.; the 1985 horror film is far down the relevance ranking and is
unreachable with 8 fixed slots and no year filter.

`src/lib/tmdb.ts` already has `searchMovie(query, year?)` with `primary_release_year` (line 287) and
`searchMulti(query, page)` (line 133) — but **no** `searchTv`, and `searchMovie` takes no `page`.

**Fix direction**: extend the TMDB wrapper (add `searchTv`, add `page` to `searchMovie`), extend the
route contract with `type=movie|tv|multi`, `year`, `page`, `limit`, filter `person` _before_
limiting, and return paging metadata so the UI knows whether more results exist (FR-022, FR-028).

### RC4 — Layout persistence already works; the control is undiscoverable, and ranked grid is wrong

**Symptom (US4)**: "the layout chosen at creation time is locked in".

**Finding**: the display-mode radio exists (`list-settings-panel.tsx:163–182`), `PATCH` persists
`displayMode`, and `page.tsx:355` branches on `list.displayMode`. Traced end to end, the value does
save. Two things explain the report:

1. **Discoverability/feedback.** The control sits at the bottom of the _Settings_ tab of a modal,
   below three checkboxes, labelled "Display mode" (not "Layout"), and the **Save settings** button
   only renders `isDirty` (`list-settings-panel.tsx:207`). A user who clicks a radio and looks for a
   Save/Apply button in the usual place sees a button appear in an unexpected spot, and there is no
   post-save confirmation — the modal simply stays open looking unchanged.
2. **A real correctness bug for ranked lists.** In GRID layout, a ranked list is rendered by
   `ListItemsGrid`, which groups by media type and watched state and shows **no rank numbers and no
   drag handles**. Switching a ranked list from list to grid therefore appears to lose the list's
   ordering entirely, which reads as "the layout switch is broken". This violates FR-002, FR-019 and
   US4 scenario 4 independently of the discoverability problem.

**Fix direction**: promote layout to a labelled first-class control with explicit save feedback, and
make the grid honour ranked order (single flat grid, rank badge, no media-type sections when
ranked). This is the same change RC1 requires, so the two land together.

**Flag for implementation**: finding (1) is a UI judgement, reached by reading the code rather than
by watching the reporter. The Playwright coverage added in this feature asserts _persistence_ of a
layout change through the UI, which will confirm or refute it during implementation. If persistence
turns out to be broken for some path not visible in the code (e.g. a stale `initial*` prop keeping
`isDirty` false), the E2E test fails and the real defect surfaces there.

---

## Resolved decisions

### R1 — Name and description length limits

- **Decision**: `LIST_NAME_MAX_LENGTH = 100`, `LIST_DESCRIPTION_MAX_LENGTH = 1000` (characters,
  counted after trimming, on the JS string length). Enforced in `src/lib/list-validation.ts` and
  applied by **both** `POST /api/lists` and `PATCH /api/lists/[slug]`.
- **Rationale**: the spec assumes "limits follow whatever the create-list flow already enforces, so
  a list created today can always be renamed to an equally long name". The create flow enforces
  _nothing_, so the invariant can only be honoured by adding the same limit to both endpoints in the
  same change. 100 chars fits the `text-3xl` page header on mobile without wrapping past two lines;
  1000 chars is generous for a description shown as a single muted paragraph and is far above
  anything the existing UI encourages (a 3-row textarea).
- **Legacy data**: `List.name`/`List.description` are unconstrained `String` columns, so rows longer
  than the new limits may exist. Validation runs on the **submitted** value only — an over-long
  legacy list keeps rendering, and is only asked to shorten if its owner edits that field. No
  migration, no backfill (FR-030).
- **Alternatives considered**: (a) limit only on update — rejected, breaks the spec's stated
  invariant the moment someone creates a 5000-char name; (b) add DB-level `@db.VarChar` constraints
  — rejected, needs a migration for no user-visible benefit and would fail on legacy rows;
  (c) silent truncation — rejected explicitly by the edge case "Very long description: rejected
  above the documented limit rather than truncated silently".

### R2 — Reorder request shape and renumbering

- **Decision**: keep the existing body shape `{ positions: { id, position }[] }`, but tighten
  validation: the array must contain **every** item of the list exactly once (`length ===
list.items.length`, no duplicate ids, every id belongs to the list). The server sorts the entries
  by the submitted `position` and writes `1..n` by index inside one `$transaction`, ignoring the
  submitted numbers' absolute values.
- **Rationale**: satisfies FR-004 (unique, contiguous, starting at 1) regardless of what the client
  sends, and makes last-write-wins the only possible concurrency outcome (edge case "Concurrent
  reorder") because a partial payload can no longer interleave with another writer's. Keeping the
  shape means the existing `e2e/lists-ranked.spec.ts` API-level reorder (which already sends all
  three items) keeps passing, so no contract break for callers.
- **Alternatives considered**: (a) accept `itemIds: string[]` — cleaner but a breaking contract
  change with no functional gain; (b) keep accepting partial updates — rejected, cannot guarantee
  contiguity and lets two concurrent partial writes produce duplicate positions.

### R3 — Year refinement with `type=multi` (TMDB has no multi-search year parameter)

- **Decision**: `year` is accepted with all three types. With `type=movie` it maps to
  `primary_release_year`; with `type=tv` to `first_air_date_year`. With `type=multi` **and** a year,
  the route fans out to `/search/movie` and `/search/tv` in parallel for the requested page, merges
  the two result sets sorted by TMDB `popularity` descending, and reports
  `totalPages = max(moviePages, tvPages)`, `totalResults = movieTotal + tvTotal`.
- **Rationale**: TMDB's `/search/multi` accepts no year parameter at all, so the only faithful way
  to honour "restrict by release year while searching both" is to query the two typed endpoints. The
  merge is deterministic (popularity desc, then title, then tmdbId) so paging is stable and
  FR-027/FR-028 hold. `TmdbSearchResult` gains an optional `popularity?: number` (TMDB already
  returns it) to make the merge possible.
- **Alternatives considered**: (a) reject `year` unless a single media type is chosen — rejected,
  FR-021 puts no such condition on the year filter and it would force an extra click for the exact
  reported scenario; (b) fetch multi and filter by year client-side — rejected, it filters _after_
  TMDB's relevance truncation, which is the very bug being fixed.

### R4 — Result page size and the `limit` parameter

- **Decision**: `GET /api/search` gains `limit` (integer 1–20, **default 8**). Response gains
  `page`, `totalPages`, `totalResults`. TMDB's page size is 20, so `limit` only ever trims one TMDB
  page; `page` selects the TMDB page. The list add-title dialog requests `limit=20` and accumulates
  pages; `picker-form.tsx` and `editable-list-search-add.tsx` pass no `limit` and are unaffected.
- **Rationale**: the default preserves today's 8-row typeahead for the two existing callers (no
  visual regression, FR-"search defaults" assumption), while letting the new refinable flow show a
  full TMDB page. Adding fields to the JSON response is backward compatible — both existing callers
  read only `results`.
- **Alternatives considered**: raising the default to 20 for everyone — rejected, it would silently
  triple the length of the picker and watchlist typeahead dropdowns, which is out of scope.

### R5 — Year validation bounds

- **Decision**: a year must parse as an integer with `1874 <= year <= currentYear + 10`. Anything
  else returns `400 { error: "Year must be a whole number between 1874 and <max>" }`. An empty or
  absent `year` parameter means "no year restriction" (not an error).
- **Rationale**: 1874 is the earliest year TMDB records (Roundhay Garden Scene era); +10 years
  allows searching announced titles, matching the `/upcoming` surface. Rejecting rather than
  silently ignoring gives the user the "clear message" FR-025 asks for, and the edge case allows
  either behaviour ("rejected with a clear message, or ignored") — rejecting is the more debuggable
  of the two. The UI additionally constrains the input to `type="number"` with `min`/`max` so the
  400 is a backstop, not the normal path.

### R6 — Stale search responses (FR-027)

- **Decision**: `list-add-fab.tsx` keeps a monotonically increasing request-sequence ref; a response
  is applied only when its sequence equals the latest issued. The existing 350 ms debounce stays.
  Changing the media type or the year resets `page` to 1 and clears accumulated results; pressing
  "Load more" increments `page` and **appends**, preserving `query` + refinements (FR-028).
- **Rationale**: a sequence guard is smaller and more portable than `AbortController` plumbing
  through `fetch` and covers the requirement exactly ("only the latest query's results are shown").
  The pure part of this — building the query string from `{query, mediaType, year, page, limit}` —
  moves into `src/lib/title-search-params.ts` so both the parse side (route) and the build side
  (client) are unit-tested.
- **Alternatives considered**: `AbortController` — equivalent behaviour, more code, and aborted
  requests still need the guard to avoid a race between abort and resolve.

### R7 — Where the edit surface lives

- **Decision**: name, description, and layout all live in the existing **Settings** tab of
  `ListSettingsModal`, reached from the gear button in the list header. Order within the panel:
  name → description → Layout → feature toggles (ranking / voting / comments) → item cap. One
  **Save settings** button for the whole panel, always rendered but disabled until dirty, with an
  inline "Saved" confirmation after success.
- **Rationale**: matches the spec assumption "name, description, and layout editing belong together
  in the list's existing owner settings surface rather than as a separate page", follows the
  constitution's hierarchy rule (identity first, then presentation, then behaviour), and fixes RC4's
  discoverability problem without inventing a new surface. Always rendering the (disabled) button
  removes the "where did Save go?" failure mode.
- **Alternatives considered**: (a) inline click-to-edit on the `h1` — rejected, doesn't cover
  description or layout and adds a second mutation surface; (b) a dedicated `/lists/[slug]/settings`
  page — rejected by the spec assumption.

### R8 — Drag-to-reorder stays list-layout only

- **Decision**: drag handles remain in the LIST layout only. The ranked GRID layout renders in
  stored order with a rank badge, and (for a user who `canReorder`) a one-line hint that reordering
  happens in the list layout.
- **Rationale**: US4 scenario 4 says "reordering still works in the layout **that supports it**",
  which presumes exactly one layout does. Adding grid drag-and-drop (2-D collision detection,
  responsive column counts, keyboard equivalence) is a materially larger change than the four
  reported bugs justify, and FR-001/FR-002 only require the _order_ to be correct in both layouts.

### R9 — Unranked lists are untouched

- **Decision**: for `rankingEnabled === false` the existing behaviour is preserved byte-for-byte —
  `ListSortControls` shown, `sortItems()` applied, four grouped grid sections, no drag affordance,
  `position` left `null`.
- **Rationale**: FR-030 and the spec's "Ordering semantics" assumption. `list-item-ordering.ts` is
  therefore a branch, not a rewrite: ranked ⇒ one flat sequence; unranked ⇒ today's grouping.
  The unit tests pin the unranked branch against the current output so the refactor cannot regress
  it (edge case "Reorder on an unranked list").

---

## Best-practice notes carried into design

- **`@dnd-kit` optimistic update + rollback**: hold the pre-drag array in a local variable before
  `setItems`, and restore it in the failure branch (`!res.ok` or `catch`) before surfacing the
  message. `router.refresh()` is called only on success — refreshing on failure would race the
  rollback and re-render the server's (unchanged, correct) order underneath the error, hiding it.
- **RSC + `router.refresh()`**: `ListSettingsPanel` and `ListAddFab` already follow the project
  pattern (`fetch` → check `res.ok` → `router.refresh()`); the new fields join the same single
  PATCH rather than adding a second endpoint.
- **TMDB normalisation at the fetch boundary**: `searchTv` mirrors `searchMovie` by stamping
  `media_type: "tv"` onto results (TMDB's typed search endpoints omit it) and guaranteeing
  `results` is an array, so no `?? []` guards leak into the route.
- **Prisma transaction for reorder**: an array-form `$transaction` of `update` calls (as today) is
  sufficient and keeps the write atomic; the renumbering is computed in JS before the transaction
  opens so the transaction holds no application logic.
