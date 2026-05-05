# Data Model: Watchlist Sort & Filter

## Schema Changes

**None required.** All necessary fields already exist on `MediaItem` and `UserMediaStatus`.

## Type Changes

### WatchlistItem (watchlist-client.tsx)

Add `runtime: number | null` to the existing type:

```ts
export type WatchlistItem = {
  id: string;
  status: "WATCHLIST";
  mediaItem: {
    tmdbId: number;
    type: "MOVIE" | "TV";
    title: string;
    poster: string | null;
    year: number | null;
    genres: string[];
    runtime: number | null; // ← new
  };
};
```

## Query Changes

### Watchlist page query (page.tsx)

Add `runtime` to the `mediaItem` select block:

```ts
mediaItem: {
  select: {
    tmdbId: true,
    type: true,
    title: true,
    poster: true,
    year: true,
    genres: true,
    runtime: true,   // ← new
  },
},
```

Add two new entries to `SORT_ORDERS`:

```ts
runtime_asc: { mediaItem: { runtime: { sort: "asc" as const, nulls: "last" as const } } },
runtime_desc: { mediaItem: { runtime: { sort: "desc" as const, nulls: "last" as const } } },
```

Update `searchParams` type to include filter params (read-only, not used by Prisma query — just passed to client):

```ts
interface PageProps {
  searchParams: Promise<{
    sort?: string;
    type?: string;
    genres?: string;
    maxRuntime?: string;
    yearFrom?: string;
    yearTo?: string;
  }>;
}
```

## URL Query Params

| Param        | Type                    | Default                    | Notes                                |
| ------------ | ----------------------- | -------------------------- | ------------------------------------ |
| `sort`       | string                  | omitted (= `added_desc`)   | Server-side: drives Prisma `orderBy` |
| `type`       | `movie` \| `tv`         | omitted (= all)            | Client-side filter                   |
| `genres`     | comma-separated strings | omitted (= all)            | Client-side filter                   |
| `maxRuntime` | integer (minutes)       | omitted (= no limit)       | Client-side filter                   |
| `yearFrom`   | integer (year)          | omitted (= no lower bound) | Client-side filter                   |
| `yearTo`     | integer (year)          | omitted (= no upper bound) | Client-side filter                   |

## Filter Logic (client-side)

All filter params are read from `useSearchParams()`. No React state used for filter values (URL is the single source of truth). Filtering runs in `useMemo`:

```
item passes if:
  - type param absent OR item.mediaItem.type matches (MOVIE/TV)
  - genres param absent OR item.mediaItem.genres intersects selectedGenres (OR logic)
  - maxRuntime param absent OR item.mediaItem.runtime ≤ maxRuntime (null runtime → excluded)
  - yearFrom param absent OR item.mediaItem.year ≥ yearFrom (null year → excluded)
  - yearTo param absent OR item.mediaItem.year ≤ yearTo (null year → excluded)
```

## Runtime Filter Presets

| Label         | maxRuntime value |
| ------------- | ---------------- |
| Up to 1 hour  | 60               |
| Up to 90 min  | 90               |
| Up to 2 hours | 120              |
| Up to 2.5 hrs | 150              |
| Up to 3 hours | 180              |
