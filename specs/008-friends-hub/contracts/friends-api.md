# API Contracts: Friends Hub

> All routes are unchanged. Documented here for reference during implementation.

## Authentication

All routes require a valid session. Returns `401 { error: "Unauthorized" }` when no session.

---

## GET /api/friends

Returns the current user's full friendship state.

**Response 200**

```json
{
  "friends": [{ "id": "cuid", "name": "Alice", "avatarUrl": "https://..." }],
  "outgoing": [
    {
      "id": "request-cuid",
      "toUser": { "id": "cuid", "name": "Bob", "avatarUrl": null },
      "createdAt": "2026-05-25T10:00:00.000Z"
    }
  ],
  "incoming": [
    {
      "id": "request-cuid",
      "fromUser": { "id": "cuid", "name": "Carol", "avatarUrl": "https://..." },
      "createdAt": "2026-05-25T09:00:00.000Z"
    }
  ]
}
```

---

## POST /api/friends

Send a friend request, or auto-accept if the target already sent one.

**Request body**

```json
{ "toUserId": "cuid" }
```

**Responses**

- `201` — request created: `{ "status": "pending", "requestId": "cuid", "createdAt": "..." }`
- `201` — auto-accepted (reverse request existed): `{ "status": "friends", "friendState": "friends" }`
- `400` — missing/invalid `toUserId`, or self-add
- `404` — target user not found
- `409` — already friends, or request already pending: `{ "error": "...", "requestId"?: "cuid" }`

---

## DELETE /api/friends/[userId]

Unfriend an accepted friend.

**Response**

- `200` — unfriended
- `404` — friendship not found

---

## DELETE /api/friends/requests/[requestId]

Cancel an outgoing request **or** decline an incoming request.

**Response**

- `200` — request deleted
- `403` — requester is neither sender nor recipient
- `404` — request not found

---

## POST /api/friends/requests/[requestId]/accept

Accept an incoming friend request.

**Response**

- `201` — friendship created
- `403` — current user is not the recipient
- `404` — request not found

---

## GET /api/users/search?q={query}

Search users by display name, email, or Plex username.

**Constraints**: `q` must be ≥ 2 characters. Returns up to 8 results. Excludes the current user.

**Response 200** (array)

```json
[
  {
    "id": "cuid",
    "name": "Dave",
    "avatarUrl": null,
    "email": "dave@example.com",
    "plexConnection": { "plexUsername": "dave_plex" }
  }
]
```

- `400` — query too short
