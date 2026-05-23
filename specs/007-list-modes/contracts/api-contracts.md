# API Contracts: List Modes & Feature Toggles

## Modified Endpoints

---

### POST /api/lists

**Auth**: Required (any user)

**Request body** (additions to existing `name`, `description`, `isPublic`):

```json
{
  "preset": "watchlist | poll | ranked | custom",
  "rankingEnabled": false,
  "votingEnabled": true,
  "commentsEnabled": true,
  "displayMode": "GRID | LIST",
  "itemCap": null
}
```

**Behavior**:

- If `preset` is provided, its defaults populate any missing feature flag fields
- If both `preset` fields and explicit overrides are sent, explicit overrides win
- Ranking/voting mutex: if both `rankingEnabled: true` and `votingEnabled: true` are sent, returns `400 { "error": "rankingEnabled and votingEnabled cannot both be true" }`

**Response** `201`: Full list object including new fields

---

### PATCH /api/lists/[slug]

**Auth**: Required — owner only (403 otherwise)

**Request body** (additions to existing `name`, `description`, `isPublic`):

```json
{
  "rankingEnabled": true,
  "votingEnabled": false,
  "commentsEnabled": true,
  "displayMode": "LIST",
  "itemCap": 10
}
```

**Behavior**:

- Ranking/voting mutex: enabling `rankingEnabled` automatically sets `votingEnabled = false` (and vice versa); the response reflects the resolved values
- When `rankingEnabled` transitions `false → true`: assigns sequential positions to existing items ordered by `addedAt ASC` in a transaction
- When `rankingEnabled` transitions `true → false`: nulls all `ListItem.position` for this list in a transaction
- `itemCap` lower than current item count is allowed; no items are removed

**Response** `200`: Updated list object

---

### POST /api/lists/[slug]/items

**Auth**: Required — member or owner (403 otherwise)

**Additions to existing behavior**:

- If `list.itemCap != null` and `count(items) >= itemCap`: returns `403 { "error": "List is at capacity" }`
- If `list.rankingEnabled`: newly added item is assigned `position = max(current positions) + 1`

**Response** `201`: Created list item including `position` and `noteIsSpoiler`

---

### PATCH /api/lists/[slug]/items/[itemId] _(new)_

**Auth**: Required — member or owner who added the item, OR list owner (403 otherwise)

**Request body**:

```json
{
  "notes": "Updated note text",
  "noteIsSpoiler": true
}
```

Both fields are optional; only provided fields are updated.

**Response** `200`: Updated list item

---

### PATCH /api/lists/[slug]/items/reorder _(new)_

**Auth**: Required — owner or contributor (viewer: 403; non-member: 403)

**Precondition**: `list.rankingEnabled = true`. Returns `400 { "error": "List is not ranked" }` otherwise.

**Request body**:

```json
{
  "positions": [
    { "id": "item-cuid-1", "position": 1 },
    { "id": "item-cuid-2", "position": 2 },
    { "id": "item-cuid-3", "position": 3 }
  ]
}
```

All item IDs must belong to this list. Positions must be a contiguous sequence starting at 1. Returns `400` on invalid input.

**Behavior**: Updates all positions in a single Prisma transaction.

**Response** `200 { "success": true }`

---

### POST /api/lists/[slug]/items/[itemId]/vote

**Addition to existing behavior**:

- If `list.votingEnabled = false`: returns `403 { "error": "Voting is disabled for this list" }`

---

### POST /api/lists/[slug]/items/[itemId]/comments

**Addition to existing behavior**:

- If `list.commentsEnabled = false`: returns `403 { "error": "Comments are disabled for this list" }`

---

## Response Shape Changes

### List object (all list endpoints returning a full list)

New fields included in response:

```json
{
  "rankingEnabled": false,
  "votingEnabled": true,
  "commentsEnabled": true,
  "displayMode": "GRID",
  "itemCap": null
}
```

### ListItem object (all endpoints returning list items)

New fields included in response:

```json
{
  "position": null,
  "noteIsSpoiler": false
}
```
