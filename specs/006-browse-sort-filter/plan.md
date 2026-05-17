# Implementation Plan: Browse Sort & Filter

**Branch**: `006-browse-sort-filter` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-browse-sort-filter/spec.md`

## Summary

Add sort order, multi-genre AND filtering, year-range filtering, and person include/exclude
filtering to the browse page. All state lives in URL query params. A new collapsible filter panel
replaces the current flat filter bar. No schema migrations are needed — all required fields exist.

## Technical Context

**Language/Version**: TypeScript / Node.js 20  
**Primary Dependencies**: Next.js 15 (App Router + RSC), Prisma 5, Tailwind v4, Radix UI  
**Storage**: PostgreSQL via Prisma — no schema changes required  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web — same-origin SSR  
**Project Type**: Web application (Next.js full-stack)  
**Performance Goals**: Filter changes deliver results within the same latency as current unfiltered
browse (TMDB-cached discover calls; DB queries indexed on `userId`, `type`, `status`)  
**Constraints**: TMDB person AND-filtering on paginated paths limited by TMDB API (mitigated via
local DB post-filter); `type=all` tab does not support sort/filter (hide controls)  
**Scale/Scope**: Single browse route; impacts `src/app/(app)/browse/` + `src/lib/`

## Constitution Check

- [x] **I. Server Components First** — `BrowsePage` stays an RSC; new `BrowseFilterPanel` is
      `"use client"` only for interactive filter controls. Filter changes use `router.push` (not fetch
      mutations), so `router.refresh()` is not needed.
- [x] **II. Security by Default** — No new authenticated API routes. The browse page already calls
      `await auth()`; year/sort params are validated server-side with safe integer parsing.
- [x] **III. Migrations Only** — No schema changes; this check is satisfied vacuously.
- [x] **IV. Conventional Commits** — Commit plan below: lib types first, then lib/tmdb, then UI.
- [x] **V. Test at the Right Level** — Vitest for `parseBrowseFilter`/`serializeBrowseFilter` pure
      logic; Playwright for filter → result E2E journeys.

## Project Structure

### Documentation (this feature)

```text
specs/006-browse-sort-filter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── browse-query-params.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code

```text
src/
├── app/(app)/browse/
│   ├── page.tsx                     # modified: new params, DB/TMDB query updates
│   ├── browse-filter-panel.tsx      # new: replaces browse-filters.tsx (collapsible)
│   ├── browse-filters.tsx           # replaced (kept or deleted after migration)
│   └── person-tag-input.tsx         # new: async search + chip input for persons
├── lib/
│   ├── browse-types.ts              # new: BrowseFilter, BrowseSortOrder, parse/serialize
│   ├── browse-utils.ts              # modified: multi-genre helpers
│   └── tmdb.ts                      # modified: discoverMovies/Tv accept DiscoverOptions
└── __tests__ / lib/
    └── browse-types.test.ts         # new: Vitest tests for parse/serialize
e2e/
└── browse-filter.spec.ts            # new: Playwright E2E for filter + sort flows
```

## Implementation Phases

### Phase A — Types & Lib (no UI, no behavior change)

**A1. `src/lib/browse-types.ts`** (new)

- `BrowseSortOrder` type union
- `PersonFilterItem` interface `{ id: number; name: string }`
- `BrowseFilter` interface
- `parseBrowseFilter(params: Record<string, string | undefined>): BrowseFilter`
  - Reads `genres` (comma-split to `number[]`); falls back to `genre` for legacy URLs
  - Reads `sort` validated against `BrowseSortOrder` values; null if absent/invalid
  - Reads `yearMin`/`yearMax` as 4-digit ints; null if absent or non-numeric
  - Reads `includePersons`/`excludePersons` as `id:name` pairs; truncates to 5
- `serializeBrowseFilter(filter: BrowseFilter, preserve: Record<string,string>): string`
  - Returns query string; omits defaulted/empty values; resets `page` to 1

**A2. Vitest tests — `src/lib/browse-types.test.ts`**

- Parse: multi-genre, legacy `genre` fallback, sort values, year range, persons
- Serialize: round-trip, omits empty fields, resets page
- Edge cases: yearMin > yearMax (swap), invalid sort (null), >5 persons (truncate)

**A3. `src/lib/tmdb.ts`** — update `discoverMovies` / `discoverTv`

- Accept `DiscoverOptions` object instead of positional args
- Add: `genreIds[]` → `with_genres` (comma-joined); `sortBy` → `sort_by`; `yearMin`/`yearMax` →
  date range params; `withCastIds[]` → `with_cast`; `withCrewIds[]` → `with_crew`
- Keep old positional signature working OR update the two callsites in `page.tsx` together

**A4. `src/lib/browse-utils.ts`** — extend utilities

- Add `getDefaultSort(filterParam: string | null): BrowseSortOrder`
  - Library/seen/friends → `"title"`; TMDB discovery → `"popularity"`
- Add `buildTmdbSortBy(sort: BrowseSortOrder, type: "movie" | "tv"): string`
  - Handles TV `title` fallback to `"popularity.desc"`
- Add `buildPrismaOrderBy(sort: BrowseSortOrder)`
  - Returns Prisma-compatible `orderBy` clause object

---

### Phase B — Browse Page Logic (`page.tsx`)

