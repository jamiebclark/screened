# Contract: list item tags

**Feature**: `010-list-item-curation` | **Status**: NEW routes
**Files**:

- `src/app/api/lists/[slug]/items/[itemId]/tags/route.ts` — `POST`
- `src/app/api/lists/[slug]/items/[itemId]/tags/[tagId]/route.ts` — `DELETE`

**Mirrors**: `items/[itemId]/comments/route.ts` and
`items/[itemId]/comments/[commentId]/route.ts` — the closest existing sibling (a child collection of
a list item with its own authorisation).

There is **no `GET`**. Tags are delivered by the list page's Server Component along with the items,
and the suggestion vocabulary is derived from that same payload — see
[research.md R3](../research.md). Adding a `GET` would create a second place that must re-implement
the list visibility check, for data the page already has.

---

## `POST /api/lists/[slug]/items/[itemId]/tags`

Adds one or more tags to an item. **Set-merge semantics**: labels the item already carries are
silently skipped; validation is all-or-nothing across the batch.

### Request

```http
POST /api/lists/movie-night/items/clx123abc/tags
Content-Type: application/json

{ "labels": ["noir", "rewatch"] }
```

| Field    | Type       | Required | Notes                                                                                                                                          |
| -------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `labels` | `string[]` | yes      | 1–15 entries. The client produces this by `splitTagInput()` on the field, so a pasted `"noir, rewatch"` arrives as two entries in one request. |

A batch endpoint rather than one request per tag is what makes the spec's "Tag entered with
separators" edge case a single atomic mutation: either both tags are saved or neither is.

### Responses

| Status | Body                                               | When                                                                                                                                           |
| ------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | `{ "tags": [{ "id", "label", "normalized" }, …] }` | Success. Body is the item's **full resulting** tag set, `createdAt` asc. Also returned when every submitted label was already present (no-op). |
| `400`  | `{ "error": "<plain-language message>" }`          | See the validation table below.                                                                                                                |
| `401`  | `{ "error": "Unauthorized" }`                      | No session.                                                                                                                                    |
| `403`  | `{ "error": "Forbidden" }`                         | Not owner and not an `OWNER`/`CONTRIBUTOR` member.                                                                                             |
| `404`  | `{ "error": "Not found" }`                         | Unknown slug, unknown item, or item not on that list.                                                                                          |
| `500`  | `{ "error": "Something went wrong" }`              | Unexpected failure; logged server-side, no exception text leaked.                                                                              |

`200` rather than `201`: the operation is a merge into an existing set whose outcome may be "nothing
was created", and the client always wants the resulting set back to re-render chips.

### Validation (400 messages)

Produced by `validateTagBatch()` in `src/lib/list-item-tags.ts`; the route returns its `error`
verbatim, so the message the user reads is unit-tested.

| Condition                                                      | `error`                                 |
| -------------------------------------------------------------- | --------------------------------------- |
| `labels` missing, not an array, empty array, or any non-string | `"Tags must be text"`                   |
| any entry empty or whitespace-only after normalising           | `"Tag cannot be empty"`                 |
| any entry longer than 30 characters after trim + collapse      | `"Tags must be 30 characters or fewer"` |
| the resulting set would exceed 15 tags on the item             | `"An item can have at most 15 tags"`    |

On any of these the route writes **nothing** — the item's existing tags are untouched (FR-015).

### Handler contract

1. `await auth()` → 401 if no session.
2. Load list by `slug` with members → 404 if absent.
3. Load item by `id` with `tags` → 404 if absent or `item.listId !== list.id`.
4. `canCurateListItems(...)` → 403 if false. **`item.isHidden` is not consulted** — tags are
   editable on hidden items (FR-017).
5. Load the list's vocabulary: `prisma.listItemTag.findMany({ where: { listItem: { listId: list.id } }, select: { label, normalized, createdAt } })`,
   then `buildTagVocabulary`-style grouping, so a new tag's casing can be canonicalised to the
   list's first-used casing (R4).
6. `validateTagBatch(body.labels, item.tags, vocabulary)` → 400 with its `error` if `!ok`.
7. `prisma.listItemTag.createMany({ data: value.map(...), skipDuplicates: true })` — `skipDuplicates`
   is belt-and-braces against a concurrent identical add racing past step 6; the
   `@@unique([listItemId, normalized])` constraint is the real guarantee.
8. Re-read the item's tags and respond `200` with the full set.

---

## `DELETE /api/lists/[slug]/items/[itemId]/tags/[tagId]`

Removes one tag from one item.

### Request

```http
DELETE /api/lists/movie-night/items/clx123abc/tags/clt987xyz
```

No body.

### Responses

| Status | Body                                               | When                                                                   |
| ------ | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `200`  | `{ "tags": [{ "id", "label", "normalized" }, …] }` | Success. The item's remaining tags.                                    |
| `401`  | `{ "error": "Unauthorized" }`                      | No session.                                                            |
| `403`  | `{ "error": "Forbidden" }`                         | Not owner and not an `OWNER`/`CONTRIBUTOR` member.                     |
| `404`  | `{ "error": "Not found" }`                         | Unknown slug/item/tag, item not on that list, or tag not on that item. |
| `500`  | `{ "error": "Something went wrong" }`              | Unexpected failure.                                                    |

### Handler contract

Steps 1–4 as above, then: load the tag by `id` → 404 if absent or `tag.listItemId !== itemId`
(prevents deleting another item's tag through this item's URL); `prisma.listItemTag.delete`; respond
with the remaining set.

Removing the list's last row for a normalized form needs **no extra work** — the vocabulary is
derived per render, so the tag stops being suggested automatically (FR-016).

---

## Requirements covered

- **FR-010** — contributors and the owner may add and remove tags on any item.
- **FR-011** — read access rides the page render, so every viewer of the list sees tags.
- **FR-013/FR-014** — normalisation in the lib, uniqueness in the database.
- **FR-015** — the validation table; all-or-nothing.
- **FR-016** — no vocabulary table to clean up.
- **FR-017** — no handler reads `isHidden`.
- **FR-018** — `onDelete: Cascade`, not handler code.
- **FR-025** — both routes authorise before reading or writing.

## Client behaviour

The tag editor lives in the item modal. On a successful add or remove it updates local state from
the returned `tags` array and calls `router.refresh()` so the derived vocabulary and the stats
figures re-render (constitution I). On failure it shows the server's `error` inline beneath the input
and leaves the chips as they were.

## Test expectations

- Vitest (`src/lib/list-item-tags.test.ts`): `normalizeTagLabel`, `tagComparisonKey`,
  `splitTagInput`, `buildTagVocabulary` (ordering, count, first-used casing), `suggestTags` (prefix
  before substring, `exclude`, cap, empty query), `validateTagBatch` (every row of the table above,
  plus the dedup-is-not-an-error and cap-measured-on-the-result cases).
- Playwright (`e2e/lists-curation.spec.ts`): add two tags; type three characters on a second item and
  accept the suggestion; confirm a second list offers none of the first list's tags; remove a tag;
  a `VIEWER` sees chips but no input.
