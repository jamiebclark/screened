# Feature Specification: Browse Sort & Filter

**Feature Branch**: `006-browse-sort-filter`
**Created**: 2026-05-17
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Filter by Genre Combination (Priority: P1)

A user browsing the discover section wants to find horror-comedy films. They select both "Horror" and "Comedy" from the genre filter. The results update to show only titles tagged with both genres.

**Why this priority**: Genre filtering is the most common browse refinement action. Multi-genre AND logic is the highest-value expansion over the existing single-genre filter.

**Independent Test**: Can be fully tested by selecting two genres on any browse tab and verifying results contain both genre labels on every returned title.

**Acceptance Scenarios**:

1. **Given** the user is on /browse with no filters active, **When** they select "Horror" and "Comedy" as genre filters, **Then** only titles that have both genres appear in results.
2. **Given** one genre is selected, **When** the user removes it, **Then** results return to the broader single-genre (or unfiltered) set.
3. **Given** a combination of genres that returns zero results, **When** the filters are applied, **Then** an empty state is shown with a prompt to adjust filters.
4. **Given** the user is on a local-library tab (library/seen/friends), **When** they apply a two-genre filter, **Then** only locally tracked titles matching both genres appear.

---

### User Story 2 — Sort Results (Priority: P1)

A user wants to surface the highest-rated titles in a genre. They set the sort order to "Rating: High to Low." On discovery tabs, results are ordered by community rating; on library tabs, by their own personal rating.

**Why this priority**: Sorting dramatically changes the utility of browse for users with specific taste signals. It is independent of filtering and delivers immediate value on its own.

**Independent Test**: Can be tested by switching sort order on any browse tab and verifying first-page results change ordering accordingly.

**Acceptance Scenarios**:

1. **Given** the user is on a TMDB-backed tab (unseen/unfiltered), **When** they select "Rating: High to Low," **Then** results are ordered by community score, highest first.
2. **Given** the user is on a library tab, **When** they select "Rating: High to Low," **Then** results are ordered by the user's personal rating, highest first.
3. **Given** the user selects "Year: Newest First," **Then** results are ordered by release year descending regardless of tab type.
4. **Given** the user selects "Year: Oldest First," **Then** results are ordered by release year ascending.
5. **Given** no explicit sort is chosen on a TMDB discovery tab, **Then** results default to popularity order (preserving current browse behavior). **Given** no explicit sort is chosen on a library tab, **Then** results default to Title A–Z.

---

### User Story 3 — Filter by Year Range (Priority: P2)

A user only wants to browse films released between 1970 and 1990. They set a minimum year of 1970 and a maximum year of 1990. Results update to exclude anything outside that range.

**Why this priority**: Year range is a common refinement for users exploring a specific era. Lower than genre/sort because it's less frequently the primary entry point.

**Independent Test**: Can be tested independently by setting min/max year and verifying no returned title has a release year outside the range.

**Acceptance Scenarios**:

1. **Given** the user sets min year 1970 and max year 1990, **When** results load, **Then** every title shown has a release year between 1970 and 1990 inclusive.
2. **Given** only a minimum year is set, **When** results load, **Then** all titles are from that year or later.
3. **Given** only a maximum year is set, **When** results load, **Then** all titles are from that year or earlier.
4. **Given** min year is greater than max year, **Then** an inline validation error prevents the filter from being applied.

---

### User Story 4 — Filter by Person (Include/Exclude) (Priority: P2)

A user wants to find films directed by Denis Villeneuve. They type "Villeneuve" in the "Include person" field, select him from the suggestions, and results update to show only his films. Separately, a user wants to exclude all Adam Sandler films from their browsing.

**Why this priority**: Person filtering is high-value for taste-driven users, but involves an extra lookup step (person search) that makes it more complex than the other filters.

**Independent Test**: Can be tested by typing a well-known director's name, selecting them, and verifying all results include their credit; and separately by excluding an actor and verifying no returned title lists them.

**Acceptance Scenarios**:

1. **Given** the user types a name in the "Include person" search field, **When** they pause typing, **Then** up to 8 person suggestions appear (with role/known-for context).
2. **Given** the user selects a person to include, **When** results load, **Then** every title lists that person in its credits.
3. **Given** the user adds a person to the "Exclude" list, **When** results load, **Then** no title lists that person in its credits.
4. **Given** multiple people are included, **Then** results must feature ALL of them (AND logic).
5. **Given** the user is on a TMDB-backed tab, **Then** person filtering uses TMDB person IDs via native discover params.
6. **Given** the user is on a library tab, **Then** person filtering uses substring matching against stored cast and director fields.

---

### Edge Cases

- What happens when filters produce zero results on a paginated TMDB path? → Show empty state; don't show a partial page.
- How does sort interact with the "unseen" filter that post-filters TMDB results? → Sort is applied before post-filtering; page sizes may be smaller than expected and should degrade gracefully.
- What if a person name matches no results from the search API? → Show a "no matches found" message inline; do not add the person to the filter.
- What if a user clears all filters? → State resets to the current tab's default (popularity-sorted discovery or unfiltered library).
- What about the "all" (trending) tab? → Trending uses a different endpoint that does not support discovery params; sort/filter controls should be hidden or disabled on that tab.

