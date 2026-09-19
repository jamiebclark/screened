# Implementation Plan: List Watch Timeline

**Branch**: `013-list-watch-timeline` | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-list-watch-timeline/spec.md`

## Summary

Add `/lists/[slug]/timeline`: a vertical, oldest-first timeline of the list's titles, each anchored at its latest qualifying watch, bounded to the list's challenge window when one is set. Access follows the list's visibility tier through the existing `resolveListAccess`; only the owner and members see who watched what — everyone else receives a data shape with watcher identities stripped before render. A new pure module `src/lib/list-watch-timeline.ts` (Vitest-covered) turns list items + `fetchListWatchHistory` rows into the timeline; the page is a thin RSC shell with a matching `loading.tsx`, a header icon button links to it from the list page, and the edge proxy allowlists the route so PUBLIC lists work logged-out. No schema changes. Ships as `feat` commits to `main` → semantic-release minor → Docker image.

## Technical Context

**Language/Version**: TypeScript 5 / Node 22
**Primary Dependencies**: Next.js App Router (RSC), NextAuth v5 (`auth()` in RSC + edge proxy), Prisma, Tailwind v4 + Radix UI, lucide-react
**Storage**: PostgreSQL via Prisma — read-only for this feature; no migration
**Testing**: Vitest (`src/lib/*.test.ts`), Playwright (`e2e/*.spec.ts`, helpers in `e2e/helpers.ts`)
**Target Platform**: Self-hosted Docker Compose (Linux), image built by `.github/workflows/release.yml`
**Project Type**: Web application (single Next.js project; RSC pages + `/api` route handlers)
**Performance Goals**: One list query + the two bounded watch queries `fetchListWatchHistory` already issues (no cap); SC-004: 200 titles / 500 watches renders in < 2 s
**Constraints**: No `db push`; non-member RSC payload MUST contain no member `name`/`avatarUrl` (RSC props are visible in HTML); vertical layout works at ~390px and desktop with no horizontal scroll; existing history page behaviour unchanged
**Scale/Scope**: 1 new lib module + test, 1 new route (page + loading) with 1 render component, 1 header edit, 1 proxy edit, 1 `take` default change in `list-watch-history.ts`, 1 new e2e spec, 2 doc edits

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](.specify/memory/constitution.md) (v1.1.0):

- [x] **I. Server Components First** — the timeline page and its `ListTimeline` component are Server Components; there are no mutations, so no Route Handler or `router.refresh()` is involved. The only client component touched is the existing `list-page-header.tsx`, which gains a plain `<Link>` button.
- [x] **II. Security by Default** — no new API routes. The page calls `await auth()` and `resolveListAccess` before any list data is used; `login` → redirect with `callbackUrl`, `forbidden` → redirect to the list page, unknown slug → `notFound()`. Non-member payloads are stripped by `stripWatchers` in the lib layer (R5). The proxy exemption is limited to the exact `/lists/<slug>/timeline` path. No env vars.
- [x] **III. Migrations Only** — no schema change; nothing to migrate.
- [x] **IV. Conventional Commits** — commit sequence (below) lands lib → proxy → page → header link → tests → docs, one concern each; `feat(lists)` commits trigger the minor release.
- [x] **V. Test at the Right Level** — Vitest for `buildListTimeline` / `stripWatchers` / `groupEntriesByDay` (pure logic); Playwright `lists-timeline.spec.ts` for the member, window, anonymous, and redirect journeys; `yarn ci:check` before merge. No API contract changes, so no existing tests need updating (history page keeps `take: 200`).

**UI/UX standards check**: Density decided in R6 — the timeline is a long feed (30–300 entries) → **compact rows** (`rounded-lg border p-3`, `w-10 h-15` posters, `h-6 w-6` watcher avatars); the "Not watched yet" group is a peer section with an `h3 text-base font-semibold` heading and count, not nested in the timeline card. Hierarchy: back link + `h1` identity → timeline → unwatched section. Loading: route-level `loading.tsx` mirroring rail + rows. Empty state: dashed box, human copy, no action beyond the back link. Responsive: fixed rail + `min-w-0 flex-1` content column; watcher clusters wrap.

**Post-design re-check**: No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/013-list-watch-timeline/
├── plan.md              # This file
├── research.md          # Phase 0 — 10 decisions (R1–R10)
├── data-model.md        # Phase 1 — derived types, invariants, access matrix
├── quickstart.md        # Phase 1 — local verification + deploy steps
├── contracts/
│   └── timeline-page.md # /lists/[slug]/timeline by tier × viewer; page structure; test hooks
├── checklists/requirements.md
└── tasks.md             # Phase 2 — /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
src/lib/
├── list-watch-timeline.ts            # NEW: buildListTimeline, stripWatchers, groupEntriesByDay + types
├── list-watch-timeline.test.ts       # NEW: Vitest
└── list-watch-history.ts             # `take` optional; no cap when omitted (history page still passes 200)

src/proxy.ts                          # + PUBLIC_LIST_TIMELINE_PAGE = /^\/lists\/(?!new$)[^/]+\/timeline$/

src/app/(public)/lists/[slug]/
├── list-page-header.tsx              # + Timeline icon button (all viewers), before Challenge history
└── timeline/
    ├── page.tsx                      # NEW: auth + resolveListAccess, fetch, build, strip, render
    ├── loading.tsx                   # NEW: rail + row skeletons
    └── list-timeline.tsx             # NEW: server component — rail, day/month/today markers, entry rows, unwatched section, empty state

e2e/
└── lists-timeline.spec.ts            # NEW: member view, window bounding, anonymous PUBLIC, MEMBERS→login, PRIVATE→list

docs/lists.md                         # + "Timeline" under "Running a challenge"
README.md                             # + clause on the Collaborative lists bullet
```

**Structure Decision**: Single Next.js project; the new route sits beside the existing `history/` sub-route inside the `(public)` group so it shares the anonymous-capable layout. Pure logic goes in `src/lib/` per the constitution; the render component stays route-local because nothing else uses it.

## Implementation notes (for /speckit.tasks)

1. **Lib** — `list-watch-timeline.ts` per data-model.md. Reuse `utcDayStart` / `utcDayEndExclusive` from `watch-entry-merge.ts` and `challengeWindowBounds` / `hasChallengeWindow` from `list-challenge-window.ts`. Month labels: `"October"` when the same year as the axis start, else `"October 2026"`. Day keys: UTC date (`YYYY-MM-DD`) to match the window semantics used everywhere else in lists.
2. **Fetch** — in `page.tsx`: `prisma.list.findUnique({ where: { slug }, include: { members: { select: { userId: true } }, items: { where: { isHidden: false }, orderBy: [{ position: "asc" }, { addedAt: "desc" }], include: { mediaItem: { select: {...} } } } } })`; then `fetchListWatchHistory({ mediaItemIds, memberUserIds: [owner, ...members], window })` with no `take`.
3. **Access** — same block as the list page (`resolveListAccess`), but `forbidden` → `redirect('/lists/<slug>')`. `generateMetadata` mirrors the list page's leak guard.
4. **Render** — `ListTimeline` takes `timeline: ListTimeline<TimelineEntry | AnonymisedTimelineEntry>` and `showWatchers: boolean` only to choose the sub-row template; the data is already stripped when `showWatchers` is false. Use `groupEntriesByDay` so the rail prints a day label once. Month and today markers are interleaved into the day sequence by date (a marker renders as a rail-only row).
5. **Header** — `list-page-header.tsx`: import `CalendarRange` from lucide; add the button before the history button, ungated.
6. **Proxy** — add the constant and OR it into `isPublicRoute`; update the comment that currently says the history sub-route is excluded.
7. **Tests** — see R9. The e2e spec reuses the `createList` / `addMovie` / `gotoList` helpers pattern from `lists-challenge.spec.ts` (copy locally; they are file-scoped there) and `/api/media/status` to log a watch.

## Commit sequence

1. `feat(lists): add list watch timeline builder` — lib module + Vitest; `take` optional in `list-watch-history.ts`
2. `feat(lists): allow anonymous access to the list timeline route` — `src/proxy.ts`
3. `feat(lists): render a watch timeline page for each list` — `timeline/page.tsx`, `loading.tsx`, `list-timeline.tsx`
4. `feat(lists): link to the timeline from the list header` — `list-page-header.tsx`
5. `test(lists): cover the list watch timeline journeys` — `e2e/lists-timeline.spec.ts`
6. `docs(lists): describe the list watch timeline` — `docs/lists.md`, `README.md`
7. `docs(specs): mark list watch timeline tasks complete`

## Complexity Tracking

No constitution violations; table intentionally empty.
