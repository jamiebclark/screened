# Contract: `PATCH /api/lists/[slug]`

**File**: `src/app/api/lists/[slug]/route.ts`
**Status**: existing route, **extended** (validation added; no field added or removed)
**Covers**: FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017,
FR-018, FR-029, FR-031

## Authentication & authorisation

1. `await auth()` → `401 { "error": "Unauthorized" }` when there is no session.
2. Load the list by `slug` → `403 { "error": "Forbidden" }` when the list does not exist **or**
   `list.ownerId !== session.user.id`. (The existing route deliberately conflates missing and
   not-owned into 403 so a non-owner cannot probe for the existence of private lists. **Keep this.**)

## Request body

`Content-Type: application/json`. Every field is optional; an absent key leaves the column untouched.

| Field             | Type               | New behaviour                                                                                |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `name`            | `string`           | **Validated** — trimmed, non-empty, ≤ 100 chars.                                             |
| `description`     | `string \| null`   | **Validated** — trimmed, ≤ 1000 chars. `""`, whitespace-only, or `null` clears it to `null`. |
| `isPublic`        | `boolean`          | unchanged                                                                                    |
| `rankingEnabled`  | `boolean`          | unchanged (mutex with `votingEnabled`, backfills/clears positions)                           |
| `votingEnabled`   | `boolean`          | unchanged                                                                                    |
| `commentsEnabled` | `boolean`          | unchanged                                                                                    |
| `displayMode`     | `"GRID" \| "LIST"` | **Validated** — anything else is a 400 (previously written through unchecked).               |
| `itemCap`         | `number \| null`   | **Validated** — integer ≥ 1, or `null` for no limit.                                         |

Validation order: parse JSON → `validateListDetails({ name, description })` → `displayMode` →
`itemCap` → ranking/voting mutex. The **first** failure returns and nothing is written.

## Responses

| Status | Body                                                              | When                                                                    |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `200`  | the updated `List` row as JSON                                    | success                                                                 |
| `400`  | `{ "error": "List name is required" }`                            | `name` trims to empty (FR-010)                                          |
| `400`  | `{ "error": "List name must be 100 characters or fewer" }`        | `name` over limit (FR-011)                                              |
| `400`  | `{ "error": "Description must be 1000 characters or fewer" }`     | `description` over limit (FR-011)                                       |
| `400`  | `{ "error": "Name must be text" }` / `"Description must be text"` | wrong JSON type                                                         |
| `400`  | `{ "error": "Display mode must be GRID or LIST" }`                | invalid `displayMode`                                                   |
| `400`  | `{ "error": "Item cap must be a positive number or empty" }`      | invalid `itemCap` (string matches the panel's existing copy)            |
| `400`  | `{ "error": "Invalid request body" }`                             | body is not valid JSON                                                  |
| `401`  | `{ "error": "Unauthorized" }`                                     | no session                                                              |
| `403`  | `{ "error": "Forbidden" }`                                        | not found, or caller is not the owner (contributor/viewer/non-member)   |
| `500`  | `{ "error": "Could not update list" }`                            | unexpected failure; the exception is `console.error`'d server-side only |

## Invariants

- `slug` is **never** written by this route and is never recomputed from `name` (FR-013).
- The response never contains `discordWebhookUrl`. _(Note: the current PATCH returns the raw updated
  row, which includes it. The GET handler strips it at line 42. Strip it in PATCH too — same secret,
  same reason. This is a small correctness fix bundled with the validation commit.)_
- `updatedAt` is bumped by Prisma's `@updatedAt`, so the `/lists` index re-orders after a rename
  (FR-012).

## Client contract

`src/app/(app)/lists/[slug]/list-settings-panel.tsx` sends **one** PATCH containing every panel
field, checks `res.ok`, reads `error` from the body on failure, and on success calls
`router.refresh()` so the RSC header and item list re-render with the new name / description /
layout without a manual reload (FR-012, FR-016).

## Test expectations

- Vitest (`src/lib/list-validation.test.ts`): the validator's accept/reject table, including
  whitespace-only name, exactly-at-limit and one-over-limit for both fields, `null` and `""`
  description clearing, emoji and markdown passed through literally, non-string inputs.
- Playwright (`e2e/lists-edit.spec.ts`): owner renames via the UI and sees the new `h1`; clears the
  description; switches layout and the item rendering changes and survives a reload; empty name is
  rejected with a visible message and the old name is retained; a second user with a
  `CONTRIBUTOR`/`VIEWER` membership gets `403` from a direct PATCH and sees no name/description/layout
  controls.
