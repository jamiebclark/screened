# Screened — Feature Roadmap

Ordered by priority. High-priority features benefit all users immediately. TV-specific features are deferred until episode tracking matures.

---

## High Priority

### Stats Dashboard

Deep watch statistics page showing time watched, genre and decade breakdowns, ratings histogram, and most-watched directors/actors.

**Data available now:** `WatchEntry`, `UserMediaStatus`, `MediaItem` (cast, director, genres, runtime). Mostly query work — aggregate by genre/decade from existing MediaItem metadata, sum runtimes from WatchEntry, histogram ratings from UserMediaStatus. Person pages work already surfaces director/actor data. No new schema required.

**Rough scope:** new `/stats` route, a handful of server-side aggregate queries in `src/lib/`, stat card + chart components.

---

### Watchlist Sort & Filter

Let users sort and filter their watchlist by added date, release year, runtime, genre, and streaming service.

**Data available now:** `UserMediaStatus.createdAt` (added date), `MediaItem` (release year, runtime, genres). Streaming service availability would require a new TMDB "watch providers" API call per title or a stored field. Start without streaming service filter and add it once providers data is stored.

**Rough scope:** filter/sort controls on the existing watchlist page, query param state, extended Prisma query. May want to store `releaseYear` and `runtime` denormalized on `UserMediaStatus` to avoid joins at query time.

---

### Upcoming from Watchlist

Surface watchlist items with known future release dates, sorted by how soon they release.

**Data available now:** TMDB already returns `release_date` for movies and `first_air_date` for TV, but these aren't currently stored on `MediaItem`. Requires a small schema addition and enrichment-time storage. Once stored, the query is simple: watchlist items where `releaseDate > now`, ordered ascending.

**Rough scope:** one new `releaseDate` field on `MediaItem`, migration, enrichment update, new `/upcoming` route or a section on the watchlist page.

---

## Medium Priority (after TV tracking matures)

### "Up Next" / Continue Watching

Show the next unwatched episode for each in-progress TV show, so users know exactly where to resume.

Depends on reliable episode-level tracking via `EpisodeStatus`. Currently Plex sync populates this, but manual TV tracking is sparse.

---

### Show Progress Visualization

Per-show and per-season completion percentage — e.g., "Season 2: 7/10 episodes watched."

Depends on `EpisodeStatus` coverage. Best built after "Up Next" since they share the same episode aggregation logic.

---

### Season-Level Bulk Actions

Mark an entire season as watched at once, rather than episode by episode.

Straightforward UI + bulk write once episode tracking is solid.

---

## Performance & Quality (see `specs/performance-audit.md` for full detail)

Short items with disproportionate impact. Do these before the next feature cycle.

| Priority | Fix                                                                                              | Est. Impact                              |
| -------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| P0       | Add `priority` prop to above-fold `<Image>` components                                           | ~1,000 ms off LCP                        |
| P0       | Add `imageSizes: [200, 256, 384]` + `minimumCacheTTL` to `next.config.ts`                        | ~300 kB/page saved                       |
| P1       | Collapse 4-step home page query waterfall into 2 steps                                           | ~2 DB round trips saved                  |
| P1       | Add `loading.tsx` to 7 high-traffic routes (movies, tv, profile, history, lists, pick, settings) | Perceived load improvement               |
| P1       | `aria-label` on 7 icon-only buttons                                                              | Accessibility                            |
| P2       | Replace `Suspense fallback={null}` with skeletons (6 locations)                                  | CLS / jank                               |
| P2       | Cache `getTrending` with `next: { revalidate: 3600 }`                                            | TMDB API call removed from critical path |

---

## Lower Priority / Niche

### Check-ins

"Watching now" real-time signal — lets users log what they're actively watching and optionally share it.

Adds social infrastructure not currently in the app. Low user demand at current scale.

### Collections

Track physical or digital ownership of titles separately from watch history (e.g., "I own this on Blu-ray").

Useful for collectors, but a distinct data model from the existing watchlist/history flow. Revisit if users request it.
