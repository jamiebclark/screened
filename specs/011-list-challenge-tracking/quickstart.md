# Quickstart: verifying List Challenge Tracking

**Feature**: `011-list-challenge-tracking` | **Branch**: `011-list-challenge-tracking`

How to bring the feature up locally and confirm each of the four stories by hand. Every check maps
to an acceptance scenario (AS), functional requirement (FR) or success criterion (SC) in
[spec.md](./spec.md).

---

## 0. Setup, and the one check you cannot skip

```bash
# Postgres must be reachable via DATABASE_URL in .env
yarn db:migrate --name add_list_tags_and_challenge_window   # once, when the schema commit lands
yarn db:generate
yarn dev                                                    # http://localhost:3000
```

### 0a. Prove the backfill before anything else (SC-002, FR-010)

`yarn ci:check` only proves the migration applies to an **empty** database. The backfill needs a
database that already holds pre-feature tag data. Do this **before** migrating:

```bash
# On the pre-migration database (checkout main, or an untouched dev DB):
psql "$DATABASE_URL" -c 'SELECT count(*) AS assignments FROM "ListItemTag";'
psql "$DATABASE_URL" -c 'SELECT count(DISTINCT (li."listId", t."normalized")) AS distinct_tags
                         FROM "ListItemTag" t JOIN "ListItem" li ON li.id = t."listItemId";'
# Note both numbers. Also note a few (item, label) pairs, ideally one whose label
# is written with different casing on two different items.
```

Then migrate and compare:

```bash
psql "$DATABASE_URL" -c 'SELECT count(*) AS assignments FROM "ListItemTag";'   # must be IDENTICAL
psql "$DATABASE_URL" -c 'SELECT count(*) AS tags FROM "ListTag";'              # must equal distinct_tags
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "ListItemTag" WHERE "listTagId" IS NULL;'  # must be 0
```

| Check                                  | Expect                                                                  | Covers         |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------- |
| `ListItemTag` count before vs. after   | Identical. Not one assignment lost.                                     | SC-002, FR-010 |
| `ListTag` count                        | Equals the pre-migration distinct `(listId, normalized)` count.         | R2             |
| Rows with `listTagId IS NULL`          | Zero — and if the migration _failed_, it rolled back entirely.          | invariant 7    |
| The mixed-casing tag, on the list page | Reads with the **earliest-used** casing, on both items, same as before. | spec edge case |

If `ALTER COLUMN … SET NOT NULL` raises, the migration aborted and nothing changed. **Do not** clear
the `NULL` rows to get past it — investigate the mapping. Deleting them destroys exactly the data
SC-002 protects.

### 0b. Fixture

- A list `hooptober-demo` you own, display mode **Grid**, voting on.
- 6 items, at least one TV show, at least one with no release year if you can arrange it.
- A second member with role `CONTRIBUTOR`, a third with role `VIEWER`.
- An empty list `hooptober-empty` you own, with **no items at all**.

Two browser profiles (or a normal window + a private window) make the multi-member checks quick.

---

## 1. Declaring the categories before finding the films (Story 1, P1)

| #   | Do this                                                                      | Expect                                                                                                                                            | Covers                 |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Open `/lists/hooptober-empty`. Click the **Tags** icon in the header.        | A tag manager opens on a list with zero items. It is empty, with an invitation to declare a category.                                             | FR-002                 |
| 2   | Declare `folk horror`, `a film from the 1930s`, `number in the title`.       | All three appear as rows, each showing "0 films".                                                                                                 | AS 1.1, FR-001         |
| 3   | Declare `Folk Horror` again.                                                 | No duplicate row and no error — the existing tag is what you get back.                                                                            | AS 1.7, FR-004         |
| 4   | Declare all 31 of a real category sheet.                                     | 31 rows, no film added. This is SC-001.                                                                                                           | SC-001                 |
| 5   | Add a film to the list. In the add dialog's tag field, type `fol`.           | `folk horror` is suggested, though no item carries it yet.                                                                                        | AS 1.2, FR-007         |
| 6   | Open the header **Stats**.                                                   | The Tags section lists all declared tags; the uncovered ones show a count of **0**, not omitted.                                                  | AS 1.3, FR-009         |
| 7   | Tag two films `folk horror`. In the tag manager, rename it to `Folk Horror`. | Both films show the new name immediately. No film is left showing the old one.                                                                    | AS 1.4, FR-005, SC-003 |
| 8   | Rename `Folk Horror` to `number in the title` (which exists).                | Rejected with "Another tag on this list already uses that name". Nothing changes, nothing merges.                                                 | spec edge case         |
| 9   | Delete a tag that two films carry.                                           | You are told **2 items** will be affected before confirming. After confirming it is gone from the manager, from suggestions, and from both films. | AS 1.5, FR-006         |
| 10  | Tag an item by typing `brand new category` — a name the list does not hold.  | It is accepted, and it now appears in the tag manager as a declared tag of the list.                                                              | FR-008                 |
| 11  | Load one item to its 15-tag cap, then try a 16th.                            | "An item can have at most 15 tags". Declaring more list tags does not raise the cap.                                                              | spec edge case         |
| 12  | In the second profile as the **VIEWER**, open the list and the Tags icon.    | Tags are readable. No create field, no rename, no delete.                                                                                         | AS 1.6, FR-003         |
| 13  | As the VIEWER, `POST /api/lists/hooptober-demo/tags` by hand.                | `403`.                                                                                                                                            | FR-003                 |

