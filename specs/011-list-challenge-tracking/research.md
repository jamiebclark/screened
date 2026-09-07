# Phase 0 Research: List Challenge Tracking

**Feature**: `011-list-challenge-tracking` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

The spec left no `[NEEDS CLARIFICATION]` markers. It recorded 24 **Assumptions** and a set of
verbatim technical conditions in its **Input** field — including the exact shape the tag records
must take and the ordering of the data backfill. This document resolves every open value into a
concrete decision anchored to code that already exists, so the tasks phase never re-derives it.

Two of the spec's assumptions are marked "flag for confirmation". Both are **adopted as written**
here (R6, R11) and isolated in one module each, so reversing either touches one file and its tests.

---

## R1 — `ListTag` as the canonical per-list vocabulary

**Decision**: exactly the shape the requester dictated. `ListTag (id, listId, label, normalized,
createdAt)` with `@@unique([listId, normalized])` and `@@index([listId])`; `ListItemTag` becomes a
pure join `(id, listItemId, listTagId, createdAt)` with `@@unique([listItemId, listTagId])`,
losing its `label` and `normalized` columns. Both sides cascade from their parent.

**Rationale**: this is the only shape in which FR-005 (rename propagates everywhere, no item left
on the old name) is true **by construction** rather than by a fan-out `UPDATE`. A tag's name lives
in exactly one row; an assignment carries no name at all, so there is no second copy that can drift.
It is also what makes FR-001 expressible — a `ListTag` with no `ListItemTag` rows _is_ a declared,
unused category, which the old denormalized shape could not represent at all.

