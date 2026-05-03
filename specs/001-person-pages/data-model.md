# Data Model: Person/Cast/Crew Detail Pages

**Feature**: 001-person-pages  
**Date**: 2026-05-03

## Overview

This feature uses **existing database schema** (no migrations required) and extends TMDB API integration. Person data is fetched on-demand from TMDB and not stored in the database.

---

## Existing Entities (No Changes)

### MediaItem

**Purpose**: Stores metadata for movies and TV shows, including cast and director information.

**Relevant Fields**:

```prisma
model MediaItem {
  id          String    @id @default(cuid())
  tmdbId      Int
  type        MediaType  // MOVIE or TV
  title       String
  poster      String?
  releaseDate DateTime?
  cast        String[]   @default([])  // Up to 8 cast member names
  director    String?                  // Primary director/creator name
  // ... other fields
}
```

**Usage in Feature**:

- Cast and director arrays are queried to build person filmographies
- No schema changes needed
- Existing data populated by TMDB sync during media library imports

**Query Pattern**:

```sql
-- Find all titles featuring a person
SELECT * FROM "MediaItem"
WHERE cast @> ARRAY['Tom Hanks']::text[]
   OR director = 'Tom Hanks';
```

### UserMediaStatus

**Purpose**: Tracks user's watch status and rating for each title.

**Relevant Fields**:

```prisma
model UserMediaStatus {
  id          String      @id @default(cuid())
  userId      String
  mediaItemId String
  status      WatchStatus  // WATCHLIST, WATCHING, WATCHED, DROPPED
  rating      Float?
  // ... other fields

  @@unique([userId, mediaItemId])
}
```

**Usage in Feature**:

- Joined with MediaItem in filmography queries to show watch status indicators
- No changes needed

---

## New Virtual Entities (Not Stored)

### Person

**Purpose**: Represents a person (actor, director, crew) from TMDB. Fetched on-demand, not stored in database.

**Source**: TMDB API `/person/{person_id}`

**TypeScript Interface**:

```typescript
export interface Person {
  tmdbId: number;
  name: string;
  profilePath: string | null; // TMDB image path
  biography: string;
  birthday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string; // "Acting", "Directing", "Writing", etc.
  popularity: number;
}
```

**API Response Mapping**:

```typescript
// TMDB API response → Person interface
function mapTmdbPerson(tmdbData: TmdbPersonResponse): Person {
  return {
    tmdbId: tmdbData.id,
    name: tmdbData.name,
    profilePath: tmdbData.profile_path,
    biography: tmdbData.biography || "",
    birthday: tmdbData.birthday,
    placeOfBirth: tmdbData.place_of_birth,
    knownForDepartment: tmdbData.known_for_department || "Unknown",
    popularity: tmdbData.popularity,
  };
}
```

### PersonFilmographyItem

**Purpose**: Represents a single title in a person's filmography with user-specific watch status.

**Source**: Derived from MediaItem + UserMediaStatus join query

**TypeScript Interface**:

```typescript
export interface PersonFilmographyItem {
  // From MediaItem
  tmdbId: number;
  type: "MOVIE" | "TV";
  title: string;
  poster: string | null;
  releaseDate: Date | null;

  // From UserMediaStatus (null if user hasn't tracked)
  watchStatus: "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED" | null;
  userRating: number | null;

  // Person's role in this title
  role: "cast" | "director"; // Was this person acting or directing?
}
```

### PersonFilmography

**Purpose**: Complete filmography for a person, organized by media type.

**TypeScript Interface**:

```typescript
export interface PersonFilmography {
  person: Person;
  movies: PersonFilmographyItem[];
  tvShows: PersonFilmographyItem[];
  totalCount: number;
}
```

---

## Query Specifications

### 1. Get Person Filmography

**Function**: `getPersonFilmography(personName: string, userId: string)`

**Purpose**: Find all titles in user's library featuring the specified person.

**Query Logic**:

```typescript
// Pseudocode for Prisma raw query
const items = await prisma.$queryRaw`
  SELECT 
    mi.id,
    mi."tmdbId",
    mi.type,
    mi.title,
    mi.poster,
    mi."releaseDate",
    ums.status as "watchStatus",
    ums.rating as "userRating",
    CASE 
      WHEN mi.cast @> ARRAY[${personName}]::text[] THEN 'cast'
      WHEN mi.director = ${personName} THEN 'director'
      ELSE null
    END as role
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

