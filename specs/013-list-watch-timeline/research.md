# Research: List Watch Timeline

All Technical Context items were resolvable from the codebase; no external research was needed. Each decision below records what exists today, what was chosen, and what was rejected.

## R1 — Route location and access enforcement

**Decision**: Add `src/app/(public)/lists/[slug]/timeline/page.tsx` next to the existing `history/` route, and drive access with the existing `resolveListAccess` helper exactly as `lists/[slug]/page.tsx` does. `"login"` → `redirect('/login?callbackUrl=/lists/<slug>/timeline')`; `"forbidden"` → `redirect('/lists/<slug>')` (the list page renders the `PrivateListGate` with the access-request flow; duplicating the gate on a sub-page adds nothing).

**Rationale**: The spec (FR-002) says access follows the list page. Reusing the same pure helper guarantees the matrix stays identical (the 012 plan established this as the one source of truth). The `(public)` group already hosts the list subtree and its layout handles both anonymous and signed-in shells.

**Alternatives considered**: Rendering `PrivateListGate` inline on the timeline page — rejected; it would need its own access-request state and duplicates a flow the list page already owns.

## R2 — Edge proxy allowlist

**Decision**: Extend `src/proxy.ts` with a second public-page pattern, `^/lists/(?!new$)[^/]+/timeline$`, alongside `PUBLIC_LIST_PAGE`. `history` stays behind the proxy (members-only, unchanged).

**Rationale**: The proxy redirects every non-allowlisted path to `/login` before the page runs. Without the allowlist entry a PUBLIC list's timeline would never reach `resolveListAccess` for an anonymous visitor.

**Alternatives considered**: Widening `PUBLIC_LIST_PAGE` to `^/lists/(?!new$)[^/]+(/timeline)?$` — equivalent; a separate named constant reads more clearly and keeps the comment on the history exclusion accurate.

## R3 — Fetching qualifying watches

**Decision**: Reuse `fetchListWatchHistory` from `src/lib/list-watch-history.ts`. Make `take` optional with no default cap (the history page already passes `take: 200` explicitly, so its behaviour is unchanged). Pass the list's non-hidden `mediaItemId`s, the owner + member ids, and the challenge window; the helper already applies `challengeWindowBounds` (start-of-day inclusive, end-of-day inclusive) and merges `WatchEntry` + watched `EpisodeStatus` rows.

**Rationale**: FR-004's definition of a qualifying watch is exactly what this helper returns. The spec says no arbitrary cap (edge case: hundreds of titles) — SC-004 sizes it at 500 watches, which is two bounded `findMany` calls with an `in` filter, well within budget.

**Alternatives considered**: A new aggregate query (`GROUP BY mediaItemId, MAX(watchedAt)`) — rejected; members need every watch on the entry (FR-005), not only the max, and the row volume is small.

## R4 — Pure timeline builder

**Decision**: New module `src/lib/list-watch-timeline.ts` exporting `buildListTimeline(input)`:

- Input: non-hidden list items in display order (`{ listItemId, mediaItem }`), qualifying watch rows (`ListWatchHistoryRow[]`), the `ChallengeWindow`, and `now`.
- Output: `{ axis: { start: Date; end: Date } | null, entries: TimelineEntry[], unwatched: UnwatchedItem[], months: MonthMarker[], today: Date | null }`.
- Anchoring: per `mediaItemId`, `anchorAt = max(watchedAt)`; entries sorted by `anchorAt` ascending, then by title.
- Axis: `start = window.startsAt ?? min(watchedAt)`, `end = window.endsAt ?? max(watchedAt)`; `null` when there are no entries and no window.
- Month markers: one per calendar month (UTC) strictly after the axis start month, up to the axis end month, emitted only when `start` and `end` are in different months (FR-008).
- Today marker: `now` when `start <= now <= endOfDay(end)` (FR-009).
- Watcher rows on an entry: sorted ascending by `watchedAt`; episode rows collapse to one watcher row per (user, day) so a binge of ten episodes does not list ten lines — the row carries `episodeCount` for display.

**Rationale**: All spec-facing logic (anchoring, bounding, month/today markers, unwatched group) lives in one pure function that Vitest covers directly (Constitution V). The page becomes a thin fetch + render shell.

