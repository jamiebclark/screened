# Contract: list item tags (assignments) — CHANGED

**Feature**: `011-list-challenge-tracking` | **Status**: EXISTING routes, internals reshaped
**Files**:

- `src/app/api/lists/[slug]/items/[itemId]/tags/route.ts` — `POST`
- `src/app/api/lists/[slug]/items/[itemId]/tags/[tagId]/route.ts` — `DELETE`

**Supersedes**: [010's contract](../../010-list-item-curation/contracts/list-item-tags.md).

## The headline: the wire contract does not change

Both request and response shapes are **identical** to 010, deliberately (see
[research.md R5](../research.md)):

- `POST` still takes `{ "labels": string[] }`.
- Both still return `{ "tags": [{ "id", "label", "normalized" }, …] }`, `createdAt` asc.
- `id` is still the **assignment** id (`ListItemTag.id`), not the `ListTag` id.
- `tagId` in the `DELETE` path is still the **assignment** id.
- Every status code and every 400 message is unchanged.

So `list-item-tag-editor.tsx`, `list-items-grid.tsx`, `list-items-list-view.tsx` and
`list-item-modal.tsx` need no contract change — only the _vocabulary_ type they receive as a prop
gains an `id` field. `label` and `normalized` are now read through the `listTag` join rather than
from the assignment row.

Keeping `id` as the assignment id is the cheaper correct choice: it is already unique, already what
the client holds, and switching to `listTagId` would break three callsites for no gain.

---

## `POST /api/lists/[slug]/items/[itemId]/tags`

Adds one or more tags to an item. **Set-merge semantics** unchanged: labels the item already
carries are silently skipped, and validation is all-or-nothing across the batch.

### What changed inside

Under the old shape the handler inserted `{ listItemId, label, normalized }` rows. It now:

1. builds the vocabulary from `list.tags` (`ListTag` rows) plus the items' assignments — the same
   `buildTagVocabulary()` the page uses;
2. calls `validateTagBatch(labels, item.tags, vocabulary)`, which returns
   `{ linkTagIds, createTags }` ([data-model.md §3.2](../data-model.md));
3. in **one `prisma.$transaction`**: `createMany` the missing `ListTag` rows (`skipDuplicates`),
   re-reads their ids, then `createMany` the `ListItemTag` join rows (`skipDuplicates`);
4. returns the item's full resulting tag set, joined to `listTag` for `label`/`normalized`.

Step 3 is what makes **FR-008** true — a label the list does not yet know about becomes a `ListTag`
as part of the same action, so an item can never carry a tag the list does not know about. The
transaction means a failure part-way cannot leave an orphan `ListTag` with no assignment _and_ an
item with a tag it should not have; `skipDuplicates` plus the two unique indexes make a concurrent
identical request idempotent rather than a 500.

### Request

```http
POST /api/lists/hooptober-2026/items/clx123abc/tags
Content-Type: application/json

{ "labels": ["folk horror", "1970s"] }
```

| Field    | Type       | Required | Notes                                                                                         |
| -------- | ---------- | -------- | --------------------------------------------------------------------------------------------- |
| `labels` | `string[]` | yes      | 1–15 entries. Produced client-side by `splitTagInput()`, so a pasted `"a, b"` arrives as two. |

### Responses

| Status | Body                                               | When                                                                                                |
| ------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `200`  | `{ "tags": [{ "id", "label", "normalized" }, …] }` | Success. The item's **full resulting** tag set. Also returned when every label was already present. |
| `400`  | `{ "error": "<plain-language message>" }`          | See table below.                                                                                    |
| `401`  | `{ "error": "Unauthorized" }`                      | No session.                                                                                         |
| `403`  | `{ "error": "Forbidden" }`                         | Not owner and not an `OWNER`/`CONTRIBUTOR` member.                                                  |
| `404`  | `{ "error": "Not found" }`                         | Unknown slug, unknown item, or item not on that list.                                               |
| `500`  | `{ "error": "Something went wrong" }`              | Unexpected failure; logged server-side.                                                             |

### Validation (400 messages) — all unchanged

| Condition                                          | `error`                               |
| -------------------------------------------------- | ------------------------------------- |
| `labels` not an array, or any element not a string | `Tags must be text`                   |
| Any label empty after normalisation                | `Tag cannot be empty`                 |
| Any label longer than 30 characters                | `Tags must be 30 characters or fewer` |
| Resulting assignment count would exceed 15         | `An item can have at most 15 tags`    |

The cap counts **assignments on the item**, so declaring more tags on the list does not raise it
(spec edge case "a tag capped out").

---

## `DELETE /api/lists/[slug]/items/[itemId]/tags/[tagId]`

Removes one tag from one item. `tagId` is the assignment id. **Unchanged**, including the `200`
body (`{ "tags": […] }`, the item's remaining set) and the `404` when
`assignment.listItemId !== itemId`.

Note what this does **not** do: removing a tag from an item leaves the `ListTag` in place. That is
required — the category is still declared for the list even when no film currently covers it
(FR-001, FR-009). Deleting the _declaration_ is [`DELETE …/lists/[slug]/tags/[tagId]`](./list-tags.md).

---

## `POST /api/lists/[slug]/items` — tags on add

**Unchanged contract**: still accepts an optional `labels` field alongside `tmdbId` / `type` /
`notes` / `noteIsSpoiler`, still validates it _before_ creating anything so a rejected batch cannot
leave a freshly added item behind, still returns `400` with the same messages.

Internals change the same way as `POST …/items/[itemId]/tags`: the vocabulary is built from the
list's `ListTag` rows, and unknown labels become `ListTag` rows in the same transaction as the item
and its assignments.
