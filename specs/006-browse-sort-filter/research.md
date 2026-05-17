# Research: Browse Sort & Filter

## TMDB Discover API — Multi-Genre Filtering

**Decision**: Use comma-separated genre IDs in TMDB `with_genres` param.

**Rationale**: TMDB Discover treats comma-separated `with_genres` values as AND logic —
`with_genres=27,35` returns titles that have BOTH Horror AND Comedy. This maps exactly to FR-002's
AND requirement without any post-filtering needed on the TMDB path.

**Alternatives considered**: Pipe-separated (which TMDB treats as OR) — rejected because spec
requires AND logic.

---

## TMDB Discover API — Sort Parameters

**Decision**: Map our `BrowseSortOrder` values to TMDB `sort_by` strings.

| Our sort value | TMDB `sort_by` (movies) | TMDB `sort_by` (tv)                                    |
| -------------- | ----------------------- | ------------------------------------------------------ |
| `popularity`   | `popularity.desc`       | `popularity.desc`                                      |
| `title`        | `original_title.asc`    | `name.asc` (not supported by discover — use post-sort) |
| `year_desc`    | `release_date.desc`     | `first_air_date.desc`                                  |
| `year_asc`     | `release_date.asc`      | `first_air_date.asc`                                   |
| `rating_desc`  | `vote_average.desc`     | `vote_average.desc`                                    |
| `rating_asc`   | `vote_average.asc`      | `vote_average.asc`                                     |

**Rationale**: These are the native TMDB sort values; no post-processing needed on the TMDB path.
`title` sort on TMDB path maps to `original_title.asc` for movies; TV shows don't have a native
`name.asc` sort in Discover, so `title` sort on the TV TMDB path falls back to `popularity.desc`.

---

## TMDB Discover API — Year Range

**Decision**: Use TMDB date range params.

- Movies: `primary_release_date.gte=YYYY-01-01` and `primary_release_date.lte=YYYY-12-31`
- TV: `first_air_date.gte=YYYY-01-01` and `first_air_date.lte=YYYY-12-31`

**Rationale**: TMDB Discover supports these natively. Appending `-01-01`/`-12-31` converts a 4-digit
year to a full date, covering the entire year inclusively.

---

## TMDB Discover API — Person Filtering

**Decision**: Use TMDB `with_cast` (actor IDs) and `with_crew` (director IDs) for include; exclude
persons via DB-backed post-filter.

**Rationale**:

- TMDB `with_cast` accepts a comma-separated list of person IDs. Multiple IDs use OR within TMDB,
  so for AND across multiple included people we pass the first person ID to TMDB and post-filter
  additional people against locally-stored `castTmdbIds` / `directorsTmdbIds` on `MediaItem`.
- TMDB Discover has no "without_cast" param, so exclude filtering always uses the local DB. Titles
  not yet in our `MediaItem` table cannot be excluded on TMDB paths — this edge case is acceptable
  given the spec assumptions.

**Alternatives considered**: Intersecting multiple TMDB API calls (one per person) — too expensive
in request count for a single page render. Full cast enrichment via title detail calls — too many
requests.

---

## DB Path — Sort Order

**Decision**: Map `BrowseSortOrder` to Prisma `orderBy` clauses on `UserMediaStatus`.

| Our sort value | Prisma `orderBy`                                         |
| -------------- | -------------------------------------------------------- |
| `popularity`   | `updatedAt: "desc"` (last-touched, approximates recency) |
| `title`        | `mediaItem: { title: "asc" }`                            |
| `year_desc`    | `mediaItem: { year: { sort: "desc", nulls: "last" } }`   |
| `year_asc`     | `mediaItem: { year: { sort: "asc", nulls: "last" } }`    |
| `rating_desc`  | `rating: { sort: "desc", nulls: "last" }`                |
| `rating_asc`   | `rating: { sort: "asc", nulls: "last" }`                 |

**Rationale**: `UserMediaStatus.rating` (Float?) and `MediaItem.year` (Int?) both exist in the
schema (schema.prisma lines 317, 274). Prisma supports nested `orderBy` on relations. Nulls-last
is the correct behavior for optional fields per the spec.

---

## DB Path — Multi-Genre

**Decision**: Use Prisma `{ genres: { hasEvery: [...genreNames] } }` on `MediaItem`.

**Rationale**: `MediaItem.genres` is `String[]` (Prisma array). `hasEvery` checks that ALL provided
values are present — direct AND implementation. Genre names (not IDs) are used because the DB
stores genre names as strings. Genre ID → name resolution happens once via the cached TMDB genres
list.

---

## DB Path — Person Filtering

**Decision**: Use `castTmdbIds` / `directorsTmdbIds` for include (exact TMDB ID match) and
`cast`/`directors` string arrays for exclude (case-insensitive substring via `hasSome` + JS filter).

**Rationale**: `MediaItem` stores both TMDB person IDs (`castTmdbIds: Int[]`,
`directorsTmdbIds: Int[]`) and name strings (`cast: String[]`, `directors: String[]`). ID-based
matching is exact and avoids name collision; string-based substring is what the spec requires for
local library paths. For include: use `{ castTmdbIds: { has: personId } }` ORed with
`{ directorsTmdbIds: { has: personId } }`. For exclude: post-filter after DB query using name
substring match (case-insensitive).

---

## URL State Strategy

**Decision**: All filter state lives in URL query params. No separate client-side state store.

| Param            | Value format                                                                          | Notes                                                      |
| ---------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `genres`         | `28,35`                                                                               | comma-separated genre IDs (AND); replaces `genre`          |
| `sort`           | `popularity` \| `title` \| `year_desc` \| `year_asc` \| `rating_desc` \| `rating_asc` | omitted = use tab default                                  |
| `yearMin`        | `1970`                                                                                | 4-digit year                                               |
| `yearMax`        | `1990`                                                                                | 4-digit year                                               |
| `includePersons` | `1234:Denis Villeneuve,5678:Tilda Swinton`                                            | `id:name` pairs, comma-separated                           |
| `excludePersons` | `9012:Adam Sandler`                                                                   | same format                                                |
| `genre`          | `28`                                                                                  | LEGACY single-genre param — treated as `genres` if present |

**Rationale**: URL-based state gives shareable/bookmarkable URLs (FR-017) for free. `router.push`
from the client filter panel triggers a full RSC re-render. Person names are embedded in the URL
alongside IDs so the server can render tag chips without an extra API call on page load.

---

## Filter Panel UI

**Decision**: Single collapsible `<details>`-style panel with CSS transition, rendered as a `"use
client"` component (`BrowseFilterPanel`). Panel open/closed state is local React state (not in
URL). Filter values within the panel are tracked in local state and applied atomically (single
`router.push`) when the user changes any control.

**Rationale**: FR-020 requires inline expansion above the results grid without overlays or sidebars.
A `"use client"` component is justified: the filter panel has interactive controls (toggles, inputs,
autocomplete) that require event handlers. Local open/closed state avoids polluting the URL with
panel visibility.

**Alternatives considered**: Form submit pattern (no JS) — doesn't give the inline expand/collapse
behavior. Server component with redirects — too many round trips for interactive filter changes.
