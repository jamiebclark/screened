# Contract: `PATCH /api/lists/[slug]/items/[itemId]/hidden`

**Feature**: `010-list-item-curation` | **Status**: NEW route
**File**: `src/app/api/lists/[slug]/items/[itemId]/hidden/route.ts`
**Mirrors**: `src/app/api/lists/[slug]/items/[itemId]/vote/route.ts` (per-item sub-resource with its
own authorisation rule)

Sets the shared, list-wide hidden state of one list item. Deliberately a **separate route** from
`PATCH …/items/[itemId]` because that handler authorises with `isOwner || isAdder` (the notes rule)
while curation is `isOwner || CONTRIBUTOR|OWNER member` — see
[research.md R5](../research.md).

---

## Request

```http
PATCH /api/lists/movie-night/items/clx123abc/hidden
Content-Type: application/json

{ "isHidden": true }
```

| Field      | Type      | Required | Notes                                                     |
| ---------- | --------- | -------- | --------------------------------------------------------- |
| `isHidden` | `boolean` | yes      | **Absolute set, not a flip.** No other field is accepted. |

Any other keys in the body are ignored. An absolute set (rather than a toggle) is what makes
concurrent toggles converge on last-write-wins with no lost update.

## Responses

| Status | Body                                            | When                                                                         |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `200`  | `{ "id": string, "isHidden": boolean }`         | Success, including when the item was already in the requested state (no-op). |
| `400`  | `{ "error": "isHidden must be true or false" }` | `isHidden` absent or not a boolean; malformed JSON body.                     |
| `401`  | `{ "error": "Unauthorized" }`                   | No session.                                                                  |
| `403`  | `{ "error": "Forbidden" }`                      | Session user is not the owner and not an `OWNER`/`CONTRIBUTOR` member.       |
| `404`  | `{ "error": "Not found" }`                      | Unknown slug, unknown item id, or the item does not belong to that list.     |
| `500`  | `{ "error": "Something went wrong" }`           | Unexpected failure. Logged server-side; no exception text in the response.   |

## Handler contract

1. `const session = await auth()` — 401 if `!session?.user?.id`. (Constitution II.)
2. Load the list by `slug` with `members: { select: { userId: true, role: true } }` — 404 if absent.
3. Load the item by `id` — 404 if absent **or** `item.listId !== list.id`. (Prevents addressing an
   item of another list through this list's slug.)
4. `canCurateListItems({ isOwner: list.ownerId === session.user.id, memberRole })` — 403 if false.
   Uses `src/lib/list-item-permissions.ts`; `memberRole` is the session user's `ListMember.role`, or
   `null` for a non-member (which includes non-members reading a public list).
5. Validate the body: `typeof body.isHidden === "boolean"` — 400 otherwise.
6. `prisma.listItem.update({ where: { id: itemId }, data: { isHidden } })` — **`data` contains
   `isHidden` and nothing else**, so notes, spoiler flag, position, addedAt, addedById, votes,
   comments and tags are provably untouched (FR-006).
7. Respond `200` with `{ id, isHidden }`.

## Requirements covered

- **FR-002** — the route that backs the eye toggle.
- **FR-003** — view-only members and non-members are refused (403).
- **FR-006** — only `isHidden` is written.
- **FR-025** — a caller who cannot curate the list cannot change hidden state.
- Spec edge case "Concurrent toggles" — absolute set, no error on a no-op.

## Client behaviour (FR-009)

The toggle is optimistic: the item's appearance changes immediately, and on a non-`ok` response the
component restores the previous appearance and shows the server's `error` string (or a generic
"Couldn't update that item" if the body is unreadable) in the existing inline error banner used by
`list-item-reorder.tsx`. On success it calls `router.refresh()` so the RSC re-renders with the new
shared state (constitution I).

## Test expectations

- Vitest covers `canCurateListItems` (owner, `OWNER` member, `CONTRIBUTOR`, `VIEWER`, non-member).
- Playwright (`e2e/lists-curation.spec.ts`): owner hides → item faded; second member's session sees
  it faded; unhide restores note/vote/rank; a `VIEWER` sees no toggle.
