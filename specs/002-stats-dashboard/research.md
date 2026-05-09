# Research: Stats Dashboard

**Branch**: `002-stats-dashboard` | **Date**: 2026-05-06

## Resolved Unknowns

| Question                               | Finding                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| How is `genres` stored on `MediaItem`? | `String[]` — denormalized array, no relation table                                                                        |
| How are cast/crew stored?              | `cast: String[]`, `directors: String[]` (preferred); legacy `director: String?` also exists                               |
| Is release year on `MediaItem`?        | `year: Int?` (not `releaseYear`)                                                                                          |
| How is runtime stored?                 | `runtime: Int?` (minutes)                                                                                                 |
| What defines "watched"?                | At least one `WatchEntry` row for that `userId + mediaItemId` pair                                                        |
| Where is user rating stored?           | `UserMediaStatus.rating: Float?`                                                                                          |
| Do we need a charting library?         | No — horizontal/vertical bar charts can be rendered with percentage-width `div`s using Tailwind; no new dependency needed |
| Do we need schema changes?             | No — all required fields already exist                                                                                    |
| Do we need new API routes?             | No — `/stats` is a pure RSC; no mutations                                                                                 |

## Decisions

### Decision 1: Query Strategy — Two-Query JS Aggregation

- **Decision**: Fetch watched `MediaItem` records (with `genres`, `year`, `cast`, `directors`, `runtime`) in one query, plus user ratings in a second parallel query; aggregate everything in JS.
- **Rationale**: Simple, readable, and fast enough for watchlists up to ~500 items (Prisma `findMany` + JS reduce). Avoids complex raw SQL for array-field aggregation (e.g., unnesting `genres[]` with Postgres `unnest`). Consistent with the JS-aggregation pattern already used in `watchlist/page.tsx`.
- **Alternatives considered**: Prisma `groupBy` (doesn't support array field expansion), raw SQL with `unnest` (works but harder to maintain).

### Decision 2: Visual Charts — CSS Percentage Bars

- **Decision**: Render genre, decade, and ratings breakdowns as horizontal or vertical bar charts using `div` elements with Tailwind `style={{ width: "X%" }}` — no new library.
- **Rationale**: Spec assumption states "no new charting library is assumed." CSS bars are fully accessible, render server-side, and are easy to style with Tailwind.
- **Alternatives considered**: Recharts, Chart.js (both require `"use client"`, add bundle weight, and are not already in the project).

### Decision 3: "Watched" Source — WatchEntry

- **Decision**: A title is "watched" if `WatchEntry.some({ userId })` exists for it. Use `prisma.mediaItem.findMany({ where: { watchEntries: { some: { userId } } } })`.
- **Rationale**: Consistent with spec assumption. Avoids conflating watchlist status with actual watch history.

### Decision 4: TV Shows — Per-Title, Not Per-Episode

- **Decision**: TV shows count as one "watched title" regardless of how many episodes have been logged. Runtime for TV is excluded (runtime field is unreliable for shows).
- **Rationale**: Spec assumption. Episode-level aggregation is out of scope for v1.

### Decision 5: Directors — Use `directors[]` Array

- **Decision**: Use `MediaItem.directors` (the `String[]` field) for person rankings; fall back to legacy `director` field only if `directors` is empty.
- **Rationale**: `directors` is the preferred multi-director field. The legacy `director: String?` field exists for older records and should be included as a fallback to maximize coverage.
