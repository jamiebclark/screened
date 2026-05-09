# Data Model: Stats Dashboard

**Branch**: `002-stats-dashboard` | **Date**: 2026-05-06

No schema migrations are required. All data is read from existing tables.

## Source Models (Read-Only)

### MediaItem (relevant fields)

| Field       | Type           | Used For                                        |
| ----------- | -------------- | ----------------------------------------------- |
| `id`        | String         | Join key                                        |
| `title`     | String         | (not needed in stats)                           |
| `mediaType` | MediaType enum | Filter TV for runtime exclusion                 |
| `runtime`   | Int?           | Total hours (movies only; null/0 excluded)      |
| `genres`    | String[]       | Genre breakdown                                 |
| `year`      | Int?           | Decade breakdown                                |
| `cast`      | String[]       | Top actors list                                 |
| `directors` | String[]       | Top directors list (preferred)                  |
| `director`  | String?        | Top directors list (fallback for older records) |

### WatchEntry (relevant fields)

| Field         | Type   | Used For                |
| ------------- | ------ | ----------------------- |
| `userId`      | String | Scope to current user   |
| `mediaItemId` | String | Identify watched titles |

### UserMediaStatus (relevant fields)

| Field    | Type   | Used For                           |
| -------- | ------ | ---------------------------------- |
| `userId` | String | Scope to current user              |
| `rating` | Float? | Ratings histogram + average rating |

## Derived Shape: `StatsData`

Returned by `getStatsData(userId: string)` in `src/lib/stats-queries.ts`.

```typescript
export type StatsData = {
  summary: {
    totalTitles: number; // distinct watched mediaItem count
    totalHoursWatched: number; // sum of runtime (minutes) / 60, rounded
    averageRating: number | null; // avg of UserMediaStatus.rating, null if none
  };
  genreBreakdown: Array<{
    genre: string;
    count: number;
    percentage: number; // 0–100, relative to max genre count
  }>;
  decadeBreakdown: Array<{
    decade: string; // e.g. "1990s"
    count: number;
    percentage: number;
  }>;
  ratingsHistogram: Array<{
    rating: number; // 0.5, 1.0, 1.5, ... 5.0
    count: number;
    percentage: number; // relative to max bucket count
  }>;
  topDirectors: Array<{
    name: string;
    count: number;
  }>;
  topActors: Array<{
    name: string;
    count: number;
  }>;
};
```

## Query Plan

```
Promise.all([
  // Q1: All MediaItem records the user has watched
  prisma.mediaItem.findMany({
    where: { watchEntries: { some: { userId } } },
    select: { id, runtime, genres, year, cast, directors, director, mediaType }
  }),

  // Q2: All non-null ratings for the user
  prisma.userMediaStatus.findMany({
    where: { userId, rating: { not: null } },
    select: { rating }
  }),
])
```

After fetch, all aggregations run in JavaScript:

- **totalTitles**: `watchedItems.length`
- **totalHoursWatched**: `sum(item.runtime ?? 0) / 60`
- **averageRating**: `mean(ratings.map(r => r.rating))`
- **genreBreakdown**: Flatten all `genres[]` arrays → count by genre name → sort desc → add percentage
- **decadeBreakdown**: Derive decade from `year` → count → sort chronologically → add percentage
- **ratingsHistogram**: Count ratings by value across all 10 buckets (0.5–5.0) → add percentage
- **topDirectors**: Flatten `directors[]` + fallback `director` → count → sort desc → take 10
- **topActors**: Flatten `cast[]` → count → sort desc → take 10
