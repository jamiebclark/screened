# Implementation Plan: Person/Cast/Crew Detail Pages

**Branch**: `001-person-pages` | **Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)

## Summary

Add person detail pages that display cast and crew information on title pages, enable navigation to person-specific pages, and show filmography filtered to the user's connected media libraries. Uses existing MediaItem cast/director data and fetches additional person details from TMDB API.

## Technical Context

**Language/Version**: TypeScript 6, React 19.2.5, Next.js 16.2.4  
**Primary Dependencies**: Next.js App Router, React Server Components, Prisma 7.8.0, Tailwind v4, Radix UI  
**Storage**: PostgreSQL via Prisma (existing MediaItem model with cast/director arrays)  
**Testing**: Vitest 4.1.5 (unit), Playwright 1.59.1 (E2E)  
**Target Platform**: Self-hosted web application (Docker Compose)  
**Project Type**: Full-stack web application (Next.js)  
**Performance Goals**: Person pages load in <2s, filmography queries <500ms for 50 titles  
**Constraints**: Uses existing TMDB API rate limits, server-side rendering for SEO, authenticated users only  
**Scale/Scope**: ~10-20 users per instance, libraries with 100-5000 titles, persons with 1-200 titles per filmography

## Constitution Check

_No project constitution file exists yet — proceeding with standard Next.js + Prisma best practices and existing project conventions from CLAUDE.md and `.cursor/rules/`._

**Checks**:

- ✅ Follows existing route structure (`src/app/(app)/person/[tmdbId]/`)
- ✅ Uses React Server Components for data fetching
- ✅ Follows RSC + client mutations pattern from existing codebase
- ✅ Reuses existing components (MediaCard, watch status badges)
- ✅ No new database schema changes required
- ✅ Follows Conventional Commits for version control
- ✅ Includes E2E tests for critical user journeys

## Project Structure

### Documentation (this feature)

```text
specs/001-person-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── person-api.md    # TMDB person API contract
└── tasks.md             # Phase 2 output (not created by plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (app)/
│       ├── person/
│       │   └── [tmdbId]/
│       │       ├── page.tsx           # Person detail page (RSC)
│       │       └── loading.tsx        # Loading skeleton
│       ├── movies/
│       │   └── [tmdbId]/
│       │       └── page.tsx           # Add cast/crew display (modify)
│       └── tv/
│           └── [tmdbId]/
│               └── page.tsx           # Add cast/crew display (modify)
├── components/
│   ├── person-filmography.tsx         # Filmography grid component (client)
│   ├── person-cast-crew-section.tsx   # Cast/crew list for title pages (client)
│   └── person-avatar.tsx              # Person photo with fallback (client)
├── lib/
│   ├── tmdb.ts                        # Add getPerson(), extend credits types (modify)
│   └── person-filmography-queries.ts  # Query MediaItems by person name
└── types/
    └── person.ts                      # TypeScript types for person data

tests/
└── (no new test files needed - extend existing title page tests)

e2e/
├── person-pages.spec.ts               # E2E tests for person browsing
└── title-cast-crew.spec.ts            # E2E tests for cast/crew display
```

**Structure Decision**: Using Next.js App Router structure with route groups. Person pages live under `src/app/(app)/person/[tmdbId]/` following the same pattern as movie and TV pages. Components are split between server (page.tsx) and client ("use client" components) following RSC best practices. Business logic stays in `src/lib/` per existing conventions.

## Complexity Tracking

_No Constitution Check violations — this feature aligns with existing architecture patterns._

---

## Phase 0: Outline & Research

### Research Topics

1. **TMDB Person API**: What endpoints and data are available for person details?
2. **Person Name Matching**: How to reliably match person names from MediaItem cast/director arrays to TMDB person IDs?
3. **Filmography Query Performance**: Best approach for querying MediaItems with array contains (`cast @> ['Name']`) in PostgreSQL?
4. **Profile Photo Handling**: TMDB person profile image URLs, sizes, and fallback strategies
5. **Next.js ISR/Caching**: Appropriate revalidation strategy for person pages (balance freshness vs. TMDB rate limits)

