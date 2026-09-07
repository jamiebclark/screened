# Contract: list watch-history view and in-window figures

**Feature**: `011-list-challenge-tracking` | **Status**: NEW page route (no API route)
**Files**:

- `src/app/(app)/lists/[slug]/history/page.tsx` — Server Component
- `src/app/(app)/lists/[slug]/history/loading.tsx` — route-level skeleton
- `src/app/(app)/lists/[slug]/list-stats-modal.tsx` — in-window figures section (extended)

There is **no API route**. Both surfaces are rendered by Server Components from data read directly
via `src/lib/list-watch-history.ts` and `src/lib/list-stats.ts` — see
[research.md R12](../research.md). This feature adds **zero** read endpoints, matching the shape 010
established.

---

## `GET /lists/[slug]/history` (page)

The shared, date-ordered scoreboard: which list title was watched, on which date, by which member.

### Access

Evaluated in this order, before any watch data is read:

| Condition                                     | Result                                                 |
| --------------------------------------------- | ------------------------------------------------------ |
| Unknown slug                                  | `notFound()`                                           |
| No session                                    | `redirect("/login?callbackUrl=/lists/<slug>/history")` |
| Session, but not owner and not a `ListMember` | `redirect("/lists/<slug>")`                            |
| Owner or any `ListMember` (any role)          | Render                                                 |

**Member-only, including on a public list** — the deliberate reading of FR-019 ("visible to every
_member_ who can see the list"), argued in [research.md R11](../research.md). A non-member viewing a
public list sees the list and the aggregate figures, but no per-person history and no entry point to
it. Redirecting a private-list non-member to `/lists/<slug>` hands them to the existing
`PrivateListGate` access-request flow rather than duplicating it.

`VIEWER`-role members **can** read the history and their own watches **do** count toward the group
totals (spec assumption: they are still taking part).

### Data

```ts
const window = {
  startsAt: list.challengeStartsAt,
  endsAt: list.challengeEndsAt,
};
const rows = await fetchListWatchHistory({
  mediaItemIds, // every item on the list, hidden included
  memberUserIds, // current ListMember userIds ∪ list.ownerId
  window, // bounds omitted entirely when both ends are null
  take: 200,
});
```

| Rule                                                                                            | Requirement            |
| ----------------------------------------------------------------------------------------------- | ---------------------- |
| `WatchEntry` rows and `EpisodeStatus` rows (`isWatched: true`), merged newest-first             | FR-018, AS 2.8         |
| Only titles on this list                                                                        | FR-015                 |
| Only current members' watches; a departed member's watches disappear with them                  | FR-016, spec edge case |
| With a window: `watchedAt >= startsAt` and `< utcDayEndExclusive(endsAt)` — both ends inclusive | FR-017, AS 2.4         |
| Without a window: no date restriction                                                           | FR-020, AS 2.10        |
| Every watch of a title appears, even several of the same title                                  | spec edge case         |
| **Hidden** items' watches still appear — hiding is about how the list reads                     | spec edge case         |
| Cap of 200 rows, newest first, with a footer note when the cap is hit                           | mirrors `/history`     |

### Rendering

| Element              | Treatment                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header               | `h1` list name + "Challenge history", the window from `describeChallengeWindow()`, back-link to the list.                                                      |
| Day grouping         | `h2` day heading, `sticky top-16`, styled exactly as `/history`'s day headings.                                                                                |
| A watch row          | Compact row (`rounded-lg border p-3`): poster thumb, title + year, `h-10 w-10` member avatar, member name, time; `S1E4`-style label for an episode viewing.    |
| Empty, window set    | "Nothing watched in this window yet." plus the window dates — a short explanation, **not** an error (spec edge case: a window entirely in the past or future). |
| Empty, no window     | "No member has logged a watch of anything on this list yet."                                                                                                   |
| Not a challenge list | The page still works with no window; only the window line is omitted.                                                                                          |

Compact rows, not spacious cards: a 31-film challenge with TV episodes produces dozens to hundreds
of rows, which is the constitution's long-feed case.

---

## In-window figures (in `ListStatsModal`)

Rendered **only** when the list has a window (FR-026), above the existing all-time section.

```ts
const watched = await fetchListInWindowWatchedMediaItemIds({
  mediaItemIds,
  memberUserIds,
  window,
});
const windowStats = computeWindowStats(items, listTags, watched);
```

| Element              | Treatment                                                                                                           | Requirement     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------- |
| Section heading      | `h3 text-base font-semibold`: **"During the challenge"**, with the dates beneath in `text-sm text-muted-foreground` | FR-025          |
| Tiles                | `Categories covered` = `n / declaredTags`, `Decades`, `Countries`, `Films watched`                                  | FR-021          |
| Uncovered categories | The `tagCoverage` entries with `covered: false`, listed as chips under a "Still to cover" label                     | SC-005          |
| All-time section     | Existing tiles and lists, under an explicit **"All time"** `h3`                                                     | FR-025, AS 2.9  |
| No window            | Neither the in-window section nor the "All time" heading renders — the modal is exactly as today                    | FR-026, AS 2.10 |

The two sections are separate blocks with their own headings, never interleaved tiles, so a reader
can always tell which figure is which (FR-025, SC-005). The all-time block keeps the "All time"
heading only when the in-window block is present; on a list with no window there is nothing to
disambiguate and adding a heading would be noise.

**Visibility**: the aggregate figures name nobody, so they stay as visible as today's stats — any
viewer who can see the list can open them, including a non-member on a public list. Only the
attributed history is member-gated.

---

## Entry points (`list-page-header.tsx`)

The header's action cluster becomes, left to right:

| Button   | Icon        | Shown to                                                       |
| -------- | ----------- | -------------------------------------------------------------- |
| Add      | `Plus`      | members (unchanged)                                            |
| Tags     | `Tags`      | everyone who can see the list ([list-tags.md](./list-tags.md)) |
| History  | `History`   | members only (link to `./history`)                             |
| Stats    | `BarChart3` | everyone (unchanged)                                           |
| Settings | `Settings`  | members (unchanged)                                            |

All are `h-9 w-9` ghost icon buttons with `aria-label`s, matching the existing two.

## Sticky header

`ListStickyHeader` is rendered **by** `ListPageHeader` and receives `onAdd` / `onStats` callbacks
plus `canAdd`. It carries the list name and exactly the two actions FR-031 names.

| Rule                                                                                           | Requirement            |
| ---------------------------------------------------------------------------------------------- | ---------------------- |
| Appears when a zero-height sentinel at the top of the page leaves the viewport                 | FR-030                 |
| Never appears on a page that does not scroll — the sentinel never leaves view                  | FR-032, AS 4.5         |
| `fixed top-16 inset-x-0 z-30`, single `h-12` row, list name truncated                          | R14                    |
| Add and Stats call the **same** state setters as the header, so one modal instance serves both | FR-031, AS 4.2, AS 4.3 |
| Add rendered only when the viewer may add items                                                | FR-032, AS 4.4         |
