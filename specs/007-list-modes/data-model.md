# Data Model: List Modes & Feature Toggles

## Schema Changes

### New Enum: `DisplayMode`

```prisma
enum DisplayMode {
  GRID
  LIST
}
```

Added to `prisma/schema.prisma`. Used by `List.displayMode`.

---

### Modified Model: `List`

Five new fields:

| Field             | Type          | Default | Description                                    |
| ----------------- | ------------- | ------- | ---------------------------------------------- |
| `rankingEnabled`  | `Boolean`     | `false` | Items have explicit positions; drag to reorder |
| `votingEnabled`   | `Boolean`     | `true`  | Members can upvote/downvote items              |
| `commentsEnabled` | `Boolean`     | `true`  | Members can comment on items                   |
| `displayMode`     | `DisplayMode` | `GRID`  | Grid or list layout for all viewers            |
| `itemCap`         | `Int?`        | `null`  | Max items allowed; null = no cap               |

**Invariant**: `rankingEnabled` and `votingEnabled` MUST NOT both be `true` simultaneously. Enforced at the application layer (PATCH handler + UI preset logic).

**Migration**: All existing lists get the defaults above. `votingEnabled` defaults to `true` for backward compatibility (existing lists had voting always-on).

---

### Modified Model: `ListItem`

Two new fields:

| Field           | Type      | Default | Description                                                                |
| --------------- | --------- | ------- | -------------------------------------------------------------------------- |
| `position`      | `Int?`    | `null`  | Explicit rank (1-based); only meaningful when `List.rankingEnabled = true` |
| `noteIsSpoiler` | `Boolean` | `false` | Whether the item's `notes` field contains a spoiler                        |

**Migration**: `position = NULL` for all existing items. When ranking is first enabled on an existing list, positions are assigned in `addedAt ASC` order via the settings PATCH handler.

---

## Entity Relationships (unchanged)

```
List
 ├── ListMember (userId, role: OWNER | CONTRIBUTOR | VIEWER)
 ├── ListItem (position?, noteIsSpoiler)
 │    ├── ListItemVote (value: 1 | -1)
 │    ├── ListItemComment
 │    └── ListItemCommentRead
 └── ListAccessRequest
```

---

## Application-Layer Entities (not stored)

### `ListPreset`

A named configuration template defined in `src/lib/list-presets.ts`:

```typescript
export type ListPreset = "watchlist" | "poll" | "ranked" | "custom";

export type ListFeatureFlags = {
  rankingEnabled: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  displayMode: "GRID" | "LIST";
};

export const LIST_PRESETS: Record<ListPreset, ListFeatureFlags> = {
  watchlist: {
    rankingEnabled: false,
    votingEnabled: false,
    commentsEnabled: true,
    displayMode: "GRID",
  },
  poll: {
    rankingEnabled: false,
    votingEnabled: true,
    commentsEnabled: true,
    displayMode: "GRID",
  },
  ranked: {
    rankingEnabled: true,
    votingEnabled: false,
    commentsEnabled: true,
    displayMode: "LIST",
  },
  custom: {
    rankingEnabled: false,
    votingEnabled: false,
    commentsEnabled: true,
    displayMode: "GRID",
  },
};
```

---

## State Transitions

### Enabling Ranking on Existing List

1. `PATCH /api/lists/[slug]` receives `{ rankingEnabled: true }`
2. Handler checks: sets `votingEnabled = false` automatically (mutex)
3. Handler fetches current items ordered by `addedAt ASC`
4. Assigns `position = 1, 2, 3...` to each item in a transaction
5. Updates `List` record

### Disabling Ranking on Existing List

1. `PATCH /api/lists/[slug]` receives `{ rankingEnabled: false }`
2. Handler sets all `ListItem.position = null` for this list in a transaction
3. Updates `List` record

### Setting Item Cap Below Current Count

1. `PATCH /api/lists/[slug]` receives `{ itemCap: N }` where N < current item count
2. Handler allows the update (cap applies to future additions only)
3. Existing items are untouched

---

## API Contracts Summary

See `contracts/` for full endpoint definitions.

New/changed endpoints:

- `POST /api/lists` — now accepts `preset`, `rankingEnabled`, `votingEnabled`, `commentsEnabled`, `displayMode`, `itemCap`
- `PATCH /api/lists/[slug]` — now accepts same feature flag fields; enforces ranking/voting mutex
- `PATCH /api/lists/[slug]/items/reorder` — **new** — bulk position update for ranked lists
- `POST /api/lists/[slug]/items` — now checks item cap; assigns position for ranked lists
- `POST /api/lists/[slug]/items/[itemId]/vote` — now returns `403` when `votingEnabled = false`
- `POST /api/lists/[slug]/items/[itemId]/comments` — now returns `403` when `commentsEnabled = false`
- `PATCH /api/lists/[slug]/items/[itemId]` — **new** — update `noteIsSpoiler` (and `notes`)