// Then group by type in application code:
const movies = items.filter((i) => i.type === "MOVIE");
const tvShows = items.filter((i) => i.type === "TV");
```

**Performance**:

- Expected time: <100ms for typical library (< 5000 titles)
- Uses PostgreSQL array containment operator (efficient)
- If slow, can add GIN index: `CREATE INDEX idx_media_item_cast_gin ON "MediaItem" USING gin(cast);`

**Edge Cases**:

- Person not in any titles: Returns empty arrays
- Person appears in title as both cast and director: Role will be 'cast' (precedence)
- User has no watch status for titles: watchStatus and userRating will be null

### 2. Search Person by Name

**Function**: `searchPersonByName(name: string)`

**Purpose**: Resolve person name to TMDB person ID for creating links.

**Query Logic**:

```typescript
// Calls TMDB API, not database
const response = await fetch(
  `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`,
  {
    headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    next: { revalidate: 604800 }, // Cache 7 days
  },
);

const data = await response.json();
// Return first result (most popular person with that name)
return data.results[0]?.id ?? null;
```

**Caching**: 7-day revalidation via Next.js fetch cache

**Edge Cases**:

- Name not found: Returns null (render name without link)
- Multiple matches: Takes first (most popular)
- Exact match vs. fuzzy: TMDB search handles variations

---

## Data Flow Diagrams

### Person Page Load Flow

```
1. User navigates to /person/[tmdbId]
   ↓
2. Server Component fetches person details from TMDB API
   (cached 7 days)
   ↓
3. Extract person.name
   ↓
4. Query database for filmography:
   SELECT MediaItem WHERE cast contains name OR director = name
   JOIN UserMediaStatus for watch status
   ↓
5. Group results by media type (movies, TV shows)
   ↓
6. Render page with person info + filmography grid
```

### Title Page Cast Display Flow

```
1. User views movie/TV page
   ↓
2. Server Component loads MediaItem (already has cast/director)
   ↓
3. For each cast member name:
   a. Call searchPersonByName(name) → TMDB API (cached)
   b. Get person TMDB ID
   c. Generate link: /person/{tmdbId}
   ↓
4. Render cast list with clickable links
```

---

## Performance Considerations

### Database Queries

- **Filmography query**: O(n) scan of MediaItem table
  - Worst case: Full table scan (~5000 rows typical)
  - Expected time: <100ms without index
  - Optimization available: GIN index on cast array

- **Watch status join**: O(1) with unique index on (userId, mediaItemId)

### API Calls

- **TMDB person detail**: 1 call per person page visit (cached 7 days)
- **TMDB person search**: 1 call per cast member name (cached 7 days)
- **Rate limit**: 40 requests/10 seconds (sufficient with caching)

### Caching Strategy

| Data Type             | Cache Duration | Cache Location                 |
| --------------------- | -------------- | ------------------------------ |
| Person details        | 7 days         | Next.js fetch cache (CDN edge) |
| Person search results | 7 days         | Next.js fetch cache            |
| Filmography results   | No cache       | Database query (user-specific) |

---

## Validation Rules

### Person Name

- Required when querying filmography
- Must match exactly to cast/director values in MediaItem (case-sensitive)
- No transformation or normalization applied

### TMDB Person ID

- Must be positive integer
- Must exist in TMDB API (validated on fetch)
- If invalid/not found, render 404 page

### Filmography Items

- Must have valid tmdbId and type
- releaseDate can be null (some titles lack dates)
- watchStatus can be null (user hasn't tracked)

---

## Schema Migration Status

**No migrations required for this feature.**

All necessary data already exists in MediaItem.cast and MediaItem.director arrays, populated by existing TMDB sync logic.

Future optimization (only if performance testing shows need):

```sql
-- GIN index for faster array containment queries
CREATE INDEX CONCURRENTLY idx_media_item_cast_gin
  ON "MediaItem" USING gin(cast);

-- B-tree index for director lookups
CREATE INDEX CONCURRENTLY idx_media_item_director
  ON "MediaItem"(director)
  WHERE director IS NOT NULL;
```

These indexes can be added without downtime using `CONCURRENTLY` flag.
