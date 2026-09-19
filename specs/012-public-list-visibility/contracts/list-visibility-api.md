# Contract: List visibility in the lists API

**Feature**: 012-public-list-visibility

## `POST /api/lists`

**Auth**: session required (401 otherwise) — unchanged.

**Request body** (changed fields only):

| Field        | Type                                 | Default     | Notes                                 |
| ------------ | ------------------------------------ | ----------- | ------------------------------------- |
| `visibility` | `"PUBLIC" \| "MEMBERS" \| "PRIVATE"` | `"MEMBERS"` | Replaces `isPublic`. Invalid → `400`. |

`isPublic` is no longer accepted; if present it is ignored.

**Response**: `201` with the created list; the list object now carries `visibility` and no `isPublic`.

## `PATCH /api/lists/[slug]`

**Auth**: session required (401). Owner-only for `visibility` (403 for non-owners, as today for other owner-only fields).

| Field        | Type                                 | Notes                            |
| ------------ | ------------------------------------ | -------------------------------- |
| `visibility` | `"PUBLIC" \| "MEMBERS" \| "PRIVATE"` | Optional. Invalid value → `400`. |

## `GET /api/lists/[slug]`

**Auth**: depends on tier (see matrix). The edge proxy no longer redirects anonymous `GET`s on this path to `/login`.

| Tier    | No session | Session, non-member | Member/owner |
| ------- | ---------- | ------------------- | ------------ |
| PUBLIC  | `200`      | `200`               | `200`        |
| MEMBERS | `401`      | `200`               | `200`        |
| PRIVATE | `401`      | `403`               | `200`        |

**Anonymous response shape** (`200` for PUBLIC with no session) omits:

- `members` (returned as `[]`)
- `owner` (returned as `null`)
- `radarrToken`, `discordWebhookId`, `discordChannelName`, `discordGuildName`
- `items[].addedBy` (returned as `null`)

`discordWebhookUrl` is never returned to anyone (unchanged).

**Signed-in response shape**: unchanged apart from `isPublic` → `visibility`.

## `GET /api/lists/[slug]/radarr`

| Tier    | No token, no session | `?token=<radarrToken>` |
| ------- | -------------------- | ---------------------- |
| PUBLIC  | `200`                | `200`                  |
| MEMBERS | `401`                | `200`                  |
| PRIVATE | `401`                | `200`                  |

Unchanged behaviour except that "public" now means `PUBLIC` only; MEMBERS lists require the token like PRIVATE ones (this endpoint has no session; Radarr can't log in). The Radarr URL shown in list settings includes `?token=` for MEMBERS and PRIVATE lists and omits it for PUBLIC.

## `GET /api/lists` (index)

Unchanged contract; discovery results include lists with `visibility` `PUBLIC` or `MEMBERS` plus the caller's own/joined lists. Objects carry `visibility` instead of `isPublic`.
