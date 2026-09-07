# Contract: challenge window on the list settings PATCH — CHANGED

**Feature**: `011-list-challenge-tracking` | **Status**: EXISTING route, two new fields
**File**: `src/app/api/lists/[slug]/route.ts` — `PATCH`

The challenge window is a **list setting**, so it rides on the handler that already owns list
settings rather than getting a route of its own. That also settles who may change it: the existing
handler requires `list.ownerId === session.user.id`, so the window follows the list-settings rule,
**not** the item-curation rule (FR-012, and the spec's flagged assumption — adopted as written, see
[research.md R11](../research.md)).

No new route means no new authorisation surface to review.

---

## Request

```http
PATCH /api/lists/hooptober-2026
Content-Type: application/json

{ "challengeStartsAt": "2026-09-01", "challengeEndsAt": "2026-10-31" }
```

| Field               | Type             | Required | Notes                                                             |
| ------------------- | ---------------- | -------- | ----------------------------------------------------------------- |
| `challengeStartsAt` | `string \| null` | no       | `"YYYY-MM-DD"` or a full ISO datetime. `null` clears it (FR-014). |
| `challengeEndsAt`   | `string \| null` | no       | Same. Either may be sent alone — a half-open window is valid.     |

Both fields are optional and **absence is not `null`**: a body that omits a field leaves the stored
value untouched, matching how the handler already treats `name`, `isPublic`, `itemCap` and the rest.
Sending `null` is the explicit "clear it" instruction.

All existing fields (`name`, `description`, `isPublic`, `rankingEnabled`, `votingEnabled`,
`commentsEnabled`, `displayMode`, `itemCap`) are accepted exactly as before, including the
ranking/voting mutex and the position renumbering it triggers.

## Responses

| Status | Body                                                                                  | When                                     |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| `200`  | The updated list row, `discordWebhookUrl` stripped, now including both window columns | Saved.                                   |
| `400`  | `{ "error": "Challenge end date cannot be before the start date" }`                   | End earlier than start (FR-013, SC-009). |
| `400`  | `{ "error": "Challenge dates must be calendar dates" }`                               | Unparseable value in either field.       |
| `400`  | existing messages (name, item cap, display mode)                                      | Unchanged.                               |
| `401`  | `{ "error": "Unauthorized" }`                                                         | No session.                              |
| `403`  | `{ "error": "Forbidden" }`                                                            | Not the list owner. Unchanged.           |

**Nothing is saved on a rejected window** (FR-013, SC-009): validation runs before the
`prisma.list.update()` / `$transaction`, alongside the existing `validateListDetails()` and item-cap
checks, and returns early. The previously saved window is left exactly as it was.

`400` (not `422`): consistent with every other validation failure in this handler.

## Validation

Produced by `parseChallengeWindowInput()` in `src/lib/list-challenge-window.ts`
([data-model.md §3.3](../data-model.md)); the route returns its `error` verbatim, so the message the
member reads is unit-tested.

| Condition                                                            | Result                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| Field absent                                                         | keep stored value                                        |
| Field `null`                                                         | store `null`                                             |
| `"YYYY-MM-DD"` or ISO datetime                                       | store `utcDayStart()` of it                              |
| Anything else (non-string, `"soon"`, `"2026-13-45"`)                 | `400 Challenge dates must be calendar dates`             |
| Effective end < effective start, comparing the **post-merge** window | `400 Challenge end date cannot be before the start date` |

The comparison is against the **effective** window — the merge of the body over the stored values —
so sending only `challengeEndsAt` still cannot place the end before an already-saved start. That is
the case a body-only check would miss.

## The clients

`list-settings-panel.tsx` gains two `<input type="date">` fields and a "Clear window" action inside
the existing Settings tab, saved by the existing single `handleSave()` PATCH → `router.refresh()`
(constitution I). Because both columns are stored at UTC day start, the stored value round-trips
into a date input as `toISOString().slice(0, 10)` with no timezone arithmetic.

`GET /api/lists/[slug]` gains both columns in its response as a side effect of returning the row;
this is additive and no existing caller reads unknown fields.
