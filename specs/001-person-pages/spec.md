# Feature Specification: Person/Cast/Crew Detail Pages

**Feature Branch**: `001-person-pages`  
**Created**: 2026-05-03  
**Status**: Draft  
**Input**: User description: "Add person/cast/crew detail pages with filmography filtered to user's libraries, display cast and crew on title pages, and enable browsing by people"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Cast and Crew on Title Pages (Priority: P1)

When viewing a movie or TV show page, users see the cast and director information prominently displayed. This allows users to quickly identify who stars in or directed the content they're viewing.

**Why this priority**: This is the foundation of the feature - users cannot discover people of interest without first seeing them displayed on title pages. It's the entry point to the entire feature.

**Independent Test**: Can be fully tested by navigating to any movie or TV page and verifying that cast members and director are displayed with names visible. Delivers immediate value by showing who's in the content.

**Acceptance Scenarios**:

1. **Given** a user is viewing a movie page, **When** the page loads, **Then** the director name is displayed prominently
2. **Given** a user is viewing a movie page, **When** the page loads, **Then** up to 8 cast members are displayed in billing order
3. **Given** a user is viewing a TV show page, **When** the page loads, **Then** the creator/series director name is displayed prominently
4. **Given** a user is viewing a TV show page, **When** the page loads, **Then** up to 8 cast members are displayed in billing order
5. **Given** a movie or TV page has cast/crew information, **When** displayed, **Then** profile photos from TMDB are shown when available

---

### User Story 2 - Navigate to Person Detail Pages (Priority: P1)

Users can click on any cast member or director name to navigate to a dedicated person detail page. This page shows the person's profile information and basic details from TMDB.

**Why this priority**: This is the second core piece - without clickable links to person pages, users cannot explore further. This must work immediately after P1 to provide a complete browsing experience.

**Independent Test**: Can be tested by clicking on any person name on a title page and verifying navigation to a person detail page with profile information. Delivers value by enabling person-focused browsing.

**Acceptance Scenarios**:

1. **Given** a user is viewing a title page with cast displayed, **When** they click on a cast member's name, **Then** they are taken to that person's detail page
2. **Given** a user is viewing a title page with a director displayed, **When** they click on the director's name, **Then** they are taken to that director's detail page
3. **Given** a user is on a person detail page, **When** the page loads, **Then** the person's name is displayed as the page title
4. **Given** a person has a profile photo on TMDB, **When** viewing their detail page, **Then** the profile photo is displayed prominently
5. **Given** a person has a "known for" department on TMDB, **When** viewing their detail page, **Then** this information is displayed (e.g., "Acting", "Directing")

---

### User Story 3 - View Person's Library Filmography (Priority: P2)

On a person's detail page, users see a comprehensive list of all movies and TV shows featuring that person which are available in any of their connected media libraries (Plex, Jellyfin). The filmography is organized by media type and sorted chronologically.

**Why this priority**: This is the key value proposition - seeing what you can actually watch from this person. Requires P1 and P2 to be in place first, but is essential for the feature to be useful.

**Independent Test**: Can be tested by navigating to any person page and verifying that only titles from connected libraries are shown, organized by type. Delivers value by filtering the person's entire filmography to only what's available to watch.

**Acceptance Scenarios**:

1. **Given** a user has a Plex library with titles featuring a specific person, **When** viewing that person's detail page, **Then** all matching titles from Plex are displayed
2. **Given** a user has a Jellyfin library with titles featuring a specific person, **When** viewing that person's detail page, **Then** all matching titles from Jellyfin are displayed
3. **Given** a person appears in both movies and TV shows in the user's libraries, **When** viewing their detail page, **Then** the filmography is organized into separate Movies and TV Shows sections
4. **Given** multiple titles are shown in a person's filmography, **When** viewing the list, **Then** titles are sorted by release date (newest first) within each section
5. **Given** a person appears in a title not in any of the user's libraries, **When** viewing their detail page, **Then** that title is not shown in the filmography

---

### User Story 4 - Identify Watch Status in Filmography (Priority: P2)

Within a person's library filmography, users can visually distinguish between titles they have already watched, titles they are currently watching or have on their watchlist, and titles they haven't tracked yet. This helps users quickly find new content to watch from that person.