**Alternatives considered**: Computing in the page — rejected; untestable without a database.

## R5 — Anonymisation for non-members

**Decision**: The page computes `canSeeWatchers = isOwner || isMember` and calls `stripWatchers(timeline)` (exported from the same lib module) before rendering when it is `false`. The stripped shape replaces each entry's `watches` array with `watchCount: number` and drops `user` fields entirely — the anonymised data never enters the RSC payload, matching the 012 rule "data shape, not just UI".

**Rationale**: FR-005 / SC-005 require zero member names, avatars, or per-member dates in a non-member's page. RSC props are visible in the HTML stream, so stripping in the UI layer would leak.

**Alternatives considered**: Passing `showWatchers` down and hiding in JSX — rejected for the leak reason above.

## R6 — Layout and density

**Decision**: Vertical timeline (clarified). Structure per the UI/UX standard's card-vs-list rule: the timeline is a long feed (a Hooptober list has 31+ entries, bigger lists hundreds), so entries are **compact rows** (`rounded-lg border p-3`, `h-15 w-10` poster like the history page, `h-6 w-6` watcher avatars in a stacked cluster). Layout is a two-column grid: a fixed-width left rail (`w-14 sm:w-20`) holding the spine, day labels, and month/today markers; a `min-w-0 flex-1` content column holding the entry rows. Day labels render once per day on the spine; consecutive entries on the same day share the label. The axis start and end are rendered as capped terminals on the rail with their dates. The "Not watched yet" group is a separate peer section (`h3 text-base font-semibold` + count) of compact poster rows, not inside the timeline card.

**Rationale**: Matches `docs/ui-ux-standards.md` density rule and the constitution's "name the expected count" requirement; works at 390px without horizontal scroll because the rail is fixed and the content column shrinks.

**Alternatives considered**: Proportional vertical spacing (gap ∝ elapsed days) — rejected; a 60-day gap would produce empty screens, and the month markers already convey spread.

## R7 — Entry point in the list header

**Decision**: Add a `CalendarRange` icon button (`aria-label="Timeline"`) to `list-page-header.tsx` immediately before the Challenge history button. It is rendered for every viewer (members, signed-in non-members, anonymous), since FR-013 ties it to list visibility, not membership; the history button keeps its `hasSidebar` gate.

**Rationale**: One-action navigation from where the existing sibling link lives.

**Alternatives considered**: A tab strip on the list page — rejected; the header already uses icon buttons for peer pages and modals.

## R8 — Loading, empty, and metadata

**Decision**:

- `timeline/loading.tsx` mirrors the final layout (heading skeletons, then a rail + row skeleton pair × 6).
- Empty states (FR-012): window set and no entries → "Nothing watched in this window yet." with the window description; window set but not started → "This challenge hasn't started yet." + description; no window and no entries → "No member has logged a watch of anything on this list yet." — the same copy family as the history page.
- `generateMetadata` mirrors the list page: title `"<name> · Timeline"` when access is granted, otherwise `"Timeline"`.

## R9 — Testing

**Decision**:

- Vitest `src/lib/list-watch-timeline.test.ts`: anchoring at latest watch; out-of-window rows never reach the builder (guarded by the fetch) but the builder is also tested with an explicit window to assert axis bounds; single-watch axis collapse; month markers only across month boundaries; today marker in/out of span; unwatched group ordering and omission; hidden items excluded by the caller (documented, not tested here); `stripWatchers` removes every `user` and produces counts.
- Playwright `e2e/lists-timeline.spec.ts`: (1) member logs a watch on a MEMBERS list → timeline shows the title once with the member's name; a second title stays under "Not watched yet (1)"; (2) window set entirely in the past → empty "in this window" state; window widened to today → title appears; (3) PUBLIC list opened logged-out → timeline renders with the title and no member name, and the Timeline header button is present on the list page; (4) MEMBERS list opened logged-out → redirected to `/login?callbackUrl=…/timeline`; (5) PRIVATE list opened as the other test user → redirected to the list page.
- `yarn ci:check` before merge.

## R10 — Documentation

**Decision**: Add a "Timeline" paragraph under `docs/lists.md` → "Running a challenge" describing the page, anchoring rule, and the non-member anonymised view; add a clause to the README "Collaborative lists" bullet. No env vars, Docker, or cron changes.
