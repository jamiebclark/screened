# Tasks: First-Class Friends Hub

**Input**: Design documents from `/specs/008-friends-hub/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/friends-api.md ✅

**Tests**: E2E tests included (Playwright) as required by Constitution V for critical user journeys. No new unit tests — no new pure lib logic that warrants Vitest coverage.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete prior tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire up the main nav entry that makes the Friends hub reachable. No new files — this is a one-line change that unblocks all user stories.

- [x] T001 Add `Users` icon import and `{ href: "/friends", label: "Friends", icon: Users }` entry to `navLinks` array in `src/components/nav.tsx` — place after "History"; mobile nav auto-derives from the same array

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side data layer for the RSC page. Must be complete before Phase 3.

**⚠️ CRITICAL**: No user story page work can begin until this phase is complete.

- [x] T002 Create `src/lib/friends-queries.ts` with two exported async functions:
  - `getFriendsData(userId: string)` — direct Prisma queries returning `{ friends, outgoing, incoming }` in the same shape as `GET /api/friends` (replicates the query logic from `src/app/api/friends/route.ts` for server-side use)
  - `getRecentActivityPerFriend(friendIds: string[])` — Prisma `groupBy` on `WatchEntry` to get each friend's most recent `watchedAt`, then fetch matching `WatchEntry` rows for `tmdbId`+`mediaType`, then `Promise.all` TMDB title lookups via `getTitleDetails()` from `src/lib/tmdb.ts`; returns `Map<string, { tmdbId: number; mediaType: string; title: string; watchedAt: Date }>`

**Checkpoint**: `friends-queries.ts` exports are ready — page implementation can begin.

---

## Phase 3: User Story 1 — View Friends List (Priority: P1) 🎯 MVP

**Goal**: A signed-in user can navigate to `/friends` and immediately see all accepted friends with their most recent watch activity, an empty state when they have no friends, and a link to the full activity feed.

**Independent Test**: Navigate to `/friends` with an account that has accepted friends → verify each friend's name, avatar, and most recent title+date are visible. Navigate with a fresh account → verify empty state and "Find friends" CTA appear.

- [x] T003 [P] [US1] Create `src/app/(app)/friends/loading.tsx` — skeleton that mirrors the final layout: one full-width bar at top (find-friends area), a section heading placeholder, and 3–4 friend-row skeletons using `div` with `animate-pulse bg-muted` Tailwind classes
- [x] T004 [US1] Create `src/app/(app)/friends/page.tsx` RSC — call `getFriendsData(userId)` and `getRecentActivityPerFriend(friendIds)` from `src/lib/friends-queries.ts`; render:
  - Page title "Friends" (`h1`)
  - Link to `/activity` ("View activity feed →") per FR-012
  - Friends list: each friend as a row with `Avatar`, display name linked to `/profile/[id]`, and most recent activity text ("Watched [title] on [date]" or "No recent activity") per FR-003
  - Empty state (no friends + no requests): short human copy + "Find friends" call-to-action button per FR-013
  - Placeholder slots (pass-through `children` or conditional renders) that T006 and T008 will fill with interactive panels

**Checkpoint**: US1 fully functional — `/friends` shows the friends list server-side with activity snapshots.

---

## Phase 4: User Story 2 — Manage Friend Requests (Priority: P2)

**Goal**: Incoming requests show accept/decline buttons; outgoing requests show a cancel button; accepting immediately moves the sender into the friends list.

**Independent Test**: Send a request from account B to account A. On account A's `/friends` page, verify the incoming request appears with Accept and Decline buttons. Accept → sender moves to friends list. Decline → request disappears.

- [x] T005 [US2] Create `src/components/friend-requests-panel.tsx` — `"use client"` component accepting props `incoming` and `outgoing` (same types as `ApiFriends` in the existing settings component); implement `onAccept`, `onDeleteRequest` handlers calling existing API routes with `fetch` + `router.refresh()`; visually distinguish incoming ("Requests for you") from outgoing ("Pending") sections per FR-005; reuse loading/acting spinner pattern from `src/app/(app)/settings/friends/friends-settings.tsx`
- [x] T006 [US2] Update `src/app/(app)/friends/page.tsx` — import and render `FriendRequestsPanel` above the friends list, passing `data.incoming` and `data.outgoing` as props (data already fetched in T004); show the panel only when at least one request exists per direction

**Checkpoint**: US2 fully functional — users can accept, decline, and cancel requests from `/friends`.

---

## Phase 5: User Story 3 — Find and Add Friends (Priority: P3)

**Goal**: Users can search for people by name/username/email and send a friend request directly from the Friends hub without going to Settings.

**Independent Test**: From `/friends`, type a known user's name into the search box → matching results appear; result for an existing friend shows "Already friends"; result for a pending outgoing request shows "Request sent"; clicking Add on a new result sends the request and updates the result to "Request sent".

- [x] T007 [US3] Create `src/components/find-friends-panel.tsx` — `"use client"` component; debounced search input (250 ms) calling `GET /api/users/search?q=`; dropdown results list (max 8) showing Avatar + name; per-result status: "Add friend" button (default), "Already friends" label (suppressed action), "Request sent" label (suppressed action); on add: `POST /api/friends` + `router.refresh()`; empty-results state "No users found"; extract `useDebounce` hook inline (already exists in `friends-settings.tsx` — copy across); accepts props `friendIds: Set<string>` and `outgoingIds: Set<string>` to compute status without extra fetch
- [x] T008 [US3] Update `src/app/(app)/friends/page.tsx` — import and render `FindFriendsPanel` at the top of the page (above requests panel), passing pre-computed `friendIds` and `outgoingIds` sets derived from `data`; also update the empty-state CTA to scroll/focus the search input

**Checkpoint**: US3 fully functional — full social loop works end-to-end from the Friends hub.

---

## Phase 6: User Story 4 — Settings/Friends Migration (Priority: P4)

**Goal**: `/settings/friends` redirects to `/friends`; the Settings nav no longer shows a "Friends" entry.

**Independent Test**: Navigate directly to `/settings/friends` → verify HTTP redirect to `/friends` with no visible error. Browse Settings → verify no "Friends" entry in the sidebar.

- [x] T009 [P] [US4] Replace the body of `src/app/(app)/settings/friends/page.tsx` with a single `redirect('/friends')` call using `import { redirect } from "next/navigation"` — keep the file so the route remains registered; remove the `metadata` export and `FriendsSettings` import/render
- [x] T010 [P] [US4] Remove `{ href: "/settings/friends", label: "Friends" }` from `generalItems` array in `src/app/(app)/settings/settings-nav.tsx`

**Checkpoint**: US4 fully functional — old URL redirects cleanly, Settings nav is clean.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T011 Create `e2e/friends-hub.spec.ts` — Playwright E2E covering:
  - US1: Navigate to `/friends`, verify friends list renders with activity text, verify link to `/activity` present
  - US1: Empty state — fresh account sees empty-state copy and CTA
  - US2: Accept an incoming friend request from the hub; verify sender moves to friends list
  - US3: Search for a user, send request, verify "Request sent" state
  - US4: Navigate to `/settings/friends`, verify redirect to `/friends`
  - Reuse test helpers from `e2e/` (auth helpers, test user setup)
- [x] T012 Run `yarn lint` on all touched files and fix any new issues; run `yarn ci:check` to confirm lint + format + build + tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (nav ready so the route is reachable during dev)
- **User Story phases (3–6)**: All depend on Foundational (Phase 2) complete
  - US4 (Phase 6) is fully independent — can run in parallel with Phase 3–5
- **Polish (Phase 7)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (lib functions) and T003 (loading skeleton)
- **US2 (P2)**: T005 can start after Phase 2; T006 requires T004 + T005
- **US3 (P3)**: T007 can start after Phase 2; T008 requires T004 + T007
- **US4 (P4)**: Fully independent after Phase 1 — T009 and T010 can run in parallel with Phase 3

### Within Each Story

- Lib functions (T002) before page (T004)
- Loading skeleton (T003) before page (T004) — parallel with T002
- New component (T005, T007) before page integration (T006, T008)
- All story phases before E2E tests (T011)

### Parallel Opportunities

- T001 is a one-liner; do it alone, immediately
- T002 and T003 can run in parallel (different files)
- T005 and T007 can run in parallel (different files) once T004 is done
- T009 and T010 can run in parallel (different files) any time after Phase 1

---

## Parallel Example: US2 + US3 (after T004 complete)

```bash
# Both client panels are independent files — launch simultaneously:
Task: "Create src/components/friend-requests-panel.tsx (T005)"
Task: "Create src/components/find-friends-panel.tsx (T007)"

