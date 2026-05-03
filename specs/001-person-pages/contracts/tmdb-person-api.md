# TMDB Person API Contract

**Feature**: 001-person-pages  
**API Provider**: The Movie Database (TMDB)  
**Base URL**: `https://api.themoviedb.org/3`  
**Authentication**: Bearer token in Authorization header

---

## Endpoints Used

### 1. Get Person Details

**Endpoint**: `GET /person/{person_id}`

**Purpose**: Fetch complete profile information for a person.

**Request**:

```http
GET /person/31?append_to_response=external_ids
Authorization: Bearer {TMDB_API_KEY}
```

**Response** (200 OK):

```json
{
  "id": 31,
  "name": "Tom Hanks",
  "biography": "Thomas Jeffrey Hanks (born July 9, 1956) is an American actor...",
  "birthday": "1956-07-09",
  "place_of_birth": "Concord, California, USA",
  "profile_path": "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg",
  "known_for_department": "Acting",
  "popularity": 78.532,
  "external_ids": {
    "imdb_id": "nm0000158",
    "facebook_id": "TomHanks",
    "instagram_id": "tomhanks",
    "twitter_id": "tomhanks"
  }
}
```

**Fields Used**:

- `id`: TMDB person ID (unique identifier)
- `name`: Full name for display and filmography matching
- `profile_path`: Image path (null if no photo)
- `known_for_department`: Primary role (e.g., "Acting", "Directing")
- `biography`: Optional long-form text
- `birthday`, `place_of_birth`: Optional biographical data

**Error Responses**:

- `404 Not Found`: Person ID doesn't exist
- `401 Unauthorized`: Invalid API key
- `429 Too Many Requests`: Rate limit exceeded

**Caching Strategy**: 7 days (604800 seconds)

---

### 2. Search Person

**Endpoint**: `GET /search/person`

**Purpose**: Resolve person name to TMDB person ID.

**Request**:

```http
GET /search/person?query=Tom%20Hanks&include_adult=false&page=1
Authorization: Bearer {TMDB_API_KEY}
```

**Response** (200 OK):

```json
{
  "page": 1,
  "results": [
    {
      "id": 31,
      "name": "Tom Hanks",
      "known_for_department": "Acting",
      "profile_path": "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg",
      "popularity": 78.532,
      "known_for": [
        {
          "id": 13,
          "title": "Forrest Gump",
          "media_type": "movie"
        }
      ]
    },
    {
      "id": 1234567,
      "name": "Tom Hanks Jr.",
      "known_for_department": "Production",
      "popularity": 2.145
    }
  ],
  "total_pages": 1,
  "total_results": 2
}
```

**Usage Pattern**:

- Take first result (highest popularity)
- Return `results[0].id` or `null` if no results

**Query Parameters**:

- `query`: Person name (URL-encoded)
- `include_adult`: false (filter adult content)
- `page`: 1 (we only need first page)

**Caching Strategy**: 7 days (name→ID mapping rarely changes)

---

### 3. Get Person Movie Credits

**Endpoint**: `GET /person/{person_id}/movie_credits`

**Purpose**: Get complete movie filmography (all movies person appeared in or worked on).

**Request**:

```http
GET /person/31/movie_credits
Authorization: Bearer {TMDB_API_KEY}
```

**Response** (200 OK):

```json
{
  "cast": [
    {
      "id": 13,
      "title": "Forrest Gump",
      "character": "Forrest Gump",
      "release_date": "1994-07-06",
      "poster_path": "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
      "order": 0
    }
  ],
  "crew": [
    {
      "id": 120,
      "title": "That Thing You Do!",
      "job": "Director",
      "department": "Directing",
      "release_date": "1996-10-04",
      "poster_path": "/6W7jnk5SiCz6jMmZ1kBnqLX7j8C.jpg"
    }
  ]
}
```

**Usage**: Cross-reference `cast[].id` and `crew[].id` with our MediaItem.tmdbId to filter to library titles only.

**Note**: This endpoint is NOT used in current implementation (we query MediaItem directly). Documented for potential future enhancement.

