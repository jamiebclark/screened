# Feature Specification: Genre-Linked Browse & Discover Page

**Feature Branch**: `005-genre-browse-discover`
**Created**: 2026-05-17
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Clickable Genre Tags on Detail Pages (Priority: P1)

A user viewing a movie or TV show detail page sees the genre badges (e.g., "Action", "Drama") as clickable links. Tapping one takes them to the Browse page pre-filtered to that genre and media type.

**Why this priority**: This is the entry point into the discovery flow and delivers immediate value on pages users already visit frequently.

**Independent Test**: Can be fully tested by navigating to any movie or TV detail page, clicking a genre badge, and verifying the Browse page opens with that genre pre-selected.

**Acceptance Scenarios**:

1. **Given** a movie detail page, **When** a user clicks a genre badge, **Then** they are taken to the Browse page with that genre and "Movies" pre-selected.
2. **Given** a TV show detail page, **When** a user clicks a genre badge, **Then** they are taken to the Browse page with that genre and "TV Shows" pre-selected.
3. **Given** a list item modal showing a movie or TV show, **When** a user clicks a genre badge, **Then** they are taken to the Browse page with the correct genre and media type pre-selected.
4. **Given** a title with no genres listed, **Then** no genre badges are rendered (no broken links).

---

### User Story 2 — Browse Page with Genre & Type Filtering (Priority: P1)

A user navigates to the Browse page (directly or via a genre link) and sees a grid of titles filtered by the selected genre and media type. They can change the genre or type using filter controls.

**Why this priority**: Core page of the feature; no downstream filters are useful without this working.

**Independent Test**: Can be fully tested by visiting `/browse` directly, selecting a genre and media type, and verifying the result grid updates accordingly.

**Acceptance Scenarios**:

1. **Given** the Browse page, **When** a user selects a genre, **Then** the grid refreshes to show titles matching that genre.
2. **Given** the Browse page, **When** a user switches between "Movies", "TV Shows", and "All", **Then** the results update to reflect the selected type and the available genre list updates to match.
3. **Given** the Browse page with a genre pre-selected via URL, **When** the page loads, **Then** the correct genre pill is highlighted and the grid shows filtered results.
4. **Given** a genre with no results, **Then** an appropriate empty state is shown.

---

### User Story 3 — Seen/Unseen Filter (Priority: P2)

A logged-in user can filter Browse results to show only titles they have already seen, or only titles they have not yet seen (not in their Watched list).

**Why this priority**: High-value filter for discovery — users most commonly want to find things they haven't seen yet.

**Independent Test**: Can be fully tested by a logged-in user applying the "Not Seen" filter and verifying no titles from their Watched list appear in the results.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they select "Not Seen", **Then** results exclude any titles with a Watched status in their library.
2. **Given** a logged-in user, **When** they select "Seen", **Then** results show only titles they have marked as Watched.
3. **Given** a logged-out user, **Then** the seen/unseen filter is not shown.
4. **Given** a result grid with the "Not Seen" filter active, **Then** each visible card still shows the user's watch status indicator if applicable (e.g., a title on their Watchlist but not yet Watched remains visible).

---

### User Story 4 — In-Library & Friends' Library Filter (Priority: P3)

A logged-in user can filter Browse results to show only titles that are in their own tracked library, or only titles tracked by their friends (users they follow with a mutually accepted friend connection).

**Why this priority**: Useful for social discovery, but depends on a user having accepted friend connections; lower priority than core filtering.

**Independent Test**: Can be fully tested by a user who has at least one accepted friend applying the "Friends' Library" filter and verifying only titles tracked by those friends appear.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they select "In My Library", **Then** results show only titles they have any tracking status for (Watchlist, Watching, Watched, or Dropped).
2. **Given** a logged-in user with accepted friends, **When** they select "Friends' Library", **Then** results show only titles tracked by at least one of their accepted friends.
3. **Given** a logged-in user with no accepted friends, **When** "Friends' Library" is selected, **Then** an appropriate empty state is shown explaining they have no friends connected yet.
4. **Given** a logged-out user, **Then** library filters are not shown.

---

### Edge Cases

