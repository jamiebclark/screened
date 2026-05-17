# Contract: Browse Page

## Route

`GET /browse`

## Query Parameters

| Param       | Type                                         | Default | Description                                               |
| ----------- | -------------------------------------------- | ------- | --------------------------------------------------------- |
| `type`      | `movie` \| `tv` \| `all`                     | `movie` | Media type filter. `all` shows trending, disables genres. |
| `genre`     | integer                                      | —       | TMDB genre ID. Ignored when `type=all`.                   |
| `genreName` | URL-encoded string                           | —       | Genre name (from list modal). Resolved to ID server-side. |
| `filter`    | `seen` \| `unseen` \| `library` \| `friends` | —       | User-specific filter. Hidden for logged-out users.        |
| `page`      | integer ≥ 1                                  | `1`     | TMDB discover page number.                                |

## Behaviour

- `genre` and `genreName` are mutually exclusive; `genre` takes precedence.
- When `type=all`: genre params ignored, trending content shown, genre pills hidden.
- When `type=movie` or `type=tv` and no genre: show popular titles of that type.
- `filter` params are silently ignored for unauthenticated requests.
- Invalid `page` values (non-integer, < 1) default to `1`.
- Invalid `genre` values (non-integer) are ignored (no genre filter applied).

## Response (rendered HTML)

Server-rendered page containing:

- Genre pill bar (movie or TV genres depending on `type`)
- Type toggle (Movies | TV Shows | All)
- Filter row (Seen / Not Seen / In My Library / Friends' Library) — logged-in only
- Poster grid of `MediaCard` components with watch status overlays
- Pagination controls (Previous / Next) when multiple pages exist
- Empty state when no results match filters

## Access Control

- Page is publicly accessible (no auth required).
- User-specific features (filter row, watch status overlays) render only when a session exists.
