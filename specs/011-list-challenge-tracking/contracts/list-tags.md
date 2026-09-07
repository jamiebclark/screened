# Contract: list tags (declared vocabulary)

**Feature**: `011-list-challenge-tracking` | **Status**: NEW routes
**Files**:

- `src/app/api/lists/[slug]/tags/route.ts` — `POST`
- `src/app/api/lists/[slug]/tags/[tagId]/route.ts` — `PATCH`, `DELETE`

**Mirrors**: `src/app/api/lists/[slug]/items/[itemId]/tags/route.ts` — the closest existing sibling
(a child collection of a list, guarded by `canCurateListItems()`).

There is **no `GET`**. The list's tags are delivered by the list page's Server Component along with
the items, and the tag manager renders that prop — see
[research.md R4](../research.md). A `GET` would be a second place re-implementing the list
visibility check, for data the page already has.

`tagId` in these paths is a **`ListTag` id**. (Contrast the item-tag routes, where `tagId` is a
`ListItemTag` _assignment_ id — see [list-item-tags.md](./list-item-tags.md).)

---

## `POST /api/lists/[slug]/tags`

Declares a tag on the list. Works on a list with **no items at all** (FR-001) — that is the point.

### Request

```http
POST /api/lists/hooptober-2026/tags
Content-Type: application/json

{ "label": "folk horror" }
```

| Field   | Type     | Required | Notes                                                             |
| ------- | -------- | -------- | ----------------------------------------------------------------- |
| `label` | `string` | yes      | 1–30 characters after trimming. One tag per request, not a batch. |

One-per-request rather than a batch: declaring the 31 Hooptober categories is a deliberate,
one-at-a-time act with per-row feedback, and a partial batch failure has no sensible UI.

### Responses

| Status | Body                                         | When                                                                                              |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `201`  | `{ "tag": { "id", "label", "normalized" } }` | Created.                                                                                          |
| `200`  | `{ "tag": { "id", "label", "normalized" } }` | The normalized form already existed; the **existing** tag is returned unchanged (FR-004, AS 1.7). |
| `400`  | `{ "error": "<plain-language message>" }`    | See validation table.                                                                             |
| `401`  | `{ "error": "Unauthorized" }`                | No session.                                                                                       |
| `403`  | `{ "error": "Forbidden" }`                   | Not owner and not an `OWNER`/`CONTRIBUTOR` member (FR-003, AS 1.6).                               |
| `404`  | `{ "error": "Not found" }`                   | Unknown slug.                                                                                     |
| `500`  | `{ "error": "Something went wrong" }`        | Unexpected failure; logged server-side, no exception text leaked.                                 |

`200` rather than `409` on a duplicate: FR-004 says the attempt "MUST resolve to the existing tag",
so this is a success with an idempotent outcome, not a conflict. The client re-renders the same row
and the member sees no error — which is the behaviour AS 1.7 describes.

Implemented as a `prisma.listTag.upsert()` on `listId_normalized`, so two curators declaring the
same category simultaneously cannot produce a duplicate or a 500.

### Validation (400 messages)

Produced by `validateTagName()` in `src/lib/list-item-tags.ts`; the route returns its `error`
verbatim, so the message the member reads is unit-tested. Messages are shared with the item-tag
route so the two surfaces cannot drift.

| Condition                       | `error`                               |
| ------------------------------- | ------------------------------------- |
| `label` missing or not a string | `Tag must be text`                    |
| Empty after trimming            | `Tag cannot be empty`                 |
| Longer than 30 characters       | `Tags must be 30 characters or fewer` |

---

## `PATCH /api/lists/[slug]/tags/[tagId]`

Renames a declared tag. Because the name lives on one row, every item carrying it reads the new name
immediately (FR-005, AS 1.4) — no fan-out update, nothing to leave behind.

### Request

```http
PATCH /api/lists/hooptober-2026/tags/clt123abc
Content-Type: application/json

{ "label": "Folk Horror" }
```

### Responses

| Status | Body                                                             | When                                                                                  |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `200`  | `{ "tag": { "id", "label", "normalized" } }`                     | Renamed. Includes a case-only change to the tag's **own** name.                       |
| `400`  | `{ "error": … }`                                                 | Same three `validateTagName()` messages as `POST`.                                    |
| `401`  | `{ "error": "Unauthorized" }`                                    | No session.                                                                           |
| `403`  | `{ "error": "Forbidden" }`                                       | Not a curator.                                                                        |
| `404`  | `{ "error": "Not found" }`                                       | Unknown slug, unknown tag, or tag not on that list (`tag.listId !== list.id`).        |
| `409`  | `{ "error": "Another tag on this list already uses that name" }` | The new normalized form belongs to a **different** tag on this list (spec edge case). |
| `500`  | `{ "error": "Something went wrong" }`                            | Unexpected failure.                                                                   |

`409` rather than `400`: the request is well-formed and collides with server state. Merging the two
tags is explicitly out of scope (FR-005 rationale, spec edge case "renaming a tag onto an existing
one"), and a distinct status lets the client show the collision message without string-matching.

---

## `DELETE /api/lists/[slug]/tags/[tagId]`

Hard-deletes the tag and, by cascade, every assignment of it (FR-006, AS 1.5). No undo, no archive.

### Responses

| Status | Body                                         | When                                                               |
| ------ | -------------------------------------------- | ------------------------------------------------------------------ |
| `200`  | `{ "success": true, "removedFromItems": 7 }` | Deleted. `removedFromItems` is the assignment count before delete. |
| `401`  | `{ "error": "Unauthorized" }`                | No session.                                                        |
| `403`  | `{ "error": "Forbidden" }`                   | Not a curator.                                                     |
| `404`  | `{ "error": "Not found" }`                   | Unknown slug, unknown tag, or tag not on that list.                |
| `500`  | `{ "error": "Something went wrong" }`        | Unexpected failure.                                                |

**FR-006's "tell the member how many items will be affected before the deletion is confirmed"** is
satisfied _client-side_, before this request is sent: the tag manager already holds
`TagVocabularyEntry.count` for every tag as a prop from the Server Component, so the confirmation
copy needs no round trip. `removedFromItems` in the response is the after-the-fact confirmation the
count was right.

---

## Authorisation order (all three handlers)

Identical to the existing item-tag route, so there is one shape to review:

1. `await auth()` → `401` before touching any data (constitution II).
2. `prisma.list.findUnique({ where: { slug } })` → `404` if absent.
3. `canCurateListItems({ isOwner, memberRole })` → `403`.
4. For `[tagId]`: load the tag and verify `tag.listId === list.id` → `404` otherwise, so one list's
   slug can never address another list's tag.
5. Validate the body → `400`.
6. Mutate; unexpected failures are `console.error`'d and answered `500` with a generic message.

Read access to the tag list needs no handler: it rides on the list page's own visibility check.
