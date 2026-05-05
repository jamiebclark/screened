# Feature Specification: Watchlist Sort & Filter

**Feature Branch**: `003-watchlist-sort-filter`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Watchlist Sort & Filter — let users sort and filter their watchlist by added date, release year, runtime, and genre. Streaming service filter is out of scope for now. Sort and filter state should be reflected in URL query params. Data is available via UserMediaStatus.createdAt (added date) and MediaItem (release year, runtime, genres). May want to denormalize releaseYear and runtime onto UserMediaStatus to avoid joins at query time."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sort Watchlist by Field (Priority: P1)

A user visits their watchlist and wants to see titles ordered by a specific criterion — for example, recently added, or by release year. They select a sort option and the list reorders immediately, with the chosen sort preserved in the URL so they can share or return to that view.

**Why this priority**: Sorting is the most universally useful capability; it works against the full watchlist without any filtering. Delivers immediate value as a standalone change.

**Independent Test**: Navigate to the watchlist, change the sort to "Release Year (oldest first)", and confirm the list reorders correctly. Refresh the page and confirm the sort persists via URL query param.

**Acceptance Scenarios**:

1. **Given** a user is on their watchlist, **When** they select "Date Added (newest first)", **Then** the list updates to show the most recently added title first.
2. **Given** a user is on their watchlist, **When** they select "Release Year (oldest first)", **Then** the list updates to show the oldest-released titles first.
3. **Given** a user selects a sort option, **When** they copy the URL and open it in a new tab, **Then** the same sort is applied.
4. **Given** no sort is specified in the URL, **When** the user visits the watchlist, **Then** the list defaults to "Date Added (newest first)".

---

### User Story 2 - Filter Watchlist by Genre (Priority: P2)

A user wants to narrow their watchlist to a specific genre — for example, "only show Horror". They select one or more genres from a filter control and the list updates to show only matching titles. The active filter is reflected in the URL.

**Why this priority**: Genre filtering requires no schema changes and data is available now via MediaItem. Delivers focused discovery without needing to scroll through an entire list.

**Independent Test**: Select "Comedy" from the genre filter and confirm only comedies appear. Then add "Action" and confirm both genres are shown. Clear filters and confirm all titles return.

**Acceptance Scenarios**:

1. **Given** a user selects a single genre filter, **When** the filter is applied, **Then** only titles tagged with that genre are shown.
2. **Given** a user selects multiple genre filters, **When** the filters are applied, **Then** titles matching any of the selected genres are shown (OR logic).
3. **Given** an active genre filter, **When** the user clears it, **Then** the full watchlist is restored.
4. **Given** an active genre filter, **When** the user refreshes the page, **Then** the filter remains active (URL state preserved).
5. **Given** an active genre filter produces no results, **When** the list renders, **Then** an empty state message is shown with an option to clear filters.

---

### User Story 3 - Filter Watchlist by Runtime (Priority: P3)

A user wants to quickly find something short to watch. They set a maximum runtime and the watchlist filters to only show titles within that range.

**Why this priority**: Useful for time-constrained decisions but requires runtime data to be available on watchlist items; less frequently needed than genre.

**Independent Test**: Set a max runtime of 90 minutes and confirm only movies/shows with runtime ≤ 90 minutes appear.

**Acceptance Scenarios**:

1. **Given** a user sets a maximum runtime filter, **When** the filter is applied, **Then** only titles with a runtime at or below the threshold are shown.
2. **Given** a title has no runtime data, **When** a runtime filter is active, **Then** the title is excluded from results (assume it does not match the filter).
3. **Given** a runtime filter is active, **When** the user removes it, **Then** all titles (regardless of runtime) are shown again.

---

### User Story 4 - Filter Watchlist by Release Year Range (Priority: P3)

A user wants to find older classics or recent releases on their watchlist. They set a year range (e.g., 1980–2000) and the list filters accordingly.

**Why this priority**: Useful for decade-browsing but can be addressed after sort and genre filter are in place.

**Independent Test**: Set year range 1990–1999 and confirm only titles released in that decade appear.

**Acceptance Scenarios**:

