# Contract: `GET /api/search`

**File**: `src/app/api/search/route.ts`
**Status**: existing route, **extended** — backward compatible. New query parameters are optional
with defaults equal to today's behaviour; new response fields are additive.
**Covers**: FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-031

## Authentication

`await auth()` → `401 { "error": "Unauthorized" }` when there is no session. Unchanged.

## Query parameters

| Param   | Type   | Default | Notes                                                                                   |
| ------- | ------ | ------- | --------------------------------------------------------------------------------------- |
| `q`     | string | —       | Trimmed. Empty/absent ⇒ `200 { results: [], page: 1, totalPages: 0, totalResults: 0 }`. |
| `type`  | enum   | `movie` | `movie` \| `tv` \| `multi`. Default preserves today's behaviour (FR-020).               |
| `year`  | int    | _none_  | Release year. `1874 … currentYear + 10` (FR-021).                                       |
| `page`  | int    | `1`     | TMDB page, `1 … 500` (FR-022).                                                          |
| `limit` | int    | `8`     | Results returned, `1 … 20`. Default preserves today's 8-row typeahead.                  |

Parsing and validation live in `src/lib/title-search-params.ts` (`parseTitleSearchParams`) so they
are unit-tested independently of the route.

## TMDB mapping

| `type`  | `year` absent              | `year` present                                                                      |
| ------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `movie` | `/search/movie?query&page` | `/search/movie?query&page&primary_release_year=<year>`                              |
| `tv`    | `/search/tv?query&page`    | `/search/tv?query&page&first_air_date_year=<year>`                                  |
| `multi` | `/search/multi?query&page` | fan-out: `/search/movie` **and** `/search/tv` for the same page, merged (see below) |

`/search/multi` accepts no year parameter, hence the fan-out. Merge order: `popularity` descending,
then `title` ascending, then `tmdbId` ascending — deterministic, so paging is stable.
`totalPages = max(movie.total_pages, tv.total_pages)`,
`totalResults = movie.total_results + tv.total_results`.

`person` results from `/search/multi` are filtered out **before** `limit` is applied (today they are
filtered after the slice is conceptually taken, which wastes result slots — RC3).

`src/lib/tmdb.ts` changes:

- `searchMovie(query, year?, page = 1)` — add `page`.
- `searchTv(query, year?, page = 1)` — **new**; stamps `media_type: "tv"` on each result and
  guarantees `results` is an array, mirroring `searchMovie`.
- `TmdbSearchResult` gains `popularity?: number` (TMDB already returns it) for the merge.

## Response

```jsonc
{
  "results": [
    {
      "tmdbId": 25165,
      "title": "House",
      "poster": "https://image.tmdb.org/t/p/w185/…jpg", // or null
      "year": 1985,
      "type": "movie", // "movie" | "tv"
    },
  ],
  "page": 1,
  "totalPages": 3,
  "totalResults": 47,
}
```

`results` entries keep their exact current field names and types. `page`, `totalPages`, and
`totalResults` are new and additive; `picker-form.tsx` and `editable-list-search-add.tsx` read only
`results` and need no change.

| Status | Body                                                               | When                                                           |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `200`  | as above (possibly `results: []`)                                  | success, including a valid query that matches nothing (FR-026) |
| `400`  | `{ "error": "Search type must be movie, tv or multi" }`            | bad `type`                                                     |
| `400`  | `{ "error": "Year must be a whole number between 1874 and 2036" }` | bad `year` (upper bound computed from the current year)        |
| `400`  | `{ "error": "Page must be a whole number between 1 and 500" }`     | bad `page`                                                     |
| `400`  | `{ "error": "Limit must be a whole number between 1 and 20" }`     | bad `limit`                                                    |
| `401`  | `{ "error": "Unauthorized" }`                                      | no session                                                     |
| `502`  | `{ "error": "Title search is temporarily unavailable" }`           | TMDB unreachable / rate-limited after `tmdbFetch`'s 3 retries  |

The TMDB exception is `console.error`'d server-side and never echoed to the client (FR-025, FR-031).
`502` replaces today's blanket `500` because the failure is upstream, not ours; the client shows the
same user-safe message either way and keeps the dialog usable once TMDB recovers (spec edge case
"Search catalog unavailable or rate-limited").

## Verifying FR-024

The two reported titles must be reachable:

```
GET /api/search?q=House&type=movie&year=1985  → results include tmdbId 25165 "House" (1985)
GET /api/search?q=Arena&type=movie&year=1989  → results include the 1989 film "Arena"
```

These are asserted in the E2E spec as API-level requests (no TMDB mocking — the suite already hits
live TMDB for `getMovie` in the list tests) and are the acceptance test for SC-004.

## Client contract — `list-add-fab.tsx` (FR-023, FR-026, FR-027, FR-028)

State: `query`, `mediaType` (`multi` default for the add-title flow — the user is adding either kind),
`year` (`""` ⇒ omitted), `page`, `results[]`, `totalPages`, `requestSeq`.

- Query string is built with `buildTitleSearchQuery(...)` and always includes `limit=20`.
- 350 ms debounce on `query` (unchanged). Changing `mediaType` or `year` searches immediately,
  resets `page` to `1`, and **replaces** results.
- "Load more" (rendered only while `page < totalPages`) increments `page` and **appends**, preserving
  `query`, `mediaType`, and `year` (FR-028). Past the last page the button is not rendered (spec edge
  case "Search paging past the last page").
- A monotonic `requestSeq` ref guards responses: a resolved fetch is applied only if its sequence is
  the latest issued (FR-027).
- Every row already shows the year and a Film/TV icon + label (`list-add-fab.tsx:244–255`) — FR-023
  is satisfied by the existing markup and must be preserved.
- Empty state when `q` is non-empty, not loading, and `results.length === 0`: "No titles matched.
  Try a different year, or search both films and TV." plus a **Clear filters** button that resets
  `mediaType` to `multi` and `year` to `""` and re-searches (FR-026, and scenario 3.7).
- No `router.refresh()` on search (client-only state); `router.refresh()` stays on successful add.

## Test expectations

- Vitest (`src/lib/title-search-params.test.ts`): the parse table above (defaults, each rejection
  message, boundary years `1874` / `currentYear + 10` / one past each, non-numeric `year`, `page`
  and `limit` bounds), plus `buildTitleSearchQuery` round-tripping through
  `parseTitleSearchParams` and omitting absent optional params.
- Playwright (`e2e/lists-ranked.spec.ts` neighbours / `e2e/search.spec.ts`): API-level assertions
  for the two FR-024 queries, a `400` for `year=abc`, and a UI pass through the add dialog that
  restricts to movies, sets 1985, and adds _House_ to a list.
