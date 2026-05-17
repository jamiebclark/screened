# Data Model: Browse Sort & Filter

No new Prisma models or migrations are required. All needed fields already exist.

---

## TypeScript Interfaces (new `src/lib/browse-types.ts`)

### BrowseSortOrder

```typescript
export type BrowseSortOrder =
  | "popularity" // TMDB default; library: last-touched desc
  | "title" // A–Z by title; default for library tabs
  | "year_desc" // release year, newest first
  | "year_asc" // release year, oldest first
  | "rating_desc" // community rating (TMDB) or personal rating (library), high to low
  | "rating_asc"; // low to high
```

### PersonFilterItem

```typescript
export interface PersonFilterItem {
  id: number; // TMDB person ID
  name: string; // display name — stored in URL alongside ID
}
```

### BrowseFilter

```typescript
export interface BrowseFilter {
  genreIds: number[];
  sortOrder: BrowseSortOrder | null; // null = use tab default
  yearMin: number | null;
  yearMax: number | null;
  includePersons: PersonFilterItem[];
  excludePersons: PersonFilterItem[];
}
```

---

## URL Serialization / Deserialization

Helper functions in `src/lib/browse-types.ts`:

### `parseBrowseFilter(searchParams: URLSearchParams): BrowseFilter`

Parses raw URL params into a typed `BrowseFilter`. Handles:

- `genres` comma-split → `number[]`; falls back to legacy `genre` param
- `sort` → validated `BrowseSortOrder | null`
- `yearMin` / `yearMax` → 4-digit int or null; swaps if min > max (prevents invalid state)
- `includePersons` / `excludePersons` → split on `,` then split each on `:` for `{id, name}`

### `serializeBrowseFilter(filter: BrowseFilter, base: URLSearchParams): URLSearchParams`

Merges filter state back into a URLSearchParams object (preserving `type`, `filter`, `page`).

---

## Existing Schema — Fields Used

### MediaItem (no changes)

| Field              | Type       | Used for                           |
| ------------------ | ---------- | ---------------------------------- |
| `genres`           | `String[]` | Multi-genre DB filter (`hasEvery`) |
| `year`             | `Int?`     | Year range DB filter and sort      |
| `cast`             | `String[]` | Person exclude (name substring)    |
| `castTmdbIds`      | `Int[]`    | Person include (exact ID match)    |
| `directors`        | `String[]` | Person exclude (name substring)    |
| `directorsTmdbIds` | `Int[]`    | Person include (exact ID match)    |

### UserMediaStatus (no changes)

| Field    | Type     | Used for                                      |
| -------- | -------- | --------------------------------------------- |
| `rating` | `Float?` | Rating sort on library tabs (`nulls: "last"`) |

---

## TMDB Discover Params — Extended Signatures

### `discoverMovies(opts: DiscoverOptions): Promise<TmdbSearchResponse>`

```typescript
interface DiscoverOptions {
  genreIds?: number[]; // with_genres comma-joined
  sortBy?: string; // sort_by param (pre-mapped)
  yearMin?: number; // primary_release_date.gte
  yearMax?: number; // primary_release_date.lte
  withCastIds?: number[]; // with_cast comma-joined (OR; AND handled by post-filter)
  withCrewIds?: number[]; // with_crew comma-joined
  page?: number;
}
```

Same shape for `discoverTv` (uses `first_air_date.*` instead of `primary_release_date.*`).

---

## Component Props

### BrowseFilterPanel (new, replaces BrowseFilters)

```typescript
interface BrowseFilterPanelProps {
  genres: TmdbGenre[];
  filter: BrowseFilter;
  type: string;
  filterParam: string | null;
  isLoggedIn: boolean;
}
```

### PersonTagInput (new)

```typescript
interface PersonTagInputProps {
  label: string; // "Include" or "Exclude"
  persons: PersonFilterItem[]; // current chips
  maxCount: number; // 5
  onChange: (persons: PersonFilterItem[]) => void;
}
```