---

## 2. Scoring only what was watched during the challenge (Story 2, P2)

Set up the deciding case first, because it is the one that is easy to get wrong.

| #   | Do this                                                                                                    | Expect                                                                                                                                         | Covers                                   |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Open list settings → Settings. Set the challenge window to **1 Sep 2026 – 31 Oct 2026**. Save.             | Saved. The window shows on the list page and on the history view.                                                                              | AS 2.1, FR-011, FR-012                   |
| 2   | Set the end date to **1 Aug 2026** and save.                                                               | Rejected: "Challenge end date cannot be before the start date". Re-open settings — the **September–October** window is still there, untouched. | AS 2.2, FR-013, SC-009                   |
| 3   | Pick a film on the list tagged `folk horror`. Log a watch of it dated **10 Aug 2026** (before the window). | On the list page's Stats, `folk horror` is **not** covered. Coverage reads 0 for it.                                                           | AS 2.5, FR-022, SC-004                   |
| 4   | Open **History** in the header.                                                                            | The 10 Aug watch is **not** listed.                                                                                                            | AS 2.4, FR-017                           |
| 5   | Now log a second watch of that same film dated **3 Oct 2026**.                                             | Stats: `folk horror` now **covered**, count 1. History: the 3 Oct watch appears. This flip is SC-004.                                          | AS 2.6, SC-004                           |
| 6   | Log a third watch of the same film dated **10 Oct 2026**.                                                  | History shows **both** October watches. Coverage for `folk horror` is still exactly 1 — credited once.                                         | spec edge case, FR-024                   |
| 7   | Log a watch dated exactly **1 Sep 2026**, and another exactly **31 Oct 2026**.                             | Both appear in the history and both count. Boundaries are inclusive at each end.                                                               | spec edge case, FR-017                   |
| 8   | In the second profile, as the CONTRIBUTOR, log a watch of a **different** list film inside the window.     | Back as the owner: the history shows their watch with **their** avatar and name; the in-window totals include both films.                      | AS 2.3, AS 2.7, FR-016, FR-023           |
| 9   | Mark two episodes of the list's TV show watched, inside the window.                                        | Both appear in the history on their dates, labelled with season/episode, interleaved with the films by date.                                   | AS 2.8, FR-018                           |
| 10  | Open Stats.                                                                                                | Two clearly headed blocks: **During the challenge** and **All time**. No ambiguity about which is which.                                       | AS 2.9, FR-025                           |
| 11  | Count the uncovered categories from the list page.                                                         | "Still to cover" names them. You can answer "how many are left" in well under 15 seconds. This is SC-005.                                      | SC-005                                   |
| 12  | Name who watched a given title and when, from the history view alone.                                      | Every in-window watch is attributed. You never leave the list's pages. This is SC-006.                                                         | SC-006                                   |
| 13  | Hide an item that was watched inside the window.                                                           | It stops contributing to the figures, but its watch is **still listed** in the history.                                                        | spec edge case                           |
| 14  | Log an in-window watch of an **untagged** list film with a known year and country.                         | Covers no category, but does add to the decade and country figures.                                                                            | spec edge case                           |
| 15  | Do the same for a film with no year and no country.                                                        | Contributes to no decade or country figure. No error anywhere.                                                                                 | spec edge case                           |
| 16  | Clear both dates in settings and save.                                                                     | Stats shows **no** in-window block, only the all-time figures. History still lists members' watches with no date restriction.                  | AS 2.10, FR-014, FR-020, FR-026          |
| 17  | Set the window to a range entirely in the future.                                                          | An empty history with a short explanation. Not an error page.                                                                                  | spec edge case                           |
| 18  | Remove the CONTRIBUTOR from the list, then reload the history.                                             | Their watches are gone from the scoreboard.                                                                                                    | spec edge case, FR-016                   |
| 19  | As the **VIEWER**, open the history.                                                                       | Readable. Their own in-window watches count towards the group totals too.                                                                      | FR-019, spec assumption                  |
| 20  | Log out entirely and open `/lists/hooptober-demo/history` (list is public).                                | Redirected to login. The list page and its aggregate Stats remain visible; the attributed history is member-only.                              | FR-019, [research.md R11](./research.md) |
| 21  | As the CONTRIBUTOR, try `PATCH /api/lists/hooptober-demo` with a window.                                   | `403` — the window follows the list-settings rule, not the curation rule.                                                                      | FR-012                                   |

