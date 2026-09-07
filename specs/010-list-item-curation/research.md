# Phase 0 Research: List Item Curation (hide, tags, stats)

**Feature**: `010-list-item-curation` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

The spec left no `[NEEDS CLARIFICATION]` markers, but it recorded ten **Assumptions** and a set of
verbatim technical conditions in its **Input** field. This document resolves each into a concrete
decision, plus the codebase questions that only surface once you read the existing list page.

Every decision below is anchored to the code that already exists, so the tasks phase never has to
re-derive it.

---

## R1 — Hidden state: shape and location

**Decision**: one column, `ListItem.isHidden Boolean @default(false)`. No join table, no
`hiddenAt`/`hiddenById`, no index.

**Rationale**: dictated verbatim by the requester ("a single boolean column on `ListItem` … NOT
per-viewer … do not add a per-user join table, and do not filter by viewer identity in the read
path"), and consistent with the existing `noteIsSpoiler Boolean @default(false)` on the same model.
No index: lists are capped (`List.itemCap`) and `page.tsx` already loads every item of the list in
one query, so hidden-ness is filtered in memory, never in SQL — an index would never be used.

**Alternatives considered**:

- _`ListItemHidden` join table keyed by `(listItemId, userId)`_ — would make hiding per-viewer,
  which the requester explicitly ruled out and which contradicts FR-001 and acceptance 1.2.
- _Adding `hiddenAt` / `hiddenById` for an audit trail_ — no requirement asks who hid an item or
  when; two extra columns nobody reads. Rejected as speculative.
- _Reusing `position = null` as a "parked" marker_ — would collide with the ranked-order fix from
  009 and destroy ranked position, violating FR-006.

## R2 — Tag storage: relation model vs. scalar array

**Decision**: a new `ListItemTag` model — `id`, `listItemId`, `label` (display casing),
`normalized` (comparison form), `createdAt`, with `@@unique([listItemId, normalized])`,
`@@index([listItemId])`, and `onDelete: Cascade` from `ListItem`.

**Rationale**:

- Matches the established sibling pattern on this exact model: `ListItemVote`, `ListItemComment`
  and `ListItemCommentRead` are all separate models hanging off `ListItem`.
- `@@unique([listItemId, normalized])` enforces FR-014 (no duplicate tag on one item) in the
  database rather than in application code, and does so case-insensitively because the unique key
  is the normalized form, not the label.
- `onDelete: Cascade` gives FR-018 (deleting an item removes its tags) for free.
- Storing `label` **and** `normalized` lets FR-013 (case-insensitive, whitespace-insensitive
  matching) and the spec's "first casing used within a list is what suggestions display" assumption
  coexist without a lossy `toLowerCase()` on user input.

**Alternatives considered**:

- _`ListItem.tags String[]` (Postgres text array)_ — cannot express a case-insensitive uniqueness
  constraint, cannot be indexed usefully, and every dedup/count becomes application code with no
  database backstop. Rejected.
- _A list-scoped `ListTag` vocabulary table with a `ListItemTag` join_ — three tables to model a
  free-text label with no attributes of its own. The spec is explicit that "a tag has no existence
  independent of the items using it", which is exactly what the two-table version would create:
  orphan vocabulary rows that must be garbage-collected to satisfy FR-016. Rejected as
  over-normalisation.
- _Denormalising `listId` onto `ListItemTag`_ — considered so per-list suggestion queries avoid a
  join. Made unnecessary by R3 (suggestions are derived from data the page already loads), so it
  would be a redundant column that can drift. Rejected.

## R3 — Tag suggestions: derived in the RSC, not fetched

**Decision**: the per-list tag vocabulary is computed **in `page.tsx` from the items it already
loads**, by a pure function `buildTagVocabulary(items)` in `src/lib/list-item-tags.ts`, and passed
down as a prop. There is **no** suggestions API route and no client-side fetch while typing.

**Rationale**:

- `page.tsx` already does one `prisma.list.findUnique` with `include: { items: { include: … } }`.
  Adding `tags: { select: { label: true, normalized: true, createdAt: true } }` to that include
  costs one join and yields the whole vocabulary — the list is item-capped, so this is bounded.
- FR-012's hard requirement ("MUST NOT suggest tags drawn from any other list") becomes
  structurally impossible to violate: the only data in scope is this list's items. A route that
  took a query string could be made to leak across lists by a future edit; a derived prop cannot.
- FR-016 ("when a tag stops being used by any item, it stops being suggested") is automatic — the
  vocabulary is recomputed from current rows on every render, and mutations already call
  `router.refresh()` per constitution principle I.
- Keeps the matching logic pure and unit-testable (principle V), and adds zero client-side data
  fetching (principle I).

**Alternatives considered**:

- _`GET /api/lists/[slug]/tags?q=…` with debounce_ — a network round trip per keystroke for data
  the server already had in hand, plus a new surface needing its own `auth()` + list-visibility
  guard. Rejected.
- _Global (account-wide) vocabulary_ — directly contradicts FR-012 and SC-005.

## R4 — Tag normalisation, ordering and display casing

**Decision**, all in `src/lib/list-item-tags.ts` as pure functions:

| Concern          | Rule                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normalisation    | trim, collapse every internal whitespace run to a single space, then `toLocaleLowerCase()`                                                               |
| Display label    | trim + whitespace-collapse only; casing preserved as typed                                                                                               |
| Canonical casing | on write, if the normalized form already exists anywhere in the list, reuse that list's **earliest** `createdAt` label instead of the newly typed casing |
| Suggestion match | `normalized.startsWith(normalizedQuery)` first, then `normalized.includes(normalizedQuery)`                                                              |
| Suggestion order | usage count in the list descending, then `normalized` ascending                                                                                          |
| Suggestion cap   | 6                                                                                                                                                        |
| Separator        | `,` splits input into multiple tags; empty fragments are dropped before validation                                                                       |
| Length limit     | 30 characters, measured on the display label after trim + collapse                                                                                       |
| Per-item cap     | 15 tags, measured on the **resulting** set (so re-adding an existing tag never trips the cap)                                                            |

**Rationale**: the length/count limits and comma behaviour come straight from the spec's
"Tag limits" assumption. Canonicalising casing on write goes one step beyond the spec's assumption
(which only constrains what _suggestions_ display) because leaving each item's own casing would show
"Noir" on one card and "noir" on the next in the same list — the spec's own edge case
("Casing drift in the vocabulary") treats those as one tag, so showing them differently would read
as a bug. Prefix-before-substring matching is what makes SC-004 ("accept from suggestions after
typing at most three characters") reachable. The cap of 6 keeps the popover shorter than the input
it hangs from.

**Alternatives considered**:

- _Store only the lowercased form_ — every tag would render as "halloween", losing intent for
  proper nouns. Rejected.
- _Fuzzy / Levenshtein matching_ — nothing in the spec asks for typo tolerance, and it would make
  the suggestion order unpredictable. Rejected.
- _Splitting on whitespace too_ — the spec's own examples include multi-word tags ("cheap laughs"),
  so whitespace must be tag content, not a separator. Rejected.

## R5 — Who may hide and tag: a deliberate divergence from the notes rule

**Decision**: hidden state and tags are editable by the list **owner and any `CONTRIBUTOR`/`OWNER`
member, on any item**. Item **notes** keep today's narrower owner-or-adder rule, unchanged. The
split lives in a new pure module `src/lib/list-item-permissions.ts`.

**Rationale**: `PATCH /api/lists/[slug]/items/[itemId]` currently authorises with
`isOwner || isAdder` (see `src/app/api/lists/[slug]/items/[itemId]/route.ts:29-33`). The spec's
first assumption asks for the broader rule for curation, and explains why: restricting hidden state
and tags to the original adder leaves items un-curatable once that member stops participating.
Because the two rules now differ **per field**, the safest implementation is to keep them on
separate routes (see R6) rather than branch inside one handler, where a future edit could widen the
notes rule by accident.

**This is the spec assumption the spec itself flagged for confirmation.** It is adopted as
specified; nothing else in the plan depends on which way it goes, so reversing it later would touch
only `list-item-permissions.ts` and its tests.

**Alternatives considered**:

- _Apply owner-or-adder to tags and hidden state too_ — contradicts the spec assumption and makes
  acceptance 1.1/2.1 fail for a contributor curating somebody else's item.
- _Per-field branch inside the existing PATCH handler_ — one route, two authorisation models, and a
  real risk of loosening the notes rule during a later refactor. Rejected in favour of R6.

## R6 — API surface

**Decision**: two new routes, both mirroring existing per-item sub-resources.

| Route                                           | Method   | Precedent it mirrors                           |
| ----------------------------------------------- | -------- | ---------------------------------------------- |
| `/api/lists/[slug]/items/[itemId]/hidden`       | `PATCH`  | `items/[itemId]/vote/route.ts`                 |
| `/api/lists/[slug]/items/[itemId]/tags`         | `POST`   | `items/[itemId]/comments/route.ts`             |
| `/api/lists/[slug]/items/[itemId]/tags/[tagId]` | `DELETE` | `items/[itemId]/comments/[commentId]/route.ts` |

`PATCH …/hidden` takes `{ isHidden: boolean }` — an **absolute set, never a flip** — so two
concurrent toggles converge on last-write-wins with no lost update, and a no-op toggle returns 200
rather than an error (spec edge case "Concurrent toggles").

`POST …/tags` takes `{ labels: string[] }` and is a **set merge**: labels whose normalized form the
item already carries are silently skipped (spec acceptance 2.4 asks for no duplicate and no error),
and the response is the item's full resulting tag set. Validation is **all-or-nothing** across the
batch, so one bad fragment in a pasted `"noir, , rewatch"` leaves existing tags untouched (FR-015).
A batch endpoint rather than one request per tag is what makes the pasted-separator edge case a
single atomic mutation.

**No new API route for stats** — see R8.

**Alternatives considered**:

- _Extending `PATCH …/items/[itemId]` with `isHidden` and `tags`_ — rejected per R5.
- _`POST …/tags` with a single `{ label }`_ — a pasted `"noir, rewatch"` becomes two requests with
  no atomicity, so a failure halfway leaves one tag saved. Rejected.
- _`PUT …/tags` replace-all semantics_ — makes concurrent tagging by two members lose one member's
  tag silently. Rejected; merge-on-add + delete-by-id is the safe pair.

## R7 — Order first, then filter: keeping the 009 ranked-order fix intact

**Decision**: `page.tsx` calls the existing `orderListItems()` on the **complete** item set,
unchanged, and only then drops hidden items from the resulting sequence via a new pure companion
`filterHiddenFromOrdering(ordering, hiddenFilter)` added to `src/lib/list-item-ordering.ts`. The
filter maps over `ordering.items` (ranked) or the four grouped arrays and removes hidden entries
**without recomputing `displayRank`**.

**Rationale**: this is the single most load-bearing decision in the feature. `orderListItems()`
assigns `displayRank = index + 1` over whatever it is given. Filtering **before** ordering would
renumber the visible items — exactly what FR-007, acceptance 1.8 and SC-008 forbid, and exactly the
class of read-path partitioning the requester told us not to reintroduce. Filtering **after**
ordering leaves gaps in the rank sequence (1, 3, 4 …), which is the correct, required behaviour: a
hidden item keeps its rank. It also satisfies the "Unranked (grouped) lists" edge case for free,
because a grouped item is filtered within its own section and never moves between sections.

`orderListItems()` and `normalizePositions()` are not modified at all.

**Alternatives considered**:

- _`where: { isHidden: false }` on the Prisma include when the filter is on_ — cheaper by one
  in-memory pass, but ranks would renumber, and the item cap / total-item stat would silently see a
  short item set. Rejected outright.
- _Two ordering calls (one full for ranks, one filtered)_ — same result as the chosen approach but
  duplicates the sort work and invites the two calls to drift. Rejected.

## R8 — Stats: a modal fed by a pure function, no route, no storage

**Decision**: `computeListStats(items)` in `src/lib/list-stats.ts` (pure), called in `page.tsx`
from the already-loaded items, rendered by a `ListStatsModal` client component opened from a
**"Stats" button in the list header's existing action cluster** (beside Add and Settings), using the
`BarChart3` icon.

Four figures: `totalItems`, `visibleItems`, `distinctDecades`, `distinctVisibleTags`.

**Rationale**:

- FR-024 (read-only) is satisfied by construction: there is no mutation path to a derived value.
- FR-025 (access rules) is satisfied by construction: the numbers ride on the page render, which
  already sits behind the `isPublic || isMember` gate and the `PrivateListGate` branch.
- FR-019's "without scrolling past the list contents" is met because the header action cluster is
  the top-right of the page, above the items, and is already rendered for every viewer.
- A modal rather than a sub-page keeps the list underneath ("opens without leaving useful context
  behind", spec acceptance 3.5) and adds no route, no `loading.tsx`, no second data fetch.
- Nothing is stored, matching the spec's "List stats summary" entity note.

**Figure definitions** (locked here so tasks need not decide):

- `totalItems` — every `ListItem` on the list, hidden included (acceptance 3.1: 12).
- `visibleItems` — `totalItems` minus hidden (acceptance 3.1: 9).
- `distinctDecades` — over **all** items, hidden included, per the spec's "Decades scope"
  assumption; `Math.floor(year / 10)` bucketed; items with `mediaItem.year === null` contribute
  nothing (FR-021, acceptance 3.3).
- `distinctVisibleTags` — count of distinct **normalized** tag forms present on non-hidden items
  only (FR-022, acceptance 3.4).

**Alternatives considered**:

- _`/lists/[slug]/stats` sub-page_ — a second route, its own auth gate, its own `loading.tsx`, and
  it navigates away from the list. Permitted by the spec ("a modal or a dedicated sub-page is
  fine") but strictly more machinery for the same four numbers. Rejected.
- _`GET /api/lists/[slug]/stats`_ — a fetch on modal open, a spinner, and a third place that must
  re-implement the list visibility check. Rejected.
- _Persisting the figures on `List` and updating them on every mutation_ — a cache with four
  invalidation paths for numbers that cost one pass over an item-capped array. Rejected.
- _Always-visible stats strip under the header_ — the spec says it "does not need to be visible at
  all times", and four more numbers in the header would compete with the existing member/item/
  watched counts. Rejected.

## R9 — Filter state in the URL

**Decision**: `?hidden=exclude` removes hidden items from the view; absent or any other value means
include-them-faded (the default). Parsed by a new pure module `src/lib/list-view-params.ts` whose
`parseListViewParams({ sort, hidden }, { votingEnabled })` returns `{ sort, hiddenFilter }` — and
which **absorbs the existing inline `parseSort` from `page.tsx`**, giving it unit tests it does not
have today.

**Rationale**: FR-005 requires the control's state to survive a reload and to be reproducible by
sharing the address. The page already puts `sort` in the query string and `ListSortControls` already
does `router.push('?' + params)` while preserving other params, so the filter joins an established
mechanism rather than inventing one. `exclude` as an explicit word (rather than `hidden=0` or
`showHidden=false`) keeps the shared URL self-describing and avoids the "off means the hidden items
are off, or the filter is off?" ambiguity.

**Alternatives considered**:

- _Persist per user on `UserPreference`_ — the spec's "Filter persistence" assumption explicitly
  rejects this in favour of a shareable URL. Also would not satisfy "reproducible by sharing".
- _Client-only `useState`_ — fails the reload half of FR-005.
- _A boolean `?hidden=0`_ — shorter, ambiguous. Rejected.

## R10 — Reordering while filtered

**Decision**: `canReorder = list.rankingEnabled && canCurate && hiddenFilter === "include"`. When
ranking is on and the filter is excluding items, the page renders one short line above the items:
"Reordering is off while hidden items are filtered out." Drag handles are not rendered.

**Rationale**: FR-008 requires exactly this, and there is a concrete reason it is not merely
cosmetic — 009 hardened `PATCH /api/lists/[slug]/items/reorder` to renumber from the **full**
submitted ordering, so a drag over a filtered subset would submit a partial sequence and corrupt
positions. Withdrawing the affordance is the correct fix, not a workaround.

**Alternatives considered**:

- _Allow the drag and merge the hidden items back in client-side_ — the client would have to know
  every hidden item's position, which the filtered payload deliberately does not carry, and any
  drift silently reorders items the user cannot see. Rejected.
- _Silently ignore the drag_ — an affordance that does nothing. Rejected.

## R11 — Making "hidden" legible without hover

**Decision**: a hidden item renders at `opacity-50` **and** carries a small `EyeOff` badge; the
toggle button's `aria-pressed` and `aria-label` flip between "Hide from view" and "Unhide".

**Rationale**: FR-004 says a hidden item must be distinguishable "without hovering or clicking".
Opacity alone fails that for anyone with reduced contrast sensitivity and communicates nothing to a
screen reader, so a second, non-colour channel (the icon) plus the ARIA state is required rather
than optional.

## R12 — Surfaces the feature deliberately does **not** touch

Recorded here so the tasks phase does not "helpfully" extend them:

- `src/app/api/lists/[slug]/radarr/route.ts` — the Radarr export keeps exporting every movie,
  hidden included (spec: "hiding an item does not change what the list publishes").
- `notifyListItemAdded` in `src/lib/discord.ts` — unchanged; hiding fires no notification.
- Vote totals and `ListItemVote` — unchanged (spec: hiding "does not change vote totals").
- `List.itemCap` enforcement in `POST /api/lists/[slug]/items` — already counts
  `list.items.length`, i.e. hidden items included, so **FR-026 is satisfied with no code change**.
  It gets an assertion in the E2E hide spec so nobody "optimises" it later.
- `orderListItems()` / `normalizePositions()` — read-only reuse, per the requester's constraint.

## R13 — No new Prisma enum, therefore no client-safe mirror

**Decision**: `isHidden` is a boolean and a tag is a string; the feature introduces no enum, so
`src/lib/notification-types.ts` needs no addition.

**Rationale**: the spec's constraint was conditional ("any new Prisma enum **needed by** client
components must be mirrored"). The condition does not arise. Noted explicitly because the constraint
was called out in the Input, and an implementer might otherwise add a mirror for the `hiddenFilter`
union — which is a plain TypeScript union in `src/lib/list-view-params.ts`, not a Prisma enum, and
is safe to import into a client component as-is.

## R14 — Two distinct empty states

**Decision**: `page.tsx` distinguishes three cases rather than today's two:

1. `list.items.length === 0` → today's "No items yet" panel, unchanged.
2. items exist, filter excluding, nothing visible → "Every item on this list is hidden." plus a
   one-click control to switch the filter back off.
3. otherwise → the items.

**Rationale**: the spec's first edge case requires case 2 not to look like case 1.

---

## Resolved: all spec assumptions

| Spec assumption           | Resolution                                                 |
| ------------------------- | ---------------------------------------------------------- |
| Who may hide and tag      | R5 — adopted as specified (owner + contributors, any item) |
| Default view              | R9 — filter is opt-in; hidden shown faded by default       |
| Filter persistence        | R9 — `?hidden=exclude` in the URL                          |
| Decades scope             | R8 — all items, known years only                           |
| Reordering while filtered | R10 — withdrawn, with a one-line explanation               |
| Tag limits                | R4 — 30 chars, 15/item, comma separates                    |
| Tag casing                | R4 — canonicalised to the list's first-used casing         |
| Suggestion volume         | R4 — 6, by usage count then alphabetical                   |
| No effect on integrations | R12 — Radarr/Discord/votes untouched                       |
| Existing behaviour reused | R7 — `orderListItems()` unchanged                          |
| Build order               | Hiding → tags → stats, reflected in the commit plan        |
| Durable storage expected  | R1, R2 — one boolean column + one relation model           |

**No `NEEDS CLARIFICATION` items remain.**
