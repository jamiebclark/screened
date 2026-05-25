# Research: First-Class Friends Hub

## Existing infrastructure (no new APIs or schema needed)

### Decision: Reuse all existing API routes as-is

- **Rationale**: Every required server operation already exists — list friends, send/accept/decline/cancel requests, unfriend, search users. No new endpoints.
- **Routes confirmed**:
  - `GET /api/friends` → `{ friends, outgoing, incoming }`
  - `POST /api/friends` → send request (auto-accepts reverse request)
  - `DELETE /api/friends/[userId]` → unfriend
  - `DELETE /api/friends/requests/[requestId]` → cancel / decline
  - `POST /api/friends/requests/[requestId]/accept` → accept
  - `GET /api/users/search?q=` → up to 8 results matched on name, email, Plex username
- **Alternatives considered**: New aggregated endpoint. Rejected — existing routes are fine; activity snapshots are fetched server-side only.

### Decision: No schema changes

- **Rationale**: `Friendship` (normalised with `userLowId`/`userHighId`) and `FriendRequest` models fully cover all read/write operations. `WatchEntry` stores `tmdbId`, `mediaType`, `watchedAt`, `userId` — sufficient for activity snapshots.
- **Alternatives considered**: Adding a `lastActivityAt` denormalised column. Rejected — premature optimisation for the current scale.

---

## Per-friend recent-activity snapshots

### Decision: New `getRecentActivityPerFriend()` in `src/lib/friends-queries.ts`

- **Rationale**: No existing query returns one latest watch event per friend. The nearest function `fetchFriendsRecentWatched` returns distinct titles across all friends, not per-friend. The activity feed (`getFriendActivityFeed`) is a chronological multi-friend stream, not a summary.
- **Implementation**: `groupBy` on `WatchEntry.userId`, `_max: { watchedAt }` gives the latest timestamp per friend; a second query fetches those specific entries with `tmdbId` + `mediaType`. Then `Promise.all` fetches TMDB title name server-side (Next.js fetch caching mitigates repeated lookups).
- **Visibility**: Respects friend's `ProfileContentVisibility` — omit snapshot if friend's content is `FRIENDS` but they haven't granted access (this is already the default, as friendship is confirmed before the hub is rendered).
- **Alternatives considered**: TMDB title stored in DB. Rejected — would require a schema migration and TMDB data is already fetched/cached via Next.js fetch throughout the app.

---

## Page architecture

### Decision: RSC page + two `"use client"` panels

- **Rationale**: Constitution I (Server Components First). The friends list itself has no interactive state — render it server-side. Only two panels need client interactivity:
  - `FriendRequestsPanel`: accept / decline / cancel (POST/DELETE API calls + `router.refresh()`)
  - `FindFriendsPanel`: debounced search input + add action (fetch + state)
- **Existing component reuse**: `FriendsSettings` (settings page) is a single monolithic client component that fetches all data client-side. It is **not** reused — the hub page fetches data server-side and passes it as props to the interactive panels, matching RSC+client mutation pattern.
- **Alternatives considered**: Keep everything client-side like `FriendsSettings`. Rejected — violates Constitution I and means friends list is invisible until JS loads.

---

## Navigation

### Decision: Add "Friends" to main `navLinks` array in `nav.tsx`

- **Icon**: `Users` from Lucide (already available in the project).
- **Position**: After "History" (social content, not utility).
- **Rationale**: Spec FR-002 requires main-nav entry. One-line addition to the `navLinks` array; mobile nav is auto-derived from the same array.

### Decision: Remove "Friends" from `settings-nav.tsx` General section

- **Rationale**: FR-011. Straightforward array item deletion; no other settings depend on it.

---

## Redirect

### Decision: Replace `settings/friends/page.tsx` content with `redirect('/friends')`

- **Rationale**: FR-010. Next.js `redirect()` from `next/navigation` in a Server Component is the idiomatic approach — no client JS needed, produces a 307 by default.
- **Alternatives considered**: Next.js `next.config` redirect rule. Rejected — an in-page redirect keeps the file in the route tree so the Settings nav link removal is the only navigation change needed; a config rule would also work but is less discoverable.

---

## Empty state

### Decision: Show empty-state prompt with "Find friends" inline action when no friends and no pending requests

- **Rationale**: FR-013. The `FindFriendsPanel` is always visible at the top of the page; the empty state below the list just reinforces the CTA.

---

## Testing strategy

### Decision: Playwright E2E only (no new Vitest tests)

- **Rationale**: Constitution V. The new `friends-queries.ts` function is an integration query (Prisma + TMDB fetch) — not a pure function worth unit-testing in isolation. Critical user journeys (view friends list, accept request, find and add) are covered by E2E.
- **Test file**: `e2e/friends-hub.spec.ts` — covers the happy paths for each of the four user stories in the spec.
