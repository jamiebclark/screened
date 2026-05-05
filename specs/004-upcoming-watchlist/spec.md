# Feature Specification: Upcoming from Watchlist

**Feature Branch**: `004-upcoming-watchlist`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Surface watchlist items that have a known future (or very recent) release date, sorted by how soon they release, so users can see what on their list is coming up."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Upcoming Releases (Priority: P1)

A user visits a dedicated `/upcoming` page and sees all titles on their watchlist that have a release date within the next year (or have been released in the last 30 days and are still unwatched). Titles are sorted by release date ascending — soonest first — so the user knows exactly what to anticipate next.

**Why this priority**: Delivers the core value of the feature. Everything else (grouping, empty states) builds on this list existing and being correctly ordered.

**Independent Test**: Add a movie with a known future release date to the watchlist, visit `/upcoming`, and confirm it appears sorted before a movie releasing later. A title with no release date should not appear.

**Acceptance Scenarios**:

1. **Given** a user has watchlist items with future release dates, **When** they visit `/upcoming`, **Then** those items are shown sorted by release date ascending (soonest first).
2. **Given** a user has a watchlist item released in the past 30 days that is still unwatched, **When** they visit `/upcoming`, **Then** that item appears in a "Just Released" section below the "Coming Soon" section.
3. **Given** a user has a watchlist item with `releaseDate = null`, **When** they visit `/upcoming`, **Then** that item does not appear on the page.
4. **Given** a user has a watchlist item that was released more than 30 days ago, **When** they visit `/upcoming`, **Then** that item does not appear on the page regardless of watch status.
5. **Given** the user is not authenticated, **When** they attempt to visit `/upcoming`, **Then** they are redirected to the login page.

---

### User Story 2 - Distinguish Coming Soon from Just Released (Priority: P2)

Items are visually grouped into two sections: **Coming Soon** (release date is in the future) and **Just Released** (release date is within the past 30 days and the item is unwatched). This helps users immediately identify what they can watch now vs. what they're still waiting for.

**Why this priority**: Grouping is a significant usability improvement over a single flat list, since user action differs — "Just Released" items can be watched immediately, "Coming Soon" cannot.

**Independent Test**: Add one movie with a future date and one movie released 10 days ago (unwatched) to the watchlist, visit `/upcoming`, and confirm two distinct labeled sections appear with correct items in each.

**Acceptance Scenarios**:

1. **Given** items exist in both future and recent-past date ranges, **When** the page renders, **Then** a "Coming Soon" section and a "Just Released" section are displayed with clear headings.
2. **Given** no items have future release dates, **When** the page renders, **Then** the "Coming Soon" section is omitted or shows an appropriate empty state.
3. **Given** no items were released in the past 30 days (or all such items are already watched), **When** the page renders, **Then** the "Just Released" section is omitted or shows an appropriate empty state.
4. **Given** a "Just Released" item is marked as watched, **When** the page is viewed, **Then** that item no longer appears in "Just Released."

---

### User Story 3 - Empty State and Navigation (Priority: P3)

A user with no upcoming releases on their watchlist sees a helpful empty state that points them back to browsing or their watchlist, rather than a confusing blank page.

**Why this priority**: Necessary for a polished experience but delivers no functional value on its own — only matters when the lists are empty.

**Independent Test**: With a watchlist that has no items with future or recent release dates, visit `/upcoming` and confirm a friendly empty message and a link to the watchlist (or discovery) are shown.

**Acceptance Scenarios**:

1. **Given** a user has no watchlist items with upcoming or recent release dates, **When** they visit `/upcoming`, **Then** a non-blank empty state is shown with a clear call-to-action (e.g., "Add titles to your watchlist to track upcoming releases").
2. **Given** the empty state is shown, **When** the user clicks the call-to-action, **Then** they are taken to the watchlist or browse page.

---

### Edge Cases