- What happens when TMDB discover returns no results for a genre/type combination? → Show an empty state with a prompt to adjust filters.
- What happens if a user applies "Not Seen" and "Friends' Library" together? → Show titles in friends' libraries that the user has not seen.
- What if TMDB's genre list differs between movies and TV? → Genre pills should update when the media type changes to only show valid genres for that type.
- What happens when a user is not logged in and visits a genre link from a detail page? → Browse page loads with genre/type filter applied; seen and library filters are hidden.
- What if a title appears in TMDB discover results but has no poster? → Render a placeholder card consistent with the rest of the app.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Genre badges on movie detail pages MUST be rendered as links that navigate to the Browse page with the correct genre and "movie" type pre-selected.
- **FR-002**: Genre badges on TV show detail pages MUST be rendered as links that navigate to the Browse page with the correct genre and "tv" type pre-selected.
- **FR-003**: Genre badges in list item modals (for both movies and TV shows) MUST be rendered as links that navigate to the Browse page with the correct genre and media type pre-selected.
- **FR-004**: The Browse page MUST be accessible at `/browse` and accept `genre`, `type`, and filter parameters via URL query string, enabling shareable/bookmarkable filtered views.
- **FR-005**: The Browse page MUST display a list of genre filter pills that update based on the selected media type (movies vs. TV shows have different genre sets).
- **FR-006**: The Browse page MUST display a media type toggle: "All", "Movies", "TV Shows".
- **FR-007**: The Browse page MUST fetch results from the external media catalogue's discover API using the selected genre and type.
- **FR-008**: The Browse page MUST display results in a poster grid consistent with the rest of the app's media card presentation.
- **FR-009**: Each result card on the Browse page MUST display the logged-in user's watch status overlay (same as the existing search results page).
- **FR-010**: The Browse page MUST support a "Seen" / "Not Seen" filter for logged-in users, which post-filters the current page of results against the user's watch history.
- **FR-011**: The Browse page MUST support an "In My Library" filter for logged-in users, which shows only titles the user has any tracking status for.
- **FR-012**: The Browse page MUST support a "Friends' Library" filter for logged-in users, which shows only titles tracked by their accepted friends (users with whom the logged-in user has a mutually accepted friend connection).
- **FR-013**: The Browse page MUST support pagination or infinite scroll to load additional results beyond the first page.
- **FR-014**: Filter state MUST be reflected in the URL so that filtered views can be shared or bookmarked.
- **FR-015**: The existing "Home" and "Search" links in the title page top navigation MUST be removed, as they are redundant with the global navigation.

### Key Entities

- **Genre**: A content classification (e.g., "Action", "Drama") with an ID and name, sourced from the external media catalogue. Genres differ between movies and TV shows.
- **BrowseFilter**: The combination of selected genre, media type, seen status, and library scope that defines a filtered view on the Browse page.
- **MediaStatus**: A user's tracked state for a title (Watchlist / Watching / Watched / Dropped), used to evaluate seen/unseen and library filters.
- **Friendship**: A mutually accepted connection between two users, established when one user sends a friend request and the other accepts. Defines the "friends" scope for the Friends' Library filter.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can navigate from a genre badge on a detail page to a filtered Browse page in one click with no additional interaction required.
- **SC-002**: The Browse page displays a non-empty result grid within a reasonable time after any filter change, without requiring a full page reload.
- **SC-003**: All filter combinations (genre + type + seen/unseen + library scope) produce correct, consistent results with no titles shown that violate the active filters.
- **SC-004**: Filter state is preserved in the URL such that copying and opening the URL in a new tab produces an identical filtered view.
- **SC-005**: The seen/unseen and library filters correctly exclude or include titles based on the user's actual tracked data with no false positives.

## Assumptions

- The external media catalogue (TMDB) provides a stable genre list per media type and a discover endpoint that accepts genre IDs; these are used as the data source for Browse.
- "Friends" are defined as users with whom the logged-in user has a mutually accepted friend connection (the logged-in user sent a request that was accepted, or received and accepted a request). The app already has a first-class friendship model supporting this.
- The seen/unseen and library filters operate as a post-filter on the current page of discover results, not as a server-side database-first query. This means filtered result counts per page may be lower than the page size when filters are active.
- Pagination will use TMDB's page-based API (not cursor-based), and each page is fetched on demand.
- The genre badges in list item modals refer to the existing item detail modals on list pages (e.g., the modal that opens when clicking a list item card).
- Mobile support is in scope; the filter controls should be usable on small screens.
- The Browse page is available to both logged-in and logged-out users; seen/library filters are only shown to logged-in users.
