# Feature Specification: Stats Dashboard

**Feature Branch**: `002-stats-dashboard`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Stats Dashboard — deep watch statistics page showing time watched, genre and decade breakdowns, ratings histogram, and most-watched directors/actors. New /stats route, server-side aggregate queries in src/lib/, stat card + chart components. No new schema required — uses WatchEntry, UserMediaStatus, MediaItem (cast, director, genres, runtime)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Total Watch Time (Priority: P1)

A user navigates to `/stats` and immediately sees a summary of how much time they've spent watching content — total hours watched, number of titles watched, and average rating given. This gives an instant sense of their watch history at a glance.

**Why this priority**: The most universally engaging stat; delivers immediate value with the simplest query (sum of runtimes from WatchEntry joined to MediaItem).

**Independent Test**: Can be fully tested by visiting `/stats` with watch history present and verifying that total hours, title count, and average rating display correctly and match manual calculations from the underlying data.

**Acceptance Scenarios**:

1. **Given** a user with watch history, **When** they navigate to `/stats`, **Then** they see total hours watched, total titles watched, and their average rating.
2. **Given** a user with no watch history, **When** they navigate to `/stats`, **Then** they see an empty-state message inviting them to start tracking.
3. **Given** a user with watch history that has missing runtime data for some titles, **When** stats load, **Then** time calculation excludes those titles gracefully and does not crash.

---

### User Story 2 - Explore Genre & Decade Breakdowns (Priority: P2)

A user browses breakdowns of their watch history by genre and by release decade to understand their viewing patterns — e.g., "I watch mostly Drama and Sci-Fi" or "Most of what I watch is from the 2000s and 2010s."

**Why this priority**: High-interest stat that reveals patterns users don't consciously track; straightforward to compute from existing MediaItem genre and release year data.

**Independent Test**: Can be fully tested by verifying the genre chart and decade chart each display correct counts/percentages matching a manual count of the user's watched titles per genre and decade.

**Acceptance Scenarios**:

1. **Given** a user with watched titles spanning multiple genres, **When** they view the genre breakdown, **Then** genres are shown ranked by count, with the top genres most prominent.
2. **Given** a user with watched titles spanning multiple decades, **When** they view the decade breakdown, **Then** decades are shown in chronological order with counts per decade.
3. **Given** a title tagged with multiple genres, **When** stats are calculated, **Then** it counts toward each of its genres.
4. **Given** a title with an unknown release year, **When** stats are calculated, **Then** it is excluded from the decade breakdown without error.

---

### User Story 3 - View Ratings Histogram (Priority: P3)

A user sees a histogram of how they've distributed their ratings (e.g., how many 1-star, 2-star, … 5-star ratings they've given), revealing whether they tend to rate generously or critically.

**Why this priority**: Adds personality to the stats page; quick to implement as a count-by-rating aggregation over `UserMediaStatus`.

**Independent Test**: Can be fully tested by verifying each rating bucket count matches a manual count of `UserMediaStatus` rows with that rating for the user.

**Acceptance Scenarios**:

1. **Given** a user who has rated titles, **When** they view the ratings histogram, **Then** each rating value (e.g., 0.5–5.0) shows how many titles received that rating.
2. **Given** a user with no ratings recorded, **When** they view the ratings histogram, **Then** a message is shown indicating no ratings yet.
3. **Given** a user who has watched titles without rating them, **When** viewing the histogram, **Then** unrated titles are excluded from the histogram (not counted as zero).

---

### User Story 4 - Discover Most-Watched Directors & Actors (Priority: P4)

A user sees ranked lists of the directors and actors who appear most frequently in their watch history, helping them discover preferences they may not have consciously noticed.

**Why this priority**: Highest data-richness stat; depends on cast/crew data being populated on MediaItem. Useful but slightly lower priority than the time and genre views since it requires richer data quality.

**Independent Test**: Can be fully tested by verifying the top-N directors and actors lists match a manual tally of crew appearances across the user's watched titles.

**Acceptance Scenarios**:

1. **Given** a user with watched movies/shows that have director and cast data, **When** they view the stats page, **Then** they see a ranked list of most-watched directors (top 10) and most-watched actors (top 10).
2. **Given** a title with no cast/director data, **When** stats are computed, **Then** that title is excluded from person rankings without error.
3. **Given** a director who directed multiple titles the user watched, **When** viewing the director list, **Then** that director's count reflects all watched titles they directed.

---

### Edge Cases

- What happens when a user has no watch history at all? → Empty state shown with prompt to start tracking; no errors.
- What happens when MediaItem is missing runtime for some titles? → Those titles are excluded from time calculations; other stats are unaffected.
- What happens when a title has no genre or release year? → Excluded from genre/decade breakdown; total watch count is unaffected.
- What happens when cast/crew data is absent for all titles? → Director and actor sections show an appropriate empty state.
- What happens with very large watch histories (1000+ titles)? → Page should load within acceptable time; queries must be aggregated server-side, not loaded into memory on the client.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a dedicated stats page accessible to authenticated users at `/stats`.
- **FR-002**: System MUST show total hours watched, calculated from the sum of runtimes for all watched titles.
- **FR-003**: System MUST show total number of distinct titles watched (movies and TV shows combined).
- **FR-004**: System MUST show the user's average rating across all rated titles.
- **FR-005**: System MUST show a breakdown of watched titles by genre, ranked by frequency.
- **FR-006**: System MUST show a breakdown of watched titles by release decade, ordered chronologically.
- **FR-007**: System MUST show a histogram of the user's rating distribution across all rating values.
- **FR-008**: System MUST show a ranked list of the top 10 most-watched directors.
- **FR-009**: System MUST show a ranked list of the top 10 most-watched actors/cast members.
- **FR-010**: System MUST show an empty state with a helpful message when no watch history exists.
- **FR-011**: System MUST handle missing runtime, genre, release year, and cast/crew data gracefully without errors.
- **FR-012**: All stats MUST be scoped to the authenticated user's own data only.
- **FR-013**: Stats page MUST be protected by authentication; unauthenticated access returns a redirect to login.

### Key Entities _(include if feature involves data)_

- **WatchEntry**: Records individual watch events; provides the source data for "has been watched" and watch timestamps. Each entry links to a MediaItem.
- **UserMediaStatus**: Stores per-user tracking status and rating for a title. Provides rating data for the histogram and average rating.
- **MediaItem**: The canonical title record. Provides runtime (for time calculation), genres (for genre breakdown), release year (for decade breakdown), and cast/crew (for person rankings).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user with watch history can land on the stats page and see all summary stats within 3 seconds on a standard connection.
- **SC-002**: Genre and decade breakdowns correctly reflect 100% of a user's watched titles that have the relevant metadata.
- **SC-003**: Director and actor rankings correctly reflect all appearances across a user's watched titles.
- **SC-004**: The page renders a useful, non-error state for users with no watch history.
- **SC-005**: Stats are accurate — totals, breakdowns, and rankings match what a manual audit of the user's watch data would produce.

## Assumptions

- All stats are per-user and scoped to the currently logged-in user; no cross-user or aggregate views are in scope for v1.
- "Watched" means a title has at least one `WatchEntry` record (source: PLEX, LETTERBOXD, or MANUAL); titles that are only on the watchlist but not yet watched are excluded from all stats.
- Runtime data comes from `MediaItem.runtime`; if it is null or zero, the title is excluded from the time total.
- Genre data comes from `MediaItem.genres` (array); a title with multiple genres counts toward each genre.
- Release decade is derived from `MediaItem.releaseYear`; titles with no release year are excluded from the decade chart.
- Cast and crew data comes from existing fields on `MediaItem`; no new TMDB API calls are required to compute person rankings.
- TV shows are included in all stats on a per-title basis (not per-episode); episode count and episode-level runtime aggregation are out of scope for v1.
- No new database schema changes are required; all queries run against existing tables.
- Charts and visualizations are rendered using existing UI primitives available in the project; no new charting library is assumed.