- What happens when a title's release date is today? → It is treated as "Just Released" (release date ≤ today and within the 30-day window).
- What happens when a user marks a "Just Released" item as watched? → It disappears from the upcoming page on the next visit (or immediately if the page re-fetches).
- What happens when a title has `releaseDate = null` due to being an older `MediaItem` created before release dates were stored? → Excluded from the upcoming page. The enrichment version bump will backfill `releaseDate` for such items over time as they are accessed; they will appear once their `releaseDate` is populated.
- What happens if the upcoming page has no items in one section but items in the other? → Only the section with items is shown; the other is omitted entirely.
- What happens for TV shows? → `releaseDate` reflects the series premiere date (`first_air_date` from TMDB), not a future season premiere. A currently-airing show may have a past `releaseDate` and will not appear in "Coming Soon." This is a known v1 limitation.
- What happens if the user has hundreds of upcoming items? → The page shows all of them (no pagination for v1); revisit if performance degrades.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to visit a dedicated `/upcoming` route that shows their watchlist items with known release dates.
- **FR-002**: The page MUST show only items the user has added to their watchlist (status = WATCHLIST).
- **FR-003**: Items with a future release date MUST appear in a "Coming Soon" section, sorted by release date ascending.
- **FR-004**: Items released within the past 30 days that the user has not yet watched MUST appear in a "Just Released" section.
- **FR-005**: Items with `releaseDate = null` MUST be excluded from the page.
- **FR-006**: Items released more than 30 days ago MUST be excluded, regardless of watch status.
- **FR-007**: "Coming Soon" items MUST be sorted by release date ascending (nearest first).
- **FR-008**: "Just Released" items MUST be sorted by release date descending (most recently released first).
- **FR-009**: The page MUST be accessible only to authenticated users; unauthenticated requests MUST redirect to login.
- **FR-010**: When both sections are empty, the page MUST display a non-blank empty state with a navigation affordance.
- **FR-011**: When a section has no items, that section MUST be omitted from the rendered page.
- **FR-012**: The enrichment pipeline MUST be updated to populate `releaseDate` for existing `MediaItem` records that currently have `releaseDate = null`, by incrementing the enrichment version so older items are re-enriched on next access.

### Key Entities

- **UserMediaStatus**: A user's watchlist record for a title (status = WATCHLIST). Links the authenticated user to a `MediaItem`.
- **MediaItem**: Stores title metadata including `releaseDate` (the movie's theatrical release date or the TV series' first air date). Items created before the `releaseDate` migration may have `null` and will be backfilled via enrichment.
- **Coming Soon**: The subset of the user's watchlist where `releaseDate > today`.
- **Just Released**: The subset of the user's watchlist where `releaseDate` is within the past 30 days and the user has not recorded a watch entry for the title.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can visit `/upcoming` and see all their watchlist items with future release dates without any additional steps.
- **SC-002**: Items are sorted correctly — "Coming Soon" ascending by date, "Just Released" descending — with 100% accuracy.
- **SC-003**: The page loads and renders within 2 seconds for a watchlist of up to 500 items.
- **SC-004**: A title marked as watched no longer appears in "Just Released" when the page is next viewed.
- **SC-005**: A title with no release date never appears on the upcoming page, regardless of when it was added to the watchlist.

## Assumptions

- The `/upcoming` page is a standalone route, not a tab or section on the existing `/watchlist` page. It should be linked from the main navigation.
- The "Just Released" window is 30 days. This is a reasonable default for "recent enough to still feel fresh"; adjustable in a future iteration.
- For TV shows, `releaseDate` is the series premiere date (`first_air_date`). Future-season premiere tracking is out of scope for v1.
- "Unwatched" for the "Just Released" filter means the user has no `WatchEntry` records for the title. A `UserMediaStatus` of WATCHED is also sufficient to exclude an item.
- Titles without a `releaseDate` are excluded silently — no indication to the user that data is missing.
- The enrichment version bump (v1 → v2) that backfills `releaseDate` for existing items is part of this feature's implementation scope.
- No new database schema changes are required; `MediaItem.releaseDate` already exists.
- Pagination is out of scope for v1; the full list is rendered. Revisit if users have very large upcoming queues.
- Navigation entry point (e.g., sidebar link to `/upcoming`) is part of this feature's scope.