# Then sequentially integrate:
Task: "Update page.tsx for FriendRequestsPanel (T006)"
Task: "Update page.tsx for FindFriendsPanel (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: T001 (nav link)
2. Complete Phase 2: T002 + T003 (lib + skeleton)
3. Complete Phase 3: T004 (RSC page)
4. **STOP and VALIDATE**: Friends list renders server-side, nav works, link to activity feed visible
5. Ship MVP — the page is useful even without inline request management

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (T003–T004) → Friends list live (MVP)
3. Phase 4 (T005–T006) → Request management inline
4. Phase 5 (T007–T008) → Find friends inline
5. Phase 6 (T009–T010) → Settings cleaned up
6. Phase 7 (T011–T012) → Tests + CI gate

---

## Notes

- `FriendsSettings` in `src/app/(app)/settings/friends/friends-settings.tsx` is **not** deleted — the settings page now redirects so the component becomes dead code, but leave deletion to a future cleanup commit
- The `useDebounce` hook in `find-friends-panel.tsx` is copied from `friends-settings.tsx` — not abstracted into a shared util (no third use case)
- `getRecentActivityPerFriend` silently omits friends with no `WatchEntry` rows; the page renders "No recent activity" for those
- TMDB fetch caching: Next.js deduplicates identical fetches within a render; no explicit cache config needed
