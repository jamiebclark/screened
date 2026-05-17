# Contract: Browse Page Query Parameters

**Route**: `GET /browse`

All filter and sort state is encoded in URL query parameters. This contract defines the complete
parameter set for the post-feature URL surface.

---

## Parameters

### Existing (unchanged)

| Param    | Values                                       | Default | Notes                                         |
| -------- | -------------------------------------------- | ------- | --------------------------------------------- |
| `type`   | `movie` \| `tv` \| `all`                     | `movie` | Content type toggle                           |
| `filter` | `seen` \| `unseen` \| `library` \| `friends` | none    | User-scoped filter; requires auth             |
| `page`   | integer ≥ 1                                  | `1`     | Page number; resets to 1 on any filter change |

### New

| Param            | Format                           | Example                 | Notes                                       |
| ---------------- | -------------------------------- | ----------------------- | ------------------------------------------- |
| `genres`         | comma-separated genre IDs        | `28,35`                 | AND logic; replaces legacy `genre`          |
| `sort`           | enum string                      | `rating_desc`           | See sort values below; omit for tab default |
| `yearMin`        | 4-digit integer                  | `1970`                  | Inclusive lower bound on release year       |
| `yearMax`        | 4-digit integer                  | `1990`                  | Inclusive upper bound on release year       |
| `includePersons` | `id:name` pairs, comma-separated | `1334:Denis Villeneuve` | TMDB person IDs + display names             |
| `excludePersons` | `id:name` pairs, comma-separated | `19292:Adam Sandler`    | Same format                                 |

### Legacy (backward compatible)

| Param       | Behavior                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| `genre`     | If `genres` is absent, treated as a single-element `genres` value                         |
| `genreName` | Genre name fallback; resolved to ID via genre list lookup; ignored if `genres` is present |

---

## Sort Values

| Value         | TMDB discovery tab                                     | Library tab                      |
| ------------- | ------------------------------------------------------ | -------------------------------- |
| `popularity`  | `popularity.desc` (TMDB native)                        | `updatedAt DESC`                 |
| `title`       | `original_title.asc` (movies) / `popularity.desc` (tv) | `mediaItem.title ASC`            |
| `year_desc`   | `release_date.desc` / `first_air_date.desc`            | `mediaItem.year DESC NULLS LAST` |
| `year_asc`    | `release_date.asc` / `first_air_date.asc`              | `mediaItem.year ASC NULLS LAST`  |
| `rating_desc` | `vote_average.desc`                                    | `rating DESC NULLS LAST`         |
| `rating_asc`  | `vote_average.asc`                                     | `rating ASC NULLS LAST`          |

**Tab defaults** (when `sort` is absent):

- TMDB discovery tabs (unseen / unfiltered): `popularity`
- Library tabs (library / seen / friends): `title`

---

## Constraints

- `yearMin` > `yearMax` → the server/client rejects the combo and shows an inline validation
  error. No results are fetched until corrected.
- `includePersons` and `excludePersons` are capped at 5 entries each (enforced by UI; server
  truncates to first 5 if more arrive).
- Sort and filter controls are hidden / disabled when `type=all` (trending endpoint does not
  support discovery params).
- `page` resets to 1 whenever `genres`, `sort`, `yearMin`, `yearMax`, `includePersons`, or
  `excludePersons` changes.

---

## Example URLs

```
# Multi-genre AND filter (Horror + Comedy), sorted by rating
/browse?genres=27,35&sort=rating_desc

# Library tab, sorted by year newest first, filtered to a genre
/browse?filter=library&genres=28&sort=year_desc

# Year range 1970–1990, TV type
/browse?type=tv&yearMin=1970&yearMax=1990

# Include Denis Villeneuve's films, exclude Adam Sandler
/browse?includePersons=1334:Denis%20Villeneuve&excludePersons=19292:Adam%20Sandler

# Shareable URL: page 3 of horror-comedy discovery
/browse?genres=27,35&sort=popularity&page=3
```