**Why this priority**: Enhances the P3 feature by helping users make decisions - they want to find unwatched content quickly. Important but not critical for initial launch.

**Independent Test**: Can be tested by viewing a person page with mixed watch statuses and verifying visual indicators. Delivers value by reducing time to find unwatched content from a favorite person.

**Acceptance Scenarios**:

1. **Given** a user has watched some titles in a person's library filmography, **When** viewing the person page, **Then** watched titles are visually marked (e.g., with a badge or checkmark)
2. **Given** a user has titles on their watchlist from a person's filmography, **When** viewing the person page, **Then** watchlist titles are visually marked differently from watched titles
3. **Given** a user has rated some titles in a person's filmography, **When** viewing the person page, **Then** their ratings are displayed on those titles
4. **Given** a user is viewing a person's filmography, **When** they see watch status indicators, **Then** they can immediately identify which titles are new to them

---

### User Story 5 - Access Title Details from Filmography (Priority: P3)

Users can click on any title in a person's filmography to navigate directly to that title's detail page, enabling seamless exploration from person to title and back.

**Why this priority**: Nice-to-have navigation enhancement. Users can always navigate through other means, so this is lower priority.

**Independent Test**: Can be tested by clicking on filmography items and verifying navigation works. Delivers convenience but not new functionality.

**Acceptance Scenarios**:

1. **Given** a user is viewing a person's filmography, **When** they click on any movie title, **Then** they are taken to that movie's detail page
2. **Given** a user is viewing a person's filmography, **When** they click on any TV show title, **Then** they are taken to that TV show's detail page
3. **Given** a user navigates from a person page to a title page, **When** they click back, **Then** they can easily navigate back to the person page

---

### User Story 6 - View Watch Statistics for Person (Priority: P3)

On a person detail page, users see aggregate statistics about their viewing history with that person's content, such as number of titles watched, total watch time, and average rating given.

**Why this priority**: Nice contextual information but not essential for browsing functionality. Can be added later.

**Independent Test**: Can be tested by viewing a person page and verifying stats are calculated correctly from watch history. Delivers insight but not actionable functionality.

**Acceptance Scenarios**:

1. **Given** a user has watched multiple titles featuring a person, **When** viewing that person's page, **Then** a count of watched titles is displayed
2. **Given** a user has rated titles featuring a person, **When** viewing that person's page, **Then** the average rating they've given to that person's work is displayed
3. **Given** a user has watched movies featuring a person, **When** viewing that person's page, **Then** total watch time for that person's movies is displayed

---

### Edge Cases

- What happens when a person has no titles in the user's libraries (empty filmography)?
  - Display an empty state message: "No titles featuring [Name] found in your libraries"
  - Could optionally show a link to search TMDB or add to library

- How does the system handle persons with very large filmographies (100+ titles in library)?
  - Paginate or use infinite scroll for filmographies beyond 50 titles
  - Consider adding filter/sort options by media type, year, or watch status

- What happens when TMDB credits data is missing or incomplete for a title?
  - Title pages display whatever cast/crew data is available
  - If no cast data exists, show "Cast information unavailable"
  - If no director/creator data exists, omit the director section

- How does the system handle profile photos that fail to load or are missing?
  - Display a default avatar placeholder with the person's initials
  - Ensure layout remains stable when photos are missing

- What happens when a user has multiple connected libraries with overlapping content?
  - Show each unique title once in filmography (deduplicate by TMDB ID)
  - Optionally indicate which libraries contain the title

- How does the system handle persons who work primarily in crew roles (cinematographers, composers, editors)?
  - Person pages should work for any crew member, not just actors and directors
  - Clarify the role on the person page (e.g., "Known for: Cinematography")

- What happens when navigating to a person page for someone not in any user titles?
  - Allow the page to render with TMDB data but show empty filmography
  - This supports deep linking and future discovery features

## Requirements _(mandatory)_

### Functional Requirements

#### Data Display

- **FR-001**: System MUST display up to 8 cast members on movie detail pages, ordered by TMDB billing order
- **FR-002**: System MUST display up to 8 cast members on TV show detail pages, ordered by TMDB billing order
- **FR-003**: System MUST display the primary director on movie detail pages
- **FR-004**: System MUST display the creator or series director on TV show detail pages
- **FR-005**: System MUST display cast member profile photos from TMDB when available
- **FR-006**: System MUST display a fallback avatar when profile photos are unavailable