---

### 4. Get Person TV Credits

**Endpoint**: `GET /person/{person_id}/tv_credits`

**Purpose**: Get complete TV show filmography.

**Response Structure**: Same as movie_credits but with TV-specific fields (`name` instead of `title`, `first_air_date` instead of `release_date`).

**Note**: Also not used in current implementation (query MediaItem directly).

---

## Image URLs

**Profile Photos**:

```
https://image.tmdb.org/t/p/{size}{profile_path}
```

**Available Sizes**:

- `w45`: 45px wide (thumbnails)
- `w185`: 185px wide (recommended for person pages)
- `h632`: 632px high (high-res)
- `original`: Full resolution

**Fallback**: If `profile_path` is `null`, show initials-based avatar.

---

## Rate Limits

**TMDB API Limits**:

- 40 requests per 10 seconds
- 500 requests per day (soft limit, can request increase)

**Our Caching Strategy**:

- Person details: 7-day cache → ~1 request per person per week
- Person search: 7-day cache → ~8 requests per title page per week (for 8 cast members)
- Worst case: 100 unique persons per day = 100 API calls (well under limit)

**Rate Limit Response**:

```json
{
  "status_code": 25,
  "status_message": "Your request count (# of requests) is over the allowed limit of (#).",
  "success": false
}
```

**Handling**: If rate limited, serve stale cache or degrade gracefully (show names without links).

---

## Error Handling

### Client-Side Errors (4xx)

- **401 Unauthorized**: API key invalid/missing → Log error, return null
- **404 Not Found**: Person doesn't exist → Show 404 page
- **429 Too Many Requests**: Rate limited → Serve stale cache or degrade

### Server-Side Errors (5xx)

- **500 Internal Server Error**: TMDB service issue → Retry once, then return cached data
- **503 Service Unavailable**: TMDB down → Serve stale cache

### Network Errors

- Timeout after 5 seconds
- Retry once with exponential backoff
- If retry fails, log error and return cached data or null

---

## TypeScript Types

```typescript
// Request/Response types for TMDB API

export interface TmdbPersonResponse {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  external_ids?: {
    imdb_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
}

export interface TmdbPersonSearchResult {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  popularity: number;
  known_for: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type: "movie" | "tv";
  }>;
}

export interface TmdbPersonSearchResponse {
  page: number;
  results: TmdbPersonSearchResult[];
  total_pages: number;
  total_results: number;
}
```

---

## Testing Strategy

### Unit Tests

Mock TMDB API responses in tests:

```typescript
// Mock successful person fetch
vi.mocked(fetch).mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    id: 31,
    name: "Tom Hanks",
    profile_path: "/abc.jpg",
    known_for_department: "Acting",
  }),
});

// Mock 404 not found
vi.mocked(fetch).mockResolvedValueOnce({
  ok: false,
  status: 404,
});
```

### Integration Tests

Use real TMDB API with test API key (not in CI/CD):

```typescript
describe("TMDB Person API (integration)", () => {
  it("fetches real person data", async () => {
    const person = await getPerson(31); // Tom Hanks
    expect(person.name).toBe("Tom Hanks");
    expect(person.knownForDepartment).toBe("Acting");
  });
});
```

---

## Contract Guarantees

### What TMDB Guarantees

- `id` is unique and stable (never changes)
- `name` is always present
- `profile_path` may be null
- `known_for_department` may be empty string
- Search results are sorted by popularity (descending)

### What We Must Handle

- Null/missing profile photos
- Empty biographies
- Missing birth dates/places
- Rate limit errors (429)
- Network timeouts
- Invalid person IDs (404)

---

## Future Enhancements

1. **Credits endpoints**: Use `/person/{id}/movie_credits` to show full filmography (not just library titles)
2. **Combined credits**: Use `/person/{id}/combined_credits` to get both movies and TV in one call
3. **Person popularity trends**: Track popularity over time for recommendations
4. **Social media links**: Use external_ids to link to IMDb, Twitter, etc.