**B1. New search params**

- Extend `BrowsePageProps.searchParams` with `genres`, `sort`, `yearMin`, `yearMax`,
  `includePersons`, `excludePersons`
- Parse via `parseBrowseFilter(sp)`
- Validate: if `yearMin > yearMax` set `yearError = true` (passed to panel for inline error)

**B2. TMDB-first path updates**

- Pass `DiscoverOptions` to `discoverMovies`/`discoverTv`:
  - `genreIds: filter.genreIds`
  - `sortBy: buildTmdbSortBy(effectiveSort, type)`
  - `yearMin`, `yearMax` from filter
  - `withCastIds` from first-included actor person IDs (see person logic below)
  - `withCrewIds` from first-included director person IDs

**B3. DB-first path updates** (library / seen / friends)

- Multi-genre: `genres: { hasEvery: activeGenreNames }` (resolve IDs → names)
- Year range: `mediaItem: { year: { gte: filter.yearMin ?? undefined, lte: filter.yearMax ?? undefined } }`
- Person include: `AND: filter.includePersons.map(p => ({ OR: [{ castTmdbIds: { has: p.id } }, { directorsTmdbIds: { has: p.id } }] }))`
- Person exclude: post-filter results after query — exclude items where `cast` or `directors`
  contains any excluded person name (case-insensitive `includes`)
- Sort: `orderBy: buildPrismaOrderBy(effectiveSort)`

**B4. Person post-filtering on TMDB-first path**

- After TMDB fetch, if `filter.includePersons.length > 1` or `filter.excludePersons.length > 0`:
  - Query `MediaItem` table for returned `tmdbId`s to get `castTmdbIds`, `directorsTmdbIds`,
    `cast`, `directors`
  - Post-filter: keep only items where ALL include persons appear in cast/crew IDs; remove items
    where ANY exclude person name appears (substring, case-insensitive)
  - Items not in local DB cannot be filtered — they pass through (acceptable per spec assumptions)

**B5. `buildPageUrl` update**

- Include all new params in the serialized URL

**B6. `"all"` tab guard**

- When `type === "all"`: skip filter parsing entirely; pass `disabled=true` to the filter panel

---

### Phase C — UI Components

**C1. `src/app/(app)/browse/person-tag-input.tsx`** (new, `"use client"`)

- Props: `label`, `persons: PersonFilterItem[]`, `maxCount: 5`, `onChange`
- Local state: `query` string, `suggestions: PersonFilterItem[]`, `isLoading`
- Behavior:
  - Input fires `debounced` fetch to `/api/search/person?q=<query>` after 300ms if query ≥ 2 chars
  - Suggestions dropdown (up to 8 results)
  - Click suggestion → add chip; chip × → remove
  - When count reaches `maxCount`, disable input
- Renders: text input + dropdown (Radix Popover or simple `<ul>`) + chip list

**C2. `src/app/(app)/browse/browse-filter-panel.tsx`** (new, `"use client"`)

- Props: `genres`, `filter: BrowseFilter`, `type`, `filterParam`, `isLoggedIn`, `yearError?`
- Local state: `open: boolean` (panel collapsed/expanded), plus a local draft of the filter that
  is applied atomically via `router.push` when any control changes
- Sections (shown when open):
  1. Type toggle (movie / tv / all) — always visible as header row even when collapsed
  2. Sort dropdown — hidden when `type=all`
  3. Genre pills (multi-select toggle) — hidden when `type=all`
  4. User-scope filter (seen / unseen / library / friends) — logged-in only, not `type=all`
  5. Year range inputs (two `<input type="number">` fields) — hidden when `type=all`
  6. Include persons `PersonTagInput` — hidden when `type=all`
  7. Exclude persons `PersonTagInput` — hidden when `type=all`
  8. "Clear filters" button — visible when any non-default filter is active
- Collapses/expands in place above results via CSS `max-height` transition

**C3. Remove `browse-filters.tsx`** after `BrowseFilterPanel` is wired in `page.tsx`

---

### Phase D — E2E Tests

**`e2e/browse-filter.spec.ts`**

- Test: select two genres → results contain both genre labels on first title
- Test: select "Rating: High to Low" sort → first result has rating ≥ second
- Test: set year range 1990–2000 → spot-check first result year
- Test: clear filters → URL has no filter params, results reset
- Test: URL with `?genres=28,35&sort=rating_desc` loads correctly (shareable link)

---

## Commit Plan

1. `feat(browse): add BrowseFilter types and parse/serialize utilities` — `browse-types.ts`
2. `test(browse): add Vitest tests for browse-types parse and serialize` — `browse-types.test.ts`
3. `feat(browse): extend discoverMovies/discoverTv with DiscoverOptions` — `tmdb.ts`
4. `feat(browse): add sort helpers and multi-genre utils to browse-utils` — `browse-utils.ts`
5. `feat(browse): add PersonTagInput component` — `person-tag-input.tsx`
6. `feat(browse): replace browse-filters with collapsible BrowseFilterPanel` — `browse-filter-panel.tsx`
7. `feat(browse): update browse page for multi-genre, sort, year, and person filters` — `page.tsx`
8. `test(browse): add Playwright E2E for filter and sort flows` — `browse-filter.spec.ts`

## Complexity Tracking

No Constitution violations.