Note this **reverses** [010's R2 decision](../010-list-item-curation/research.md), which rejected a
list-scoped vocabulary table on the grounds that "a tag has no existence independent of the items
using it". That premise is exactly what this feature overturns: 010's spec said tags were derived
labels, 011's spec says they are declared categories with a lifecycle of their own. The 010
reasoning was correct for 010's requirements and is superseded, not contradicted.

**Alternatives considered**:

- _Keep `label`/`normalized` on `ListItemTag` and add `ListTag` beside it_ — two sources of truth
  for a tag's name. The requester ruled this out explicitly ("Do NOT keep a second source of
  truth"), and rename would become a multi-row `UPDATE` that can partially fail.
- _`ListTag` with a `listItemIds String[]`_ — unenforceable referential integrity, no cascade.
- _Deriving the vocabulary from a `List.declaredTags String[]` column beside the existing
  denormalized assignments_ — cannot express "this assignment _is_ that declared tag", so renames
  would still have to fan out. Rejected.

## R2 — Ordering of the data migration

**Decision**: one migration, `add_list_tags_and_challenge_window`, whose hand-written body runs in
this order inside the single transaction Prisma wraps it in:

1. create `ListTag` + its indexes + FK to `List`;
2. `INSERT … SELECT DISTINCT ON (listId, normalized)` from `ListItemTag ⋈ ListItem`, ordered
   `createdAt ASC, id ASC`, so the **oldest** assignment's label becomes canonical;
3. `ALTER TABLE "ListItemTag" ADD COLUMN "listTagId" TEXT` — **nullable**;
4. `UPDATE` every assignment to point at its `ListTag`;
5. `ALTER COLUMN "listTagId" SET NOT NULL`;
6. only now drop `ListItemTag_listItemId_normalized_key`, then the `label` and `normalized` columns;
7. add the new unique index, the `listTagId` index and the FK;
8. add `List.challengeStartsAt` / `challengeEndsAt`.

**Rationale**: data is copied before anything is dropped, which is the requester's explicit
condition and FR-010/SC-002. Step 5 is the safety net that makes the guarantee real: if step 4 left
even one row unmatched, `SET NOT NULL` raises and the whole migration rolls back — the failure is
loud and nothing is lost. The tempting alternative (`DELETE FROM "ListItemTag" WHERE "listTagId" IS
NULL`) would silently destroy the exact data FR-010 protects, so it is prohibited.

The tie-break in step 2 is `ORDER BY listId, normalized, createdAt ASC, id ASC` — deliberately the
same rule `buildTagVocabulary()` uses today (earliest `createdAt` wins the display label), so a tag
written as "Folk Horror" on an old item and "folk horror" on a newer one settles on the name the
list already displays. `id` breaks exact-timestamp ties deterministically.

**No dedup pass is needed** in step 4: the existing `@@unique([listItemId, normalized])` already
guarantees one row per (item, normalized), so the mapped `(listItemId, listTagId)` pairs are unique
by construction. That is why step 7 can add its unique index without a prior cleanup.

**Alternatives considered**:

- _Two migrations (add, then drop in a later release)_ — safer for a rolling deploy, but this app
  deploys as a single container with `migrate deploy` at boot, so there is no window in which both
  shapes must work. One migration keeps the schema honest.
- _A TypeScript backfill script run between two migrations_ — needs orchestration the project has
  no precedent for, and cannot be verified by `yarn ci:check`, which runs migrations from scratch.

## R3 — Postgres id generation in the backfill

**Decision**: `gen_random_uuid()::text` for the new `ListTag.id` values.

**Rationale**: Postgres 16 everywhere (`docker-compose.yml`, `.github/workflows/ci.yml` both pin
`postgres:16-alpine`), where `gen_random_uuid()` is a core function needing no `pgcrypto`. Ids are
opaque `TEXT`; nothing in the app parses them, so backfilled rows carrying UUIDs while
application-created rows carry cuids is harmless. Documented here so it does not read as an
inconsistency later.

**Alternatives considered**: `md5(random()::text || clock_timestamp()::text)` — works on any
version but is an odd-looking id with no collision guarantee. Only needed if the project ever
supports Postgres < 13.

## R4 — Tag management surface and who may reach it

**Decision**: a dedicated `ListTagsModal`, opened by a `Tags` icon button in the list header's
existing action cluster. Rendered for **every** viewer who can see the list; create / rename /
delete controls appear only when `canCurateListItems()` is true (FR-003).

**Rationale**: the tag manager cannot live in `ListSettingsModal`, because that modal is
owner-gated (`isOwner ? <Tabs> : <IntegrationsSection>`) while FR-003 grants tag management to
`CONTRIBUTOR`s too. Folding contributors into the settings modal would widen an owner-only surface
— the exact kind of accidental permission creep [010's R6](../010-list-item-curation/research.md)
avoided by adding a separate route. A peer modal beside `ListStatsModal` reuses an established
pattern and keeps the two permission rules in two components.

**Alternatives considered**:

- _A "Tags" tab inside the settings modal_ — rejected per above.
- _An inline tag section on the list page body_ — 31 declared categories would push the poster grid
  below the fold, and the section would be dead weight on the many lists that use no tags.
- _Managing tags from the stats modal_ — stats is read-only by design (010 R8); adding mutations
  there would give it an authorisation surface it currently does not need.

## R5 — Free-typing a tag still works, and now creates a `ListTag`

**Decision**: `POST …/items/[itemId]/tags` keeps accepting arbitrary `labels`. Any label whose
normalized form is not yet a `ListTag` on that list is **created as one** inside the same
transaction, then linked. FR-008 is therefore satisfied without refusing anything a user can do
today.

**Rationale**: the spec's assumption is explicit ("Declaring tags up front is the new planning
path, not a new restriction on the existing quick path"). Making the route create-on-demand also
means there is exactly one code path that can produce a `ListTag`, so the invariant "an item never
carries a tag the list does not know about" is structural.

**Item-level API contract is unchanged**: `tagId` in the DELETE path stays the **assignment** id,
and the `{ tags: [{ id, label, normalized }] }` response keeps `id` = assignment id, with `label`
and `normalized` read through the join. Every existing caller
(`list-item-tag-editor.tsx`, the grid/list-view chip rendering) therefore needs no contract change
— only the vocabulary type gains a field (R7).

**Alternatives considered**:

- _Reject unknown labels with 400 and force declaration first_ — a behaviour regression for every
  existing list, and contradicted by the spec's assumption.
- _Address item tags by `listTagId` instead of assignment id_ — a gratuitous contract break for
  three client callsites, with no gain: the assignment id is already unique and already what the
  client holds.

## R6 — Renaming onto an existing tag is a conflict (`409`), not a merge

**Decision**: `PATCH …/tags/[tagId]` returns `409` with
`"Another tag on this list already uses that name"` when the new normalized form belongs to a
_different_ `ListTag`. A case-only change to the tag's **own** name (e.g. "folk horror" →
"Folk Horror") is allowed and just updates `label`.

**Rationale**: the spec states merging is out of scope. `409` rather than `400` because the request
is well-formed — it collides with server state; that is what `409` means, and it lets the client
distinguish "bad input" from "already taken" without string-matching the message.

**Alternatives considered**: silently merging the two tags — a destructive operation with no undo,
explicitly out of scope; `400` — loses the distinction above.

## R7 — `TagVocabularyEntry` gains an `id`; declared-but-unused entries carry `count: 0`

**Decision**:

```ts
export type TagVocabularyEntry = {
  id: string;
  label: string;
  normalized: string;
  count: number;
};

export function buildTagVocabulary(
  listTags: {
    id: string;
    label: string;
    normalized: string;
    createdAt: Date;
  }[],
  items: { tags: { listTagId: string }[] }[],
): TagVocabularyEntry[];
```

Sort order is unchanged (`count` desc, then `normalized` asc), so unused tags land at the end in
alphabetical order.

**Rationale**: seeding the map from `listTags` instead of discovering names from assignments is the
whole of FR-007 and FR-009 — a declared tag with no items is simply an entry whose count never
increments, so it appears in autocomplete and in the stats list for free, with no special case
anywhere. The `id` is needed by the tag manager (rename/delete targets) and lets the item-tag route
link an existing tag without a second lookup by name.

The vocabulary still counts assignments across **all** items including hidden ones, exactly as
today — deliberately unchanged, because it drives autocomplete usefulness rather than any reported
figure. The hidden-item exclusion lives in the stats functions (R10).

**Alternatives considered**: a separate `declaredTags` prop alongside the old vocabulary — two
props that must agree, and `suggestTags()` would need to merge them at every keystroke.

## R8 — `validateTagBatch` returns a link/create split

**Decision**:

```ts
type TagBatchResult =
  | {
      ok: true;
      value: {
        linkTagIds: string[];
        createTags: { label: string; normalized: string }[];
      };
    }
  | { ok: false; error: string };

function validateTagBatch(
  labels: unknown,
  existing: { listTagId: string }[],
  vocabulary: TagVocabularyEntry[],
): TagBatchResult;
```

Plus a new `validateTagName(raw: unknown)` for the list-level create/rename routes.

**Rationale**: the route needs two different actions per label, and deciding which is which is pure
logic worth pinning in a test (cap enforcement across _both_ buckets, in-batch dedup, canonical
label reuse). All four existing error messages are preserved verbatim so their unit tests keep
their assertions. `validateTagName` exists so the same length/emptiness rules cannot drift between
"tag an item" and "declare a tag" — one implementation, two callers.

**Per-item cap still counts assignments, not declarations** (spec edge case "a tag capped out"):
the check is `existing.length + linkTagIds.length + createTags.length > TAG_MAX_PER_ITEM`. No cap
is placed on `ListTag` rows per list.

**Alternatives considered**: returning a discriminated array `({kind:"existing"}|{kind:"new"})[]` —
equivalent, but the two-bucket shape maps directly onto the two Prisma calls the route makes.

## R9 — Challenge window storage and boundary semantics

**Decision**: `List.challengeStartsAt DateTime?` and `List.challengeEndsAt DateTime?`. Both are
stored at **UTC day start**. The end boundary is expanded at query time with the existing
`utcDayEndExclusive()` from `src/lib/watch-entry-merge.ts`, giving `watchedAt >= start` and
`watchedAt < endExclusive` — inclusive at both ends.

**Rationale**: the app already treats watch dates as UTC calendar days —
`utcDayStart`/`utcDayEndExclusive` are the existing, tested primitives that
`findMergeCandidateWatchEntry` uses to decide whether two watches are "the same day". Reusing them
is what makes "a watch logged on the closing day still counts" (spec assumption) true in the same
sense the rest of the app means it, and avoids a second date convention.

Storing day-start for _both_ columns (rather than 23:59:59.999 for the end) keeps the stored value
round-trippable straight into an `<input type="date">` and keeps the "which day did the challenge
close" question answerable by reading the column. The expansion is one call at the query boundary.

**Half-open windows are valid** (spec assumption): start alone → only a `gte`; end alone → only a
`lt`; both null → no date restriction at all (FR-020).

**Alternatives considered**:

- _A single `challengeWindow Json` column_ — unqueryable, unvalidatable, and invisible to the
  existing `PATCH` handler's shape.
- _Storing the end at 23:59:59.999_ — makes the inclusive rule invisible in the data and forces
  every reader to know it was pre-expanded.
- _A `ChallengeWindow` child model_ — a 1:0..1 table for two nullable scalars.

## R10 — In-window figures: pure counting over a set of watched media ids

**Decision**: extend `src/lib/list-stats.ts` with

```ts
export function computeWindowStats(
  items: {
    isHidden: boolean;
    mediaItemId: string;
    mediaItem: { year: number | null; productionCountries?: string[] };
    tags: { id: string; label: string; normalized: string }[];
  }[],
  listTags: { id: string; label: string; normalized: string }[],
  watchedMediaItemIds: ReadonlySet<string>,
): WindowStats;
```

The date filtering happens in the query that produces `watchedMediaItemIds`; the counting is pure.

**Rationale**: this split is what makes the core requirement — "a rewatch added to the list must
not be credited by an older watch" — a unit test rather than an integration test. Passing a `Set`
of media ids also delivers FR-024 for free: a title watched five times inside the window is one
member of the set, so each tag, decade and country it covers is credited exactly once.

Living in `list-stats.ts` beside `computeListStats()` is deliberate: the definitions of "a decade"
(`floor(year/10)`), "a country" (once per code per title) and "hidden items are excluded" are
stated once and shared, so the in-window and all-time figures cannot drift apart. `computeListStats`
gains a second `listTags` parameter so its `tagCounts` can include declared-but-unused tags at
`count: 0` (FR-009) and a new `declaredTags` figure.

**Alternatives considered**:

- _A `computeInWindowStats` that takes raw watch rows and does its own date filtering_ — mixes the
  boundary rule into the counting rule; the boundary rule is already tested in
  `list-challenge-window.test.ts`, and this would test it twice, differently.
- _Computing in-window figures in SQL with `GROUP BY`_ — three aggregate queries replacing two
  in-memory passes over an item-capped array, and none of it unit-testable.

## R11 — Whose watches appear, and the privacy divergence

**Decision** (adopted as the spec flagged it, not narrowed):

- **Whose watches count**: every current `ListMember` of the list, any role, plus `List.ownerId`
  defensively. Membership is read at page render, so a departed member's watches leave with them.
- **`watchHistoryVisibility` is deliberately NOT consulted.** Inside a list, membership is the
  authorisation. This is a conscious divergence from `fetchTitleWatchHistoryForViewer()` and
  `fetchFriendsWatchHistoryInRange()`, which both gate on `canViewProfileContent()`.
- **The attributed history view is member-only** (owner or `ListMember`). A non-member looking at a
  _public_ list sees the list and the aggregate in-window figures, but no per-person history and no
  entry point to it.

**Rationale**: FR-019's wording is "visible to every **member** who can see the list" — it grants
access to members, it does not extend it to anonymous visitors, and the spec's own assumption
frames the divergence as a consequence of _joining a shared challenge list_. Someone who has not
joined has consented to nothing. Aggregate counts ("19 of 31 categories covered") name nobody and
so stay as visible as today's all-time figures.

The divergence is contained in **one module**, `src/lib/list-watch-history.ts`, with the reasoning
stated at the top of the file; every query that ignores `watchHistoryVisibility` is in that file
and nowhere else. Reversing the decision means adding one filter in one place.

`List.ownerId` is unioned into the member id set even though `POST /api/lists` already creates an
`OWNER` `ListMember` row for the creator — cheap, and it keeps the scoreboard correct for any list
whose membership row was ever removed by hand.

**Alternatives considered**:

- _Honour `watchHistoryVisibility` inside lists_ — makes the shared scoreboard silently
  incomplete: a member with `PRIVATE` history would contribute nothing and appear to be not taking
  part, which defeats the feature. Rejected, and the spec rejected it too.
- _Show the attributed history to anyone who can see a public list_ — exports members' viewing
  dates to the open internet on the strength of a list setting they may not control. Rejected.

## R12 — The history is a route, not a modal

**Decision**: a new RSC route `src/app/(app)/lists/[slug]/history/page.tsx` with its own
`loading.tsx`. Linked from a `History` icon button in the list header. A private list viewed by a
non-member redirects to `/lists/<slug>`, letting the existing `PrivateListGate` handle the ask.

**Rationale**: a challenge produces 31+ film watches plus TV episodes — well past what a dialog
should hold, and the constitution's long-feed density rule (compact rows) assumes a page. A route
also gets a real `loading.tsx`, is linkable ("look at the scoreboard"), and keeps the data fetch in
a Server Component instead of a client `useEffect`, so principle I is satisfied without a read API
route. Redirecting rather than re-rendering the gate avoids duplicating the access-request flow.

**Alternatives considered**:

- _A modal fed by a `GET …/history` route_ — adds a read endpoint that must re-implement the
  visibility check (the thing 010 R3/R8 worked to avoid) and a client fetch for data an RSC can
  read directly.
- _A tab on the list page itself_ — the list page already loads every item with five relations;
  adding the merged watch feed to that query would slow the common case for a view most visits do
  not open.

## R13 — Tags on the grid card: a chip row **below** the poster

**Decision**: render up to **2** chips plus a `+N` counter in the card wrapper _underneath_ the
`MediaCard`, conditional on `item.tags.length > 0`.

**Rationale**: this is the one placement that satisfies all four of US3's scenarios at once.
`MediaCard` is poster-only (its title/year appear as a hover overlay), and the poster's four
corners are already taken — rank/avatar top-left, vote pill top-right, comment badge bottom-right,
hide toggle bottom-left. Any in-poster tag strip would collide with two of them, which is precisely
why [010 rendered none](../010-list-item-curation/research.md). Below the poster there is no
collision, the chips are legible rather than overlaid on artwork, and:

- FR-028 / SC-007 "posters per row unchanged" — holds trivially: the row count is fixed by
  `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` and the poster keeps `aspect-[2/3]`.
- US3.3 "an item with no tags takes no extra height" — the row is not rendered at all when the
  item carries none.
- US3.2 "the remainder indicated as a count" — `+N` after two chips.

Cards in a row will differ in height where one is tagged and another is not; CSS grid aligns them
to the top of the row, which is the same behaviour the existing hover overlays already produce.
The chips are non-interactive `<span>`s, so a click near a card still opens the item modal.

**Alternatives considered**:

- _An overlay strip across the poster's lower third_ — collides with the hide toggle and comment
  badge, and obscures artwork on a page whose whole point is browsing posters.
- _Tags only on hover_ — fails US3.1's "without the member opening the item" in spirit and is
  unreachable on touch.
- _Raising the visible chip count to 3 (as the list view uses)_ — a grid card is ~40% the width of
  a list row; three chips wrap to two lines on the `grid-cols-2` mobile breakpoint.

## R14 — Sticky header: a sentinel, not `position: sticky`

**Decision**: `ListStickyHeader` is rendered **by** `ListPageHeader` (which already owns the
`addOpen` / `statsOpen` state) and shows a `fixed top-16 inset-x-0 z-30` bar when a zero-height
sentinel placed at the top of the page scrolls out of view, observed with `IntersectionObserver`.

**Rationale**: two requirements fall out of this shape rather than needing code.

- FR-031 "behaving identically to the equivalent actions at the top of the page" — the bar calls
  the _same_ `setAddOpen` / `setStatsOpen` setters and there is only ever one `ListAddFab` and one
  `ListStatsModal` mounted. Nothing is duplicated, so nothing can diverge.
- FR-032 / US4.5 "must not appear on a list short enough not to scroll" — if the page does not
  scroll, the sentinel never leaves the viewport, so the bar never appears. No height measurement,
  no resize listener, no `scrollHeight` heuristic.

`top-16` sits it directly under the app's own `sticky top-0` `h-16` nav (`src/components/nav.tsx`),
matching the `sticky top-16` day headings on `/history`. The add button is rendered only when the
viewer may add items, from the same `hasSidebar && isMember` condition the header uses (FR-032).

**Alternatives considered**:

- _`position: sticky` on the real header_ — the full header is ~150px tall with description, avatars
  and counts; sticking it would eat a quarter of the viewport, and it would be visible at scroll
  position 0 too, giving the "duplicate title bar" US4.5 forbids.
- _A scroll listener with a pixel threshold_ — a magic number per breakpoint, a listener on every
  scroll frame, and it still needs a separate short-page check.
- _A separate component owning its own modal instances_ — two `ListAddFab`s mounted, two sources of
  truth for "is the add dialog open". This is the FR-031 divergence risk, materialised.

## R15 — What is explicitly NOT changed

Recorded so the tasks phase does not touch it and reviewers do not expect it:

- `orderListItems()` / `normalizePositions()` / `filterHiddenFromOrdering()` in
  `src/lib/list-item-ordering.ts` — reused unchanged (requester's constraint). No read-path
  partitioning is reintroduced.
- `computeListStats()`'s existing four figures keep their definitions; only the tag list gains
  zero-count entries and one new `declaredTags` figure.
- The per-item tag cap (`TAG_MAX_PER_ITEM = 15`) and length cap (`TAG_MAX_LENGTH = 30`) are
  unchanged, and declaring more list tags does not raise the per-item cap (spec edge case).
- `WatchEntry` / `EpisodeStatus` are **read only**. This feature adds no way to record a watch and
  changes nothing about what watching means elsewhere.
- Radarr export, Discord notifications, votes, comments, hiding and ranking are untouched (SC-010).
- No new env var, no cron change, no Docker change → no `.env.example` or `README.md` edit.
