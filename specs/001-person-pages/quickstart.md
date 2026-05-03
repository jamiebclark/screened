# Quickstart: Person/Cast/Crew Detail Pages

**Feature**: 001-person-pages  
**For**: Developers working on or extending this feature

---

## Testing Locally

### 1. Start Development Server

```bash
cd /Users/jclark/code/screened
yarn dev
```

Server runs at `http://localhost:3000`

### 2. Navigate to a Movie or TV Page

Example URLs:

```
http://localhost:3000/movies/13        # Forrest Gump
http://localhost:3000/tv/1396          # Breaking Bad
```

### 3. View Cast & Crew

Scroll down on the title page to find the "Cast & Crew" section below the overview.

### 4. Click on a Person

Click any cast member or director name to navigate to their person page:

```
http://localhost:3000/person/31       # Tom Hanks
```

### 5. View Filmography

Person page shows:

- Profile photo and bio
- Movies section (titles from your library)
- TV Shows section (titles from your library)
- Watch status badges on each title

---

## Manual Testing Checklist

Copy this checklist for QA:

```markdown
## Person Page Display

- [ ] Person name displays as h1
- [ ] Profile photo loads (or initials fallback shown)
- [ ] Known for department displays (e.g., "Acting")
- [ ] Biography displays if available
- [ ] Empty filmography shows helpful message

## Filmography Sections

- [ ] Movies section has correct titles
- [ ] TV Shows section has correct titles
- [ ] Titles are sorted by release date (newest first)
- [ ] Only titles from connected libraries appear
- [ ] Posters load correctly
- [ ] Release years display

## Watch Status Indicators

- [ ] Watched titles have checkmark/badge
- [ ] Watchlist titles have bookmark icon
- [ ] User ratings display correctly
- [ ] Unwatched titles have no indicator

## Title Page Cast/Crew

- [ ] Movie page shows director name
- [ ] Movie page shows up to 8 cast members
- [ ] TV page shows creator name
- [ ] TV page shows up to 8 cast members
- [ ] Cast names are clickable links
- [ ] Clicking cast navigates to person page

## Edge Cases

- [ ] Person with 0 titles in library (empty state)
- [ ] Person with 50+ titles (performance OK)
- [ ] Person with missing profile photo (initials shown)
- [ ] Person with no biography (section hidden)
- [ ] Invalid person ID returns 404 page

## Responsive Layout

- [ ] Person page works on mobile (< 640px)
- [ ] Filmography grid adapts to screen size
- [ ] Cast/crew section wraps properly on narrow screens
```

---

## Key Files Reference

### Person Page Implementation

```
src/app/(app)/person/[tmdbId]/page.tsx
```

Main Server Component that:

- Fetches person details from TMDB
- Queries filmography from database
- Renders person profile and filmography sections

### Filmography Queries

```
src/lib/person-filmography-queries.ts
```

Database queries to find titles featuring a person:

- `getPersonFilmography(personName, userId)`: Main filmography query
- Returns movies and TV shows separately with watch status

### TMDB Person API

```
src/lib/tmdb.ts
```

TMDB integration functions:

- `getPerson(tmdbId)`: Fetch person details
- `searchPersonByName(name)`: Resolve name to TMDB ID
- `tmdbImage(path, size)`: Generate image URLs

### UI Components

```
src/components/person-filmography.tsx
src/components/person-cast-crew-section.tsx
src/components/person-avatar.tsx
```

Reusable components for person pages and title pages.

---

## Adding Person Links to New Title Pages

If you create a new title page or custom view that should show cast/crew:

```typescript
import { PersonCastCrewSection } from "@/components/person-cast-crew-section";

// In your Server Component:
const mediaItem = await prisma.mediaItem.findUnique({
  where: { tmdbId_type: { tmdbId, type: "MOVIE" } },
  select: { cast: true, director: true },
});

// In your JSX:
<PersonCastCrewSection
  cast={mediaItem.cast}
  director={mediaItem.director}
/>
```

The component will automatically:

- Resolve names to TMDB person IDs
- Create clickable links to person pages
- Handle missing/invalid person IDs gracefully

---

## Extending Filmography Queries

To add new filters or sorting options:

### Example: Filter by Decade

```typescript
// In person-filmography-queries.ts
export async function getPersonFilmographyByDecade(
  personName: string,
  userId: string,
  decade: number, // e.g., 1990
) {
  const startYear = decade;
  const endYear = decade + 9;

  return prisma.$queryRaw`
    SELECT mi.*, ums.status, ums.rating
    FROM "MediaItem" mi
    LEFT JOIN "UserMediaStatus" ums 
      ON ums."mediaItemId" = mi.id AND ums."userId" = ${userId}
    WHERE (mi.cast @> ARRAY[${personName}]::text[] OR mi.director = ${personName})
      AND EXTRACT(YEAR FROM mi."releaseDate") BETWEEN ${startYear} AND ${endYear}
    ORDER BY mi."releaseDate" DESC
  `;
}
```

