# Contract: `PATCH /api/lists/[slug]/items/reorder`

**File**: `src/app/api/lists/[slug]/items/reorder/route.ts`
**Status**: existing route, **extended** (stricter validation + server-side renumbering). The
request/response _shape_ is unchanged, so existing callers keep working.
**Covers**: FR-001, FR-004, FR-005, FR-006, FR-007, FR-029, FR-031

## Authentication & authorisation

1. `await auth()` → `401 { "error": "Unauthorized" }` when there is no session.
2. Load the list with `members` and `items` → `404 { "error": "Not found" }` when it does not exist.
3. Caller must be the owner **or** a member with role `OWNER`/`CONTRIBUTOR` → otherwise
   `403 { "error": "Forbidden" }`. A `VIEWER` and a non-member are both refused (FR-005).
4. `list.rankingEnabled` must be `true` → otherwise
   `400 { "error": "This list is not ranked, so items cannot be reordered" }` (FR-006 — clearer
   wording than today's `"List is not ranked"`).

(Steps 1–4 already exist; only the step-4 message changes.)

## Request body

```jsonc
{
  "positions": [
    { "id": "clx…a", "position": 1 },
    { "id": "clx…b", "position": 2 },
    { "id": "clx…c", "position": 3 },
  ],
}
```

**New validation** (all failures ⇒ `400` with a human-readable `error`):

| Rule                                                                   | `error`                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| `positions` is a non-empty array of `{ id: string, position: number }` | `"Invalid positions"` (unchanged)                |
| every `id` belongs to this list                                        | `"One or more items do not belong to this list"` |
| no duplicate `id`s                                                     | `"Each item may appear only once"`               |
| `positions.length === list.items.length` — the **full** ordering       | `"Reorder must include every item on the list"`  |

The submitted `position` **values are advisory**: the server sorts entries by `position` ascending
(ties broken by `id` for determinism) and writes `index + 1`. A client may therefore send `3,2,1`,
`10,20,30`, or `1,2,3` — the stored result is always `1..n` (FR-004, invariant I1).

## Responses

| Status | Body                                          | When                                             |
| ------ | --------------------------------------------- | ------------------------------------------------ |
| `200`  | `{ "success": true }`                         | all positions written                            |
| `400`  | `{ "error": "<one of the messages above>" }`  | validation failure; **nothing** is written       |
| `401`  | `{ "error": "Unauthorized" }`                 | no session                                       |
| `403`  | `{ "error": "Forbidden" }`                    | viewer or non-member (FR-005)                    |
| `404`  | `{ "error": "Not found" }`                    | no list with that slug                           |
| `500`  | `{ "error": "Could not save the new order" }` | transaction failed; exception logged server-side |

## Atomicity & concurrency

All writes go in a single `prisma.$transaction([...updates])`, computed in JS before the transaction
opens. Two concurrent reorders therefore resolve to last-write-wins over the **whole** list — no
item can be left without a position and no two items can share one (spec edge case "Concurrent
reorder"). Requiring the complete ordering (rule 4) is what makes this true: a partial payload could
previously interleave with another writer and produce duplicates.

## Client contract (FR-007)

`src/app/(app)/lists/[slug]/list-item-reorder.tsx`:

```text
onDragEnd:
  previous = items                     // snapshot before mutating
  reordered = arrayMove(...)
  setItems(reordered)                  // optimistic
  res = await fetch(PATCH, { positions: reordered.map((it, i) => ({ id: it.id, position: i + 1 })) })
  if (!res.ok):
      setItems(previous)               // revert to last known saved order
      setError(body.error ?? "Could not save the new order")
      return                           // do NOT router.refresh() — it would race the revert
  setError(null)
  router.refresh()                     // re-hydrate the RSC so every derived rank matches the server
```

The error is rendered above the list with the project's existing muted-destructive text pattern
(`text-sm text-destructive`), matching `list-add-fab.tsx` and `list-settings-panel.tsx`. No stack
trace, no status code (FR-031).

## Test expectations

- Vitest (`src/lib/list-item-ordering.test.ts`): `normalizePositions` renumbers `[3,2,1]` →
  `1,2,3` in submitted order, is stable for duplicate `position` values, and is a no-op on an
  already-contiguous ordering.
- Playwright (`e2e/lists-ranked.spec.ts`):
  - the existing API-level reorder test keeps passing unchanged (it already sends all three items);
  - **new**: drag the last row above the first _through the UI_, reload, assert the order held;
  - **new**: a ranked list mixing a movie and a TV show, with one item marked `WATCHED` by the
    viewer, keeps the dragged order across a reload (the RC1 regression);
  - **new**: a partial `positions` payload is rejected with `400`;
  - **new**: a `VIEWER` member sees no `[aria-label="Drag to reorder"]` handle and their direct
    PATCH returns `403`.
