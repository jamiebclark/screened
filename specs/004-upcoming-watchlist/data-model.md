# Data Model: Upcoming from Watchlist

## No schema changes required

`MediaItem.releaseDate DateTime?` already exists (migration `20260503175016`). All reads are via existing models.

## Query Design

### `getUpcomingWatchlistItems(userId: string)`

Returns two arrays derived from two parallel Prisma queries:

```
comingSoon:
  UserMediaStatus
    WHERE userId = $userId
      AND status = 'WATCHLIST'
    JOIN MediaItem
      WHERE releaseDate > NOW()
    ORDER BY releaseDate ASC

justReleased:
  UserMediaStatus
    WHERE userId = $userId
      AND status = 'WATCHLIST'
    JOIN MediaItem
      WHERE releaseDate BETWEEN (NOW() - 30 days) AND NOW()
    ORDER BY releaseDate DESC
```

Both queries select: `mediaItem.{ tmdbId, type, title, poster, releaseDate }`.

### Enrichment backfill (version bump)

In `src/lib/media-item.ts`:

- `CURRENT_ENRICHMENT_VERSION`: 1 → **2**
- `enrichAndEmbed`: after writing cast/keywords, if `item.releaseDate == null`, call `getMovie(tmdbId)` or `getTvShow(tmdbId)` and update `releaseDate` on the record, then stamp `enrichmentVersion = 2`.

## Return Type

```ts
type UpcomingItem = {
  tmdbId: number;
  type: "MOVIE" | "TV";
  title: string;
  poster: string | null;
  releaseDate: Date;
};

type UpcomingWatchlistItems = {
  comingSoon: UpcomingItem[];
  justReleased: UpcomingItem[];
};
```