1. **Given** a user sets a release year range, **When** the filter is applied, **Then** only titles with a release year within that range are shown.
2. **Given** only a start year is set, **When** the filter is applied, **Then** titles released in that year or later are shown.
3. **Given** only an end year is set, **When** the filter is applied, **Then** titles released in that year or earlier are shown.

---

### Edge Cases

- What happens when a filter combination produces zero results? → Show a clear empty state with "No titles match your filters" and a "Clear filters" action.
- What happens when a title has no genre data? → It is excluded from genre filter results; it still appears when no genre filter is active.
- What happens when a title has no runtime data? → It is excluded when a runtime filter is active; it appears normally when no runtime filter is set.
- What happens when a title has no release year? → It is excluded when a year range filter is active; it appears normally otherwise.
- What happens when URL query params contain invalid values (e.g., `sort=banana`)? → Fall back to the default sort/filter without error.
- Can sort and filter be combined? → Yes; all active sort and filter controls compose together.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to sort their watchlist by: Date Added (newest/oldest first), Release Year (newest/oldest first), Runtime (shortest/longest first), and Title (A–Z / Z–A).
- **FR-002**: Users MUST be able to filter their watchlist by one or more genres (OR logic — title appears if it matches any selected genre).
- **FR-003**: Users MUST be able to filter their watchlist by a runtime range (max runtime in minutes).
- **FR-004**: Users MUST be able to filter their watchlist by a release year range (start year, end year, or both).
- **FR-005**: All active sort and filter state MUST be encoded in URL query params so the view is shareable and survives page refresh.
- **FR-006**: Sort and filter controls MUST be combinable — any active sort applies on top of any active filters.
- **FR-007**: When no filters are active, the full watchlist MUST be shown.
- **FR-008**: When filters are active and produce no results, the UI MUST show a non-empty state message and a control to clear all filters.
- **FR-009**: Streaming service filter is explicitly out of scope for this feature.
- **FR-010**: Genre options presented in the filter control MUST reflect only genres that appear on titles currently in the user's watchlist (no phantom options).

### Key Entities

- **UserMediaStatus**: Tracks a user's watchlist status for a title; includes `createdAt` (added date) and a FK to `MediaItem`.
- **MediaItem**: Stores title metadata including genres (array), runtime (minutes), and release year. The `releaseYear` and `runtime` fields may need to be denormalized onto `UserMediaStatus` to avoid join overhead at query time — this is an implementation decision.
- **Sort State**: The active sort field and direction, encoded as a URL query param (e.g., `sort=addedAt_desc`).
- **Filter State**: The set of active genre slugs, optional max runtime, and optional year range — encoded as URL query params.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can apply a sort or filter and see the updated watchlist without a full page reload.
- **SC-002**: Sort and filter state survives a page refresh — copying the URL to a new tab produces an identical view.
- **SC-003**: All sort and filter operations complete and render within 2 seconds on a watchlist of 500+ titles.
- **SC-004**: Applying a genre filter reduces the visible list to only matching titles with 100% accuracy (no false positives or false negatives).
- **SC-005**: An empty filter result always presents a "Clear filters" affordance so users are never stuck in a dead-end view.

## Assumptions

- The watchlist page (`/watchlist`) already exists and renders a list of `UserMediaStatus` records for the authenticated user.
- Genre, runtime, and release year data are already present on `MediaItem` records for most titles (populated by the existing TMDB enrichment pipeline).
- Streaming service / watch-provider filtering is deferred to a future feature once provider data is stored.
- Multi-select genre filtering uses OR logic (a title matches if it belongs to any selected genre), not AND.
- Runtime filter uses a single max-value slider or input; an explicit min runtime is not needed for v1.
- Release year range allows setting just a start year, just an end year, or both.
- Titles missing data for an active filter field (no genre, no runtime, no year) are excluded from filtered results rather than shown as "unknown."
- Default sort order (when none is specified) is "Date Added — newest first," matching the current implicit ordering.
- URL query param keys: `sort` (e.g., `addedAt_desc`), `genres` (comma-separated slugs), `maxRuntime` (integer minutes), `yearFrom` (integer), `yearTo` (integer).