---

## 3. Seeing an item's categories on the poster grid (Story 3, P3)

| #   | Do this                                                                            | Expect                                                                                                 | Covers         |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------- |
| 1   | Set the list to **Grid** mode. Ensure some items are tagged and some are not.      | Tagged cards show their tags beneath the poster, readable without opening anything.                    | AS 3.1, FR-027 |
| 2   | Tag one item with five categories.                                                 | Two chips plus a `+3` counter. Nothing overflows the card.                                             | AS 3.2, FR-029 |
| 3   | Look at an untagged card.                                                          | No empty tag strip and no extra height — the card is exactly as before.                                | AS 3.3, FR-028 |
| 4   | Count posters per row at 375px, 640px, 768px, 1024px and 1280px, before and after. | Identical at every width: 2 / 3 / 4 / 5 / 5. This is SC-007.                                           | AS 3.4, SC-007 |
| 5   | Click a tagged card's poster, and then near its chips.                             | The poster opens the item modal. The chips are inert text — they do not swallow the click or navigate. | R13            |

---

## 4. Keeping the list's actions in reach on a long list (Story 4, P4)

| #   | Do this                                              | Expect                                                                               | Covers         |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------- |
| 1   | Build a list of ~60 items. Scroll past the header.   | A slim bar appears under the nav showing the list name.                              | AS 4.1, FR-030 |
| 2   | Use its **Add** action.                              | The same add dialog as the top of the page, with the same tag field and suggestions. | AS 4.2, FR-031 |
| 3   | Use its **figures** action.                          | The same Stats dialog, including the in-window block.                                | AS 4.3, FR-031 |
| 4   | Reach both actions from the very bottom of the list. | Both are reachable without scrolling back up. This is SC-008.                        | SC-008         |
| 5   | As the VIEWER (cannot add), scroll the long list.    | The bar appears, with **no** add action.                                             | AS 4.4, FR-032 |
| 6   | Open a list short enough to fit on screen.           | No bar at all — no duplicated title.                                                 | AS 4.5, FR-032 |
| 7   | Scroll back to the very top of the long list.        | The bar disappears; only the real header shows.                                      | FR-030         |

---

## 5. Nothing else moved (SC-010)

| Check                                                            | Expect                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Ranked list drag-to-reorder, and the `?hidden=exclude` filter    | Unchanged.                                |
| Voting totals, comments and unread comment badges                | Unchanged.                                |
| The all-time Stats figures on a list with no window              | Byte-for-byte the same figures as before. |
| `GET /api/lists/<slug>/radarr`                                   | Same payload. Tags are not exported.      |
| Adding an item still fires the Discord notification              | Unchanged.                                |
| Item **notes** are still editable only by the owner or the adder | Not widened by tag permissions.           |

## 6. Gate

```bash
yarn lint
yarn test                                   # includes the new + updated Vitest suites
yarn test:e2e -- e2e/lists-challenge.spec.ts
yarn ci:check                               # the completion gate; runs the migration from scratch
```