---

## Requirements _(mandatory)_

### Functional Requirements

**Genre Filtering**

- **FR-001**: Users MUST be able to select zero or more genres from the existing genre list as an inclusive filter.
- **FR-002**: When multiple genres are selected, the system MUST return only titles that match ALL selected genres (AND logic).
- **FR-003**: Selecting a genre that is already active MUST deselect it (toggle behavior).

**Sort Order**

- **FR-004**: Users MUST be able to sort results by: Popularity (implicit default on TMDB discovery tabs, matching current browse behavior), Title A–Z (default on library tabs), Year Newest First, Year Oldest First, Rating High to Low, Rating Low to High.
- **FR-005**: On TMDB-backed tabs, "Rating" MUST reflect community score (TMDB vote_average).
- **FR-006**: On local library tabs, "Rating" MUST reflect the authenticated user's personal rating for each title.
- **FR-007**: All active filter and sort state (genres, year range, included/excluded people, sort order) MUST persist when the user switches between browse tabs.

**Year Range**

- **FR-008**: Users MUST be able to set an optional minimum release year.
- **FR-009**: Users MUST be able to set an optional maximum release year.
- **FR-010**: The system MUST reject and surface an error when min year exceeds max year.
- **FR-011**: Year inputs MUST accept four-digit years only.

**Person Filtering**

- **FR-012**: Users MUST be able to search for and add up to 5 people (actors or directors) to an include list via an inline tag-input search field in the filter panel.
- **FR-013**: Users MUST be able to search for and add up to 5 people to an exclude list via the same tag-input pattern. Include and exclude lists are independent; each has its own 5-person cap.
- **FR-014**: Titles in the include list MUST all appear in a title's credits for it to be shown (AND logic across multiple includes).
- **FR-015**: A title featuring ANY person on the exclude list MUST be hidden from results.
- **FR-016**: Person search suggestions MUST appear after the user types at least 2 characters.

**General**

- **FR-017**: All active filters and current sort MUST be reflected in the page URL as query parameters so results are shareable and bookmarkable.
- **FR-018**: A visible "Clear filters" control MUST reset all filters and sort to defaults.
- **FR-019**: Filters MUST be hidden or disabled on the "all" (trending) tab, which does not support parameterized discovery.
- **FR-020**: Filter controls MUST be housed in a collapsible panel positioned above the result grid. The panel expands and collapses in place without opening an overlay or shifting the results area via a sidebar.

### Key Entities

- **BrowseFilter**: The combined filter state — selected genre IDs, min/max year, included people, excluded people.
- **BrowseSortOrder**: The active sort selection (title, year_asc, year_desc, rating_desc, rating_asc).
- **Person**: A person result from search — name, TMDB person ID, known-for role (actor/director).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can apply any combination of filters and receive correctly filtered results without a full page reload.
- **SC-002**: Genre + sort filters on TMDB discovery paths return results within the same response time as the unfiltered browse experience.
- **SC-003**: Multi-genre AND filtering returns only titles that have all selected genres — zero false positives on the first three result pages.
- **SC-004**: Person include/exclude filters produce accurate results: every included person appears in credits of all shown titles, and no excluded person appears in credits of any shown title.
- **SC-005**: All active filter and sort state is preserved in the URL and correctly restored when the URL is shared or revisited.
- **SC-006**: The "Clear filters" action returns the browse view to its default state in a single interaction.

---

## Clarifications

### Session 2026-05-17

- Q: What should the sort default be when no explicit sort is chosen? → A: Popularity is the implicit default on TMDB discovery tabs (preserving current browse behavior); Title A–Z is the default on library tabs.
- Q: What UI pattern should contain the filter and sort controls? → A: Collapsible filter bar above results — an inline panel that expands/collapses in place above the result grid.
- Q: When a user switches browse tabs, what happens to active genre/year/person filters? → A: All filter and sort state persists across tab switches.
- Q: Should there be a maximum number of people per include/exclude list? → A: Cap at 5 per list. People are added inline via a tag-input search field (type name → select from suggestions → chip appears), same pattern as Picker. Each list (include and exclude) has its own independent 5-person cap on the live filter state.

---

## Assumptions

- The "all" (trending) tab will not support sort/filter in this feature; controls are hidden on that tab.
- Person filtering on local library paths will use substring matching (case-insensitive), accepting partial names (e.g., "Nolan" matches "Christopher Nolan"). Exact-match is not required.
- Multiple included people use AND logic; this may produce very small or empty result sets on library tabs with few entries — this is acceptable and handled by an empty state.
- Sort by rating on library tabs uses the user's own 1–5 star rating. Titles with no rating are sorted last.
- The existing single-genre URL parameter (`?genre=<id>`) will be replaced or extended to support multi-genre (`?genres=<id1>,<id2>`). A redirect or fallback will handle old single-genre URLs.
- Year inputs will not include a date picker — plain numeric text fields are sufficient.
- Person search reuses the existing `/api/search/person` endpoint already used by Picker.
- Pagination resets to page 1 whenever any filter or sort value changes.
- No new Prisma schema changes are required; all needed fields (`cast`, `directors`, `genres`, `year`, rating) already exist.