### Research Output

See [research.md](./research.md) for detailed findings on each topic.

---

## Phase 1: Design & Contracts

### Design Artifacts

1. **Data Model** ([data-model.md](./data-model.md)):
   - No new Prisma models required
   - Query patterns for MediaItem filmography lookup
   - TMDB person API response types

2. **Contracts** ([contracts/](./contracts/)):
   - TMDB Person API contract documentation
   - Person page URL structure (`/person/[tmdbId]`)
   - Component props interfaces

3. **Quickstart** ([quickstart.md](./quickstart.md)):
   - How to test person pages locally
   - How to add person links to new title pages
   - How to extend filmography queries

### Agent Context Update

Update CLAUDE.md between `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers:

```markdown
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/001-person-pages/plan.md
```

---

## Implementation Phases

### Phase 1: TMDB Person API Integration

**Files to create/modify**:

- `src/lib/tmdb.ts` (modify)
- `src/types/person.ts` (create)

**Tasks**:

1. Add `TmdbPerson` interface matching TMDB person API response
2. Implement `getPerson(tmdbId: number)` function with caching
3. Implement `getPersonMovieCredits(tmdbId: number)` and `getPersonTvCredits(tmdbId: number)`
4. Add person profile image helper to existing `tmdbImage()` function
5. Add unit tests for new TMDB functions

### Phase 2: Person Filmography Queries

**Files to create/modify**:

- `src/lib/person-filmography-queries.ts` (create)

**Tasks**:

1. Implement `getPersonFilmography(personName: string, userId: string)`
   - Query MediaItems where cast contains name OR director matches name
   - Join with UserMediaStatus to get watch status
   - Group by media type (MOVIE/TV)
   - Sort by release date descending
2. Optimize query with appropriate indexes (document in comments, no migration needed unless performance issue)
3. Add unit tests for filmography query logic

### Phase 3: Person Detail Page

**Files to create**:

- `src/app/(app)/person/[tmdbId]/page.tsx` (RSC)
- `src/app/(app)/person/[tmdbId]/loading.tsx`

**Tasks**:

1. Create person page route with RSC data fetching
2. Fetch person details from TMDB
3. Extract person name and query filmography
4. Render person profile (photo, name, known_for)
5. Display filmography sections (Movies, TV Shows)
6. Add metadata for SEO
7. Handle empty filmography state
8. Handle missing/invalid person TMDB ID (404)

### Phase 4: Filmography Display Components

**Files to create**:

- `src/components/person-filmography.tsx` (client component)
- `src/components/person-avatar.tsx` (client component)

**Tasks**:

1. Create PersonFilmography component that takes filmography data
2. Reuse MediaCard component for title display
3. Add watch status badges to filmography items
4. Group titles by media type with section headings
5. Handle empty filmography state with helpful message
6. Add PersonAvatar component with fallback to initials
7. Ensure responsive layout (matches existing page patterns)

### Phase 5: Cast/Crew Display on Title Pages

**Files to modify**:

- `src/app/(app)/movies/[tmdbId]/page.tsx`
- `src/app/(app)/tv/[tmdbId]/page.tsx`

**Files to create**:

- `src/components/person-cast-crew-section.tsx` (client component)

**Tasks**:

1. Fetch cast/director from existing MediaItem record (already available)
2. Create PersonCastCrewSection component that displays cast list + director
3. Each person name is a clickable link to `/person/[tmdbId]`
   - **Challenge**: MediaItem stores names as strings, but we need TMDB person IDs for links
   - **Solution**: Use TMDB search API to resolve name → person ID on-demand with caching
4. Add profile photos from TMDB (optional, can be added after MVP)
5. Display on movie page below watch history section
6. Display on TV show page below overview
7. Match existing section styling (follows `docs/ui-ux-standards.md`)

### Phase 6: Person Name to TMDB ID Resolution

**Files to modify**:

- `src/lib/tmdb.ts`

**Files to create**:

- `src/lib/person-name-cache.ts` (optional in-memory cache)

**Tasks**:

1. Implement `searchPersonByName(name: string)` using TMDB search API
2. Take first result (most popular person with that name)
3. Add caching layer to avoid repeated API calls for same names
4. Handle cases where person is not found (render name without link)
5. Consider server-side caching with Next.js cache() or Redis (start with Next.js cache)

### Phase 7: Testing

**Files to create**:

- `e2e/person-pages.spec.ts`
- `e2e/title-cast-crew.spec.ts`

**Tasks**:

1. Add E2E test: Navigate from movie page cast to person page
2. Add E2E test: Person page displays filmography filtered to library
3. Add E2E test: Watch status indicators on person filmography
4. Add E2E test: Empty filmography state
5. Extend existing title page E2E tests to verify cast/crew section
6. Add unit tests for person filmography queries
7. Add unit tests for TMDB person API integration

### Phase 8: Polish & Performance

**Tasks**:

1. Add loading skeletons for person page
2. Optimize filmography query performance (add indexes if needed)
3. Verify TMDB API caching (7-day revalidation per spec)
4. Test with large filmographies (100+ titles)
5. Verify responsive layout on mobile
6. Run `yarn ci:check` to validate lint, format, tests
7. Manual testing in dev environment

---

## Testing Strategy

### Unit Tests (Vitest)

- TMDB person API functions (`src/lib/tmdb.ts`)
- Filmography query logic (`src/lib/person-filmography-queries.ts`)
- Person name to ID resolution with mocked TMDB responses

### E2E Tests (Playwright)

- P1: Cast/crew display on title pages
- P1: Navigation from title to person page
- P2: Person filmography displays correct titles from library
- P2: Watch status indicators on person filmography
- P3: Empty filmography state handling

### Manual Testing Checklist

- [ ] Person page loads with profile photo
- [ ] Filmography shows only titles from connected libraries
- [ ] Watch status badges match actual watch history
- [ ] Cast/crew section appears on movie and TV pages
- [ ] Clicking cast member navigates to person page
- [ ] Person page handles missing profile photo gracefully
- [ ] Person page handles empty filmography with clear message
- [ ] Large filmographies (50+ titles) load in <2 seconds
- [ ] Mobile responsive layout works correctly

---

## Deployment Notes

- No database migrations required
- No new environment variables required (uses existing `TMDB_API_KEY`)
- TMDB API rate limits: 40 requests/10 seconds — person pages cache responses
- Person pages use Next.js ISR with 7-day revalidation
- Consider adding database indexes if filmography queries are slow:
  ```sql
  -- Only if performance testing shows need
  CREATE INDEX CONCURRENTLY idx_media_item_cast_gin ON "MediaItem" USING gin(cast);
  CREATE INDEX CONCURRENTLY idx_media_item_director ON "MediaItem"(director);
  ```

---

## Open Questions

1. **Should we pre-resolve person names to TMDB IDs during media sync?**
   - Pro: Faster person page links on title pages
   - Con: Additional TMDB API calls during sync, more complex sync logic
   - **Decision**: Start with on-demand resolution, optimize later if needed

2. **Should we store TMDB person IDs alongside cast names in MediaItem?**
   - Pro: Eliminates name→ID lookup on every title page render
   - Con: Requires schema migration, sync logic changes
   - **Decision**: Defer until we see performance impact in production

3. **Should we add pagination/infinite scroll for large filmographies?**
   - Pro: Better performance for prolific actors (100+ titles)
   - Con: Adds complexity
   - **Decision**: Start without pagination, add if >50 titles is common
