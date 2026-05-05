# Research: Upcoming from Watchlist

## Enrichment Backfill Strategy

**Decision**: Bump `CURRENT_ENRICHMENT_VERSION` from 1 to 2 and populate `releaseDate` inside `enrichAndEmbed` for items where the field is currently null.

**Rationale**: The `isUnderEnriched()` check (`enrichmentVersion < CURRENT_ENRICHMENT_VERSION`) fires whenever `getOrCreateMediaItem` encounters an existing item. Bumping the constant to 2 causes all items with `enrichmentVersion = 1` (the current default) to be queued for re-enrichment on next access via `after()`. The enrichment function then conditionally fetches the base movie/show detail if `releaseDate` is null and writes the field. This avoids a bulk migration query while ensuring gradual, automatic backfill.

**Alternatives considered**:

- One-time data migration script: would require a new migration file, TMDB API calls at deploy time, and special-case handling for rate limits. Rejected — the enrichment path is already purpose-built for this.
- Accept null silently and let items appear once accessed: works, but popular watchlist items would be missing from `/upcoming` indefinitely if never re-accessed.

## "Just Released" Window

**Decision**: 30 days before today. Items where `releaseDate BETWEEN (now - 30 days) AND now` AND `UserMediaStatus.status = 'WATCHLIST'`.

**Rationale**: 30 days is long enough that users who don't check the app daily won't miss items; short enough that the section doesn't become stale noise. The status=WATCHLIST check is sufficient to exclude watched titles — users who watch a title are expected to update its status.

## Watchlist "Releasing Soon" Section

**Decision**: Keep the existing section on `/watchlist` as a compact teaser (max 12 items), and add a "See all upcoming →" link pointing to `/upcoming` when there are items.

**Rationale**: The watchlist page already has a well-designed "Releasing soon" widget. Duplicating the full feature there would bloat the page. Linking to `/upcoming` gives power users a dedicated view while keeping the watchlist focused.

## Page Layout

**Decision**: Two stacked sections with `h3` headings ("Coming Soon" / "Just Released"), each with a card list showing poster thumbnail, title, type badge, and formatted release date. Empty sections are omitted entirely. Full empty state when both are empty.

**Rationale**: Matches existing UI patterns (watchlist "Releasing soon" uses the same row style). Section headings follow the `text-base font-semibold` constitution standard.
