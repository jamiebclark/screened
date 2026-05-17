# Data Model: Genre-Linked Browse & Discover Page

## No Schema Changes Required

All data needed for this feature exists in the current schema or is sourced from TMDB's API. No migrations needed.

---

## Existing Models Used

### Friendship (read-only)

Used to resolve "friends" for the Friends' Library filter.

```
Friendship { userLowId, userHighId }
```

Query helper: `listFriendUserIds(userId)` in `src/lib/friendship.ts`

### UserMediaStatus (read-only)

Used for seen/unseen, in-library, and friends-library filters.

```
UserMediaStatus { userId, mediaItemId, status: WATCHLIST|WATCHING|WATCHED|DROPPED }
  → MediaItem { tmdbId, type: MOVIE|TV }
```

### MediaItem (read-only)

Genres stored as `String[]` (names only). Used in list item modal.

---

## New TMDB API Wrappers (src/lib/tmdb.ts)

### TmdbGenre

```typescript
type TmdbGenre = { id: number; name: string };
```

### getMovieGenres() → TmdbGenre[]

Endpoint: GET /genre/movie/list
Cache: revalidate 86400s (24h)

### getTvGenres() → TmdbGenre[]

Endpoint: GET /genre/tv/list
Cache: revalidate 86400s (24h)

### discoverMovies(genreId?: number, page?: number) → TmdbSearchResponse

Endpoint: GET /discover/movie?with_genres=&sort_by=popularity.desc&page=
Cache: revalidate 3600s (1h)

### discoverTv(genreId?: number, page?: number) → TmdbSearchResponse

Endpoint: GET /discover/tv?with_genres=&sort_by=popularity.desc&page=
Cache: revalidate 3600s (1h)

---

## Browse Page URL Contract

```
/browse
  ?type=movie|tv|all      — default: movie
  ?genre=<tmdb-genre-id>  — numeric, from detail pages
  ?genreName=<string>     — encoded name, from list modal (resolved server-side)
  ?filter=seen|unseen|library|friends  — optional, logged-in only
  ?page=<number>          — default: 1
```

All params reflected in URL → shareable/bookmarkable.