### Example: Sort by User Rating

```typescript
// Add to existing query
ORDER BY
  COALESCE(ums.rating, 0) DESC,  // Rated items first, highest rating first
  mi."releaseDate" DESC            // Then by date
```

---

## Performance Optimization

### If Filmography Queries are Slow (>500ms)

Add database indexes:

```sql
-- In psql or Prisma Studio SQL tab:
CREATE INDEX CONCURRENTLY idx_media_item_cast_gin
  ON "MediaItem" USING gin(cast);

CREATE INDEX CONCURRENTLY idx_media_item_director
  ON "MediaItem"(director)
  WHERE director IS NOT NULL;
```

Verify performance improvement:

```sql
EXPLAIN ANALYZE
SELECT * FROM "MediaItem"
WHERE cast @> ARRAY['Tom Hanks']::text[]
   OR director = 'Tom Hanks';
```

Look for "Index Scan" instead of "Seq Scan" in output.

### If TMDB API Calls are Too Frequent

Check cache hit rate in browser Network tab:

- Person details should cache 7 days (604800s)
- Person search should cache 7 days
- If seeing repeated calls, verify `next: { revalidate: 604800 }` in fetch

---

## Debugging Tips

### Person Page Doesn't Load

Check these in order:

1. **Is TMDB person ID valid?**

   ```bash
   curl "https://api.themoviedb.org/3/person/31" \
     -H "Authorization: Bearer $TMDB_API_KEY"
   ```

   Should return 200 with person data.

2. **Is TMDB API key configured?**

   ```bash
   echo $TMDB_API_KEY
   ```

   Should print API key. If not, add to `.env`:

   ```
   TMDB_API_KEY=your_key_here
   ```

3. **Check server logs**:
   Look for errors in terminal running `yarn dev`

### Filmography is Empty (But Should Have Titles)

1. **Verify person name matches MediaItem data**:

   ```sql
   SELECT title, cast, director
   FROM "MediaItem"
   WHERE cast @> ARRAY['Tom Hanks']::text[]
      OR director = 'Tom Hanks';
   ```

   Should return titles. If not, name doesn't match exactly.

2. **Check for typos or name variations**:

   ```sql
   SELECT DISTINCT unnest(cast) as name
   FROM "MediaItem"
   WHERE unnest(cast) LIKE '%Hanks%';
   ```

   Shows all names containing "Hanks".

3. **Verify user is authenticated**:
   Filmography query requires `userId`. Check session in browser DevTools:
   ```javascript
   fetch("/api/auth/session")
     .then((r) => r.json())
     .then(console.log);
   ```

### Cast Links Don't Work on Title Pages

1. **Check person name resolution**:
   Open browser console on title page, check for errors like:

   ```
   Error: TMDB person search failed for "Unknown Actor"
   ```

2. **Verify TMDB search results**:

   ```bash
   curl "https://api.themoviedb.org/3/search/person?query=Tom%20Hanks" \
     -H "Authorization: Bearer $TMDB_API_KEY"
   ```

   Should return results with `id` field.

3. **Check component props**:
   Inspect PersonCastCrewSection in React DevTools:
   - `cast` should be array of strings
   - `director` should be string or null

---

## Common Issues & Solutions

| Issue                              | Cause                                    | Solution                                    |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------- |
| "No titles found" on person page   | Person name doesn't match MediaItem data | Check exact name spelling in database       |
| Profile photo doesn't load         | TMDB profile_path is null                | Verify initials fallback displays           |
| Person search returns wrong person | Multiple people with same name           | Taking most popular is expected behavior    |
| Filmography query slow (>1s)       | No database index on cast array          | Add GIN index (see Performance section)     |
| 429 rate limit errors              | Too many TMDB API calls                  | Check cache is working (7-day revalidation) |
| Person page 404s                   | Invalid TMDB person ID                   | Verify ID exists in TMDB                    |

---

## Testing Commands

### Run Unit Tests

```bash
yarn test src/lib/tmdb.test.ts
yarn test src/lib/person-filmography-queries.test.ts
```

### Run E2E Tests

```bash
yarn test:e2e e2e/person-pages.spec.ts
yarn test:e2e e2e/title-cast-crew.spec.ts
```

### Full CI Check

```bash
yarn ci:check
```

Runs: lint, format check, prisma migrate, tests, build.

---

## Related Documentation

- [Feature Spec](./spec.md): User stories and requirements
- [Implementation Plan](./plan.md): Technical architecture and phases
- [Data Model](./data-model.md): Database schema and query patterns
- [TMDB API Contract](./contracts/tmdb-person-api.md): API endpoints and types
- [UI/UX Standards](../../../docs/ui-ux-standards.md): Layout and component guidelines

---

## Getting Help

- Check existing person pages in production: [example production URLs if deployed]
- Review similar features: Movie pages (`src/app/(app)/movies/[tmdbId]/page.tsx`)
- TMDB API docs: https://developers.themoviedb.org/3/
- CLAUDE.md: Project conventions and patterns
