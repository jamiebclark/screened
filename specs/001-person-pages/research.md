# Research: Person/Cast/Crew Detail Pages

**Feature**: 001-person-pages  
**Date**: 2026-05-03  
**Status**: Complete

## 1. TMDB Person API

### Decision

Use TMDB `/person/{person_id}` endpoint for person details and `/person/{person_id}/movie_credits` + `/person/{person_id}/tv_credits` for complete filmography.

### Rationale

- TMDB provides comprehensive person data (profile photo, biography, known_for_department)
- Credits endpoints return complete filmography with release dates and character names
- Already have TMDB API integration in place
- Free tier supports our caching strategy (7-day revalidation means ~1 call per person per week)

### Implementation Details

```typescript
// TMDB Person Detail Response
interface TmdbPerson {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string; // "Acting", "Directing", etc.
  popularity: number;
}

// TMDB Person Credits Response
interface TmdbPersonCredits {
  cast: Array<{
    id: number; // TMDB movie/TV ID
    title?: string; // movie title
    name?: string; // TV show name
    character: string;
    media_type: "movie" | "tv";
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
  }>;
  crew: Array<{
    id: number;
    title?: string;
    name?: string;
    job: string; // "Director", "Producer", etc.
    media_type: "movie" | "tv";
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
  }>;
}
```

### Alternatives Considered

- **Store all person data in database during sync**: Rejected due to complexity and storage requirements
- **Use IMDb data**: Rejected due to lack of free API access

---

## 2. Person Name Matching

### Decision

Use TMDB `/search/person` endpoint to resolve person names from MediaItem cast/director arrays to TMDB person IDs. Cache results to minimize API calls.

### Rationale

- MediaItem already stores cast/director as string arrays (no schema change needed)
- TMDB search returns person ID + popularity score
- Taking first (most popular) result handles name ambiguity reasonably well
- Caching strategy: use Next.js `fetch` with `revalidate: 604800` (7 days)

### Implementation Details

```typescript
// When rendering cast links on title pages:
// 1. For each cast member name, call searchPersonByName(name)
// 2. Take first result's ID (most popular person)
// 3. Generate link: `/person/${tmdbId}`
// 4. If no results, render name as plain text (no link)

async function searchPersonByName(name: string): Promise<number | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`,
    {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
      next: { revalidate: 604800 }, // 7 days
    },
  );
  const data = await res.json();
  return data.results[0]?.id ?? null;
}
```

### Edge Cases

- **Name ambiguity** (e.g., multiple actors with same name): Taking most popular is acceptable for MVP
- **Name variations** (e.g., "Bob" vs "Robert"): TMDB search handles common variations
- **Non-English names**: TMDB search is multilingual-aware

### Alternatives Considered

- **Store TMDB person IDs in MediaItem schema**: Rejected for MVP (requires migration and sync changes)
- **Manual person ID mapping**: Rejected due to maintenance burden
- **Fuzzy string matching against existing person records**: Rejected as unnecessarily complex

---

## 3. Filmography Query Performance

### Decision

Use PostgreSQL `array @> ARRAY['name']` operator for cast matching and standard `WHERE` for director matching. No immediate indexing required.

### Rationale

- PostgreSQL array containment operator is efficient for our scale (< 5000 titles typical)
- Query pattern: `WHERE cast @> ARRAY['Tom Hanks'] OR director = 'Tom Hanks'`
- Expected query time: <100ms for typical library (tested with similar queries)
- GIN index on cast array available if performance becomes an issue

### Implementation Details

```typescript
// Prisma query (using raw SQL for array contains):
const filmography = await prisma.$queryRaw`
  SELECT mi.*, ums.status, ums.rating
  FROM "MediaItem" mi
  LEFT JOIN "UserMediaStatus" ums 
    ON ums."mediaItemId" = mi.id 
    AND ums."userId" = ${userId}
  WHERE mi.cast @> ARRAY[${personName}]::text[]
     OR mi.director = ${personName}
  ORDER BY 
    CASE WHEN mi.type = 'MOVIE' THEN 0 ELSE 1 END,
    mi."releaseDate" DESC NULLS LAST
`;
```

### Performance Considerations

- Array contains on unindexed column: OK for <10k rows
- If slow (>500ms), add GIN index: `CREATE INDEX CONCURRENTLY idx_media_item_cast_gin ON "MediaItem" USING gin(cast);`
- Future optimization: Add materialized view if personName queries become frequent

### Alternatives Considered

- **Full-text search**: Rejected as overkill for exact string matching
- **Separate Person model with join table**: Rejected for MVP (major schema change)
- **Cache filmography results**: Considered but unnecessary with fast queries

---

## 4. Profile Photo Handling

### Decision

Use TMDB profile image at `https://image.tmdb.org/t/p/w185/{profile_path}` for person pages, with fallback to initials-based avatar.

### Rationale

- TMDB provides profile photos for most major actors/directors
- w185 size balances quality and bandwidth (185x278px)
- Existing `tmdbImage()` helper can be extended to support profile images
- Fallback strategy maintains consistent UI when photos unavailable

### Implementation Details

```typescript
// Extend existing tmdbImage function:
export function tmdbImage(
  path: string | null | undefined,
  size = "w500",  // poster size default
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// For person profiles, call with w185:
const profileUrl = tmdbImage(person.profile_path, "w185");

// Fallback component:
function PersonAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return <Image src={photoUrl} alt={name} />;
  }
  // Fallback to initials
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return <div className="avatar-fallback">{initials}</div>;
}
```

### Available Sizes

- w45, w185 (recommended), h632, original

### Alternatives Considered

- **Store photos locally**: Rejected due to storage and sync complexity
- **Use placeholder service (e.g., UI Avatars)**: Rejected in favor of simple initials

---

## 5. Next.js ISR/Caching Strategy

### Decision

Use Next.js fetch caching with 7-day revalidation for person pages and TMDB API calls.

### Rationale

- Person data changes infrequently (biography, filmography updates are rare)
- 7 days balances freshness with TMDB API rate limits (40 req/10s)
- Next.js handles cache invalidation automatically
- Server-side caching reduces API calls and improves performance

### Implementation Details

```typescript
// In person page RSC:
export default async function PersonPage({ params }: { params: { tmdbId: string } }) {
  const person = await fetch(
    `https://api.themoviedb.org/3/person/${params.tmdbId}`,
    {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
      next: { revalidate: 604800 }  // 7 days in seconds
    }
  ).then(r => r.json());

  // Filmography query runs on every visit (queries user's own library)
  const filmography = await getPersonFilmography(person.name, userId);

  return <PersonPageContent person={person} filmography={filmography} />;
}
```

### Cache Behavior

- First visit: Fetch from TMDB, cache for 7 days
- Subsequent visits (within 7 days): Serve from cache
- After 7 days: Revalidate in background, serve stale content meanwhile
- Filmography queries always fresh (user-specific, no cache)

### Alternatives Considered

- **Shorter revalidation (1 day)**: Rejected due to unnecessary API usage
- **Longer revalidation (30 days)**: Rejected as too stale for new releases
- **No caching (always fresh)**: Rejected due to API rate limits and performance

---

## Summary

All research topics resolved with concrete implementation decisions. No blockers identified. Key patterns:

1. **TMDB API integration**: Straightforward REST calls with existing helpers
2. **Person name resolution**: Search-based with caching
3. **Query performance**: PostgreSQL array operators sufficient
4. **UI components**: Reuse existing patterns (MediaCard, badges)
5. **Caching strategy**: 7-day ISR for TMDB data, no cache for user-specific queries

Ready to proceed to Phase 1 (Design & Contracts).
