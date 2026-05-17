# Research: Genre-Linked Browse & Discover Page

## TMDB API Capabilities

**Decision**: Use TMDB `/genre/movie/list`, `/genre/tv/list`, `/discover/movie`, and `/discover/tv` endpoints.

**Rationale**: TMDB's discover API supports filtering by `with_genres` (genre ID), `sort_by`, and `page`. Genre lists are stable and can be cached for 24 hours. The existing `tmdbFetch` helper in `src/lib/tmdb.ts` handles auth, retries, and Next.js ISR caching — all four new functions will use it.

**Alternatives considered**: Using the existing `searchMulti` for genre discovery was rejected because it requires a text query and doesn't support genre-ID filtering.

---

## Genre ID Availability in List Item Modal

**Decision**: List item modal genres are stored as `String[]` (names only, no IDs) in the `MediaItem` DB model. Accept `?genreName=<name>` in the Browse URL in addition to `?genre=<id>`. The Browse page fetches the genre list server-side and resolves the name to an ID when `genreName` is provided.

**Rationale**: Avoids a schema migration. TMDB's movie genre list has ~19 entries and TV has ~16 — small enough to fetch and scan on every Browse page load (cached 24h). No user-visible difference.

**Alternatives considered**: Migrating `MediaItem.genres` from `String[]` to `Json` storing `{id, name}[]` was considered but deferred — it would require a migration + backfill of all existing records and is out of scope for this feature.

---

## Watch Status Overlay on Browse Results

**Decision**: Reuse `getUserTmdbMediaStateByRef` from `src/lib/tmdb-user-media-state.ts`.

**Rationale**: Already used on the search page for identical purpose — batch-loads watch status + list membership for a mixed movie/TV result set in one query. Returns a `Map<string, { status, onList }>` keyed by `"movie:123"` / `"tv:456"`.

---

## Friends Definition

**Decision**: "Friends" = users with an accepted `Friendship` record (either `userLowId` or `userHighId` equals the current user). Use existing `listFriendUserIds(userId)` from `src/lib/friendship.ts`.

**Rationale**: The app already has a first-class friendship model with `FriendRequest` (pending) and `Friendship` (accepted). `listFriendUserIds` queries both directions of the normalized table.

---

## Library/Seen Filters — Post-Filter Approach

**Decision**: All user-specific filters (seen, unseen, in-library, friends-library) post-filter the current TMDB discover page rather than doing DB-first queries.

**Rationale**: TMDB discover results cannot be DB-queried first (no endpoint accepts a list of allowed tmdbIds). Filtering ~20 results/page against user's tracked tmdbIds is fast. Filtered pages may have fewer than 20 visible results — acceptable for P2/P3 features, and the user can paginate to find more.

---

## "All" Type Handling

**Decision**: When type is `all` (or unset), show trending content (movies + TV mixed) via the existing `getTrending("all", "week")` function. Genre filter is disabled when type is `all` since movie and TV genres are different lists. Selecting a genre automatically sets type to `movie`.

**Rationale**: TMDB has no single "discover all" endpoint. Merging two paginated streams is complex and out of scope. Trending "all" gives a useful default view.

---

## TitlePageTopNav Removal

**Decision**: Delete `src/components/title-page-top-nav.tsx` and remove its usage from movie and TV detail pages.

**Rationale**: The component renders only "Search" and "Home" links that duplicate the global sidebar nav. With genre badges becoming navigational links, the nav bar adds no value.

---

## Pagination

**Decision**: Page-number based pagination using TMDB's `page` param. Show "Load more" button that appends `?page=N` to the URL (server-rendered next page).

**Rationale**: TMDB uses 1-indexed pages up to 500. Simple page param keeps URL shareable. Infinite scroll is deferred.