#### Person Detail Pages

- **FR-007**: System MUST create accessible person detail pages at a consistent URL pattern (e.g., `/person/[tmdbId]`)
- **FR-008**: Person detail pages MUST display the person's name as the primary heading
- **FR-009**: Person detail pages MUST display the person's profile photo from TMDB when available
- **FR-010**: Person detail pages MUST display the person's "known for" department from TMDB (e.g., Acting, Directing)
- **FR-011**: System MUST make cast and director names clickable links to their respective person pages

#### Library Filmography

- **FR-012**: Person pages MUST query the user's MediaItem database records to find all titles featuring that person (matching on cast or director fields)
- **FR-013**: Person filmography MUST be organized into separate sections for Movies and TV Shows
- **FR-014**: Person filmography MUST be sorted by release date within each section (newest first by default)
- **FR-015**: Person filmography MUST display poster images, titles, and release years for each item
- **FR-016**: Person filmography MUST only show titles that exist in the user's connected libraries (based on MediaItem records created by Plex/Jellyfin sync)

#### Watch Status Integration

- **FR-017**: Person filmography MUST visually indicate which titles the user has watched
- **FR-018**: Person filmography MUST visually indicate which titles are on the user's watchlist
- **FR-019**: Person filmography MUST display the user's rating on titles they have rated
- **FR-020**: Watch status indicators MUST be clearly distinguishable from each other

#### Navigation

- **FR-021**: Users MUST be able to click on any title in a person's filmography to navigate to that title's detail page
- **FR-022**: Person pages MUST support browser back button navigation
- **FR-023**: Person pages MUST include a clear navigation element to return to browse or search

#### Performance & Data

- **FR-024**: System MUST use existing MediaItem cast and director data (already populated by TMDB during media sync)
- **FR-025**: System MUST fetch additional person details (profile photo, bio, known_for) from TMDB API when rendering person pages
- **FR-026**: Person page TMDB API calls MUST be cached with appropriate revalidation period (suggested: 7 days)

### Key Entities

- **Person**: Represents an individual from TMDB (actor, director, crew member)
  - Primary identifier: TMDB person ID
  - Attributes: name, profile photo URL, known_for department
  - Relationships: appears in many MediaItems (via cast/director arrays)

- **MediaItem** (existing): Already stores cast array and director string
  - No schema changes required
  - Used to query which titles feature a specific person

- **PersonFilmography**: Virtual entity (not stored) representing a person's titles in user libraries
  - Derived by querying MediaItems where cast contains person name OR director matches person name
  - Grouped by media type (movie/TV)
  - Annotated with user's watch status data

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can identify cast and crew on any title page in under 3 seconds of viewing the page
- **SC-002**: Users can navigate from a title page to a person page in one click
- **SC-003**: Person filmography lists load and display in under 2 seconds for persons with up to 50 titles in libraries
- **SC-004**: 100% of titles in person filmographies are accurate matches (no false positives from name matching)
- **SC-005**: Users can distinguish between watched and unwatched titles in a filmography at a glance (within 1 second of viewing)
- **SC-006**: Person pages correctly display filmography for persons with 0 titles, 1 title, and 50+ titles in user libraries
- **SC-007**: Watch status indicators on person filmographies match the user's actual watch history with 100% accuracy

## Assumptions

- Users have already connected at least one media library (Plex or Jellyfin) with synced content
- MediaItem records already contain cast and director arrays populated by existing TMDB sync logic
- TMDB API access is available and the TMDB_API_KEY environment variable is configured
- Person matching is based on exact string matching of names between MediaItem cast/director arrays and TMDB person data
- Profile photos and person details will be fetched from TMDB in real-time (with caching) rather than pre-synced to the database
- Users accessing person pages are authenticated (person pages are not public-facing)
- The existing MediaCard component can be reused for displaying titles in filmography grids
- The existing watch status badge/indicator components can be reused on filmography items
- Browser support matches existing application requirements (modern browsers with JavaScript enabled)
- Person pages will use the same responsive layout patterns as existing title pages
