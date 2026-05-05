# Research: Watchlist Sort & Filter

## Findings

### Decision: No schema migration required

**Rationale**: `MediaItem` already has `year` (int), `runtime` (int, nullable), `genres` (string[]), and `releaseDate` (DateTime, nullable). `UserMediaStatus` has `createdAt`. All filter and sort data is available now.
**Alternatives considered**: Denormalizing `runtime`/`year` onto `UserMediaStatus` — rejected because the full item set is loaded at once with a single join, making denormalization premature.

### Decision: Keep filtering client-side

**Rationale**: The existing pattern loads all watchlist items in one Prisma query and filters in `useMemo`. This is already established for type and genre filters. No pagination exists. Client-side filtering avoids extra round-trips and keeps the interaction instant.
**Alternatives considered**: Server-side filtering via URL params → Prisma `where` — would require a full page navigation on every filter change. Rejected: worse UX, more complexity, no meaningful data volume justification at typical watchlist sizes.

### Decision: URL params as single source of truth for all filter+sort state

**Rationale**: The `sort` param already lives in the URL (server reads it for Prisma `orderBy`). The existing `type` and `genre` filters live in React state (not URL). Migrating all filter state to URL params enables shareable/bookmarkable URLs and satisfies the spec requirement — no React state duplication needed.
**Alternatives considered**: Hybrid (sort in URL, filters in React state) — already the current pattern, rejected because it violates the spec requirement and makes back/forward navigation inconsistent.

### Decision: Runtime sort uses Prisma nested orderBy with nulls last

**Rationale**: `runtime` is nullable on `MediaItem`. Titles without runtime data should sort to the end. Prisma supports `{ mediaItem: { runtime: { sort: 'asc', nulls: 'last' } } }` for nested nullable fields.
**Alternatives considered**: Filter out null-runtime items from sort — rejected as too aggressive; users shouldn't lose items from their list.

### Decision: Runtime filter uses preset buckets, year range uses free-entry number inputs

**Rationale**: Runtime presets (≤60, ≤90, ≤120, ≤150, ≤180 min) cover the common "short / feature / long" decision without needing a range slider. Year range inputs are better as free-entry because decades are not uniform and users may know a specific year.
**Alternatives considered**: Slider for runtime — adds a dependency (or custom implementation), overkill for this filter. Preset decade buttons for year — too opinionated about decade boundaries.

### Decision: Genres filter uses comma-separated URL param

**Rationale**: `?genres=Action,Comedy` is human-readable and easy to encode/decode. The existing `selectedGenres` state is `string[]` — `split(",")` → `filter(Boolean)` maps cleanly.
**Alternatives considered**: Repeated params (`?genres=Action&genres=Comedy`) — supported by URLSearchParams API but harder to read in URL. Not used elsewhere in the app.

### What already exists

- 5 sort options in `SORT_ORDERS` in `page.tsx` (added_desc, title_asc, year_desc, year_asc, rating_desc)
- Type filter (movie/tv) and genre multi-select in `watchlist-client.tsx` — working but React-state-only
- `runtime` is on `MediaItem` in the schema but NOT currently fetched in the watchlist query
- `WatchlistItem` type does not currently include `runtime`
- Filter bar UI components: `Select`, `DropdownMenu`, `Button` all available in `src/components/ui/`
