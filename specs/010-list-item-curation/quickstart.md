# Quickstart: verifying List Item Curation

**Feature**: `010-list-item-curation` | **Branch**: `010-list-item-curation`

How to bring the feature up locally and confirm each of the three stories by hand. Every check below
maps to an acceptance scenario or success criterion in [spec.md](./spec.md).

---

## 0. Setup

```bash
# Postgres must be reachable via DATABASE_URL in .env
yarn db:migrate --name add_list_item_hidden_and_tags   # once, when the schema commit lands
yarn db:generate
yarn dev                                               # http://localhost:3000
```

Fixture you need (build it once, reuse it for all three stories):

- A list `curation-demo` you own, layout **List** (so ranks and rows are visible), with **ranking
  enabled**.
- 12 items. Give three of them no release year if you can (or note which three you will hide).
- A second member on the list with role `CONTRIBUTOR`, and a third with role `VIEWER`.
- A second list `curation-other` you also own, with at least one item.

Two browser profiles (or a normal window + a private window) make the "second member sees it too"
checks quick.

---

## 1. Hiding an item (Story 1, P1)

| #   | Do this                                                                               | Expect                                                                                                                             | Covers          |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | Open `/lists/curation-demo`. Click the eye toggle on the item ranked **2**.           | The item stays in position 2, renders at half opacity with an `EyeOff` badge, and the toggle now reads "Unhide". No reload needed. | AS 1.1, FR-004  |
| 2   | Note the ranks of items 1, 3 and 4.                                                   | Unchanged: 1, 3, 4. Nothing renumbered.                                                                                            | AS 1.8, SC-008  |
| 3   | In the second profile, log in as the `CONTRIBUTOR` and open the same list.            | Item 2 is faded there too.                                                                                                         | AS 1.2, SC-002  |
| 4   | Back in the owner's window, switch on the hidden-item filter.                         | Item 2 disappears. The URL gains `?hidden=exclude`. Remaining items keep ranks **1, 3, 4** — with the gap.                         | AS 1.3, FR-007  |
| 5   | Reload. Then copy the URL into the second profile.                                    | The filter is still applied in both.                                                                                               | AS 1.4, FR-005  |
| 6   | While filtered, look for drag handles.                                                | None. One line reads "Reordering is off while hidden items are filtered out."                                                      | AS edge, FR-008 |
| 7   | Switch the filter off, then unhide item 2.                                            | It returns to full emphasis. Its note, votes, comments and rank are exactly as before.                                             | AS 1.5, FR-006  |
| 8   | Log in as the `VIEWER` and open the list.                                             | No eye toggle on any item. Hidden items still visibly faded. The filter control still works.                                       | AS 1.6, FR-003  |
| 9   | Hide **every** item, switch the filter on.                                            | Not an empty-looking list: "Every item on this list is hidden." plus a control that clears the filter.                             | Spec edge case  |
| 10  | Set the list's item cap to the current item count, hide one item, try to add another. | Refused — "List is at capacity". Hiding is not a way to make room.                                                                 | FR-026          |
| 11  | Stop the dev server (or block the API), then click a toggle.                          | The item snaps back to its previous appearance and a plain-language error appears. No stack trace.                                 | AS 1.7, FR-009  |

Timing check: step 1 should be one click and well under 10 seconds end to end (**SC-001**), and
steps 4 + 7 are one click each (**SC-003**).

---

## 2. Tagging items (Story 2, P2)

| #   | Do this                                                                                      | Expect                                                                                                  | Covers         |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Open an item, add the tags `halloween` and `rewatch`.                                        | Both appear as chips on the item. The `CONTRIBUTOR`'s window shows them after a refresh.                | AS 2.1         |
| 2   | Open a **different** item on the same list, type `hal`.                                      | `halloween` is offered; accepting it needs no further typing.                                           | AS 2.2, SC-004 |
| 3   | Open `/lists/curation-other`, open an item, type `hal`.                                      | **No** suggestions from `curation-demo`. Same account, no leakage.                                      | AS 2.3, SC-005 |
| 4   | Back on the first item, enter `Halloween`, then `halloween`.                                 | Both rejected as already present — still exactly one halloween chip, and no error is shown.             | AS 2.4, FR-014 |
| 5   | Paste `noir, rewatch` into the tag field on a fresh item and confirm.                        | Two chips: `noir` and `rewatch`. Not one chip containing a comma.                                       | Spec edge case |
| 6   | Add `Noir` to a third item.                                                                  | It renders as `noir` — the list's first-used casing — and the suggestion list shows one entry, not two. | Spec edge case |
| 7   | Remove `halloween` from every item that has it, then type `hal` on any item.                 | No suggestion. The tag has left the list's vocabulary.                                                  | AS 2.5, FR-016 |
| 8   | As the `VIEWER`, open an item.                                                               | Chips are readable; there is no tag input and no remove affordance.                                     | AS 2.6, FR-011 |
| 9   | Try an empty tag, a whitespace-only tag, and a 31-character tag.                             | Each rejected with a plain-language message; nothing saved; existing chips untouched.                   | AS 2.7, FR-015 |
| 10  | Add 15 tags to one item, then try a 16th.                                                    | Refused: "An item can have at most 15 tags."                                                            | FR-015         |
| 11  | Hide an item that has tags, then open it.                                                    | Its tags are still readable **and** editable.                                                           | AS 2.8, FR-017 |
| 12  | Delete an item that carries a tag no other item uses, then type that tag's prefix elsewhere. | No suggestion — the tag went with the item.                                                             | Spec edge case |

---

## 3. Stats breakout (Story 3, P3)

Set the fixture up deliberately, then hand-count before you look:

- 12 items, **3 hidden**.
- Release years spanning 1985, 1989, 1994, 2001 (→ three decades), plus at least one item with an
  unknown year.
- The tag `rewatch` on a hidden item **only**; the tags `noir` and `rewatch` both on visible items.

| #   | Do this                                                             | Expect                                                                                                                               | Covers         |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| 1   | From the list page, without scrolling, find and click **Stats**.    | The button sits in the header's action cluster; a dialog opens over the list.                                                        | AS 3.5, SC-007 |
| 2   | Read "Items" and "Still in play".                                   | `12` and `9`.                                                                                                                        | AS 3.1         |
| 3   | Read "Decades".                                                     | `3`. The unknown-year item contributed nothing; hidden items **did** count.                                                          | AS 3.2, 3.3    |
| 4   | Read "Tags in use".                                                 | Counts only tags on visible items — `rewatch` is present there too, so it counts, but a tag living _only_ on a hidden item does not. | AS 3.4, FR-022 |
| 5   | Look for any control that changes the list.                         | None. Only "close".                                                                                                                  | AS 3.7, FR-024 |
| 6   | Switch on `?hidden=exclude` and reopen the stats.                   | Identical four figures — stats describe the list, not the current view.                                                              | FR-020         |
| 7   | Open the stats on a brand-new empty list.                           | Four zeros **and** a line explaining there is nothing to summarise yet.                                                              | AS 3.6, FR-023 |
| 8   | As the `VIEWER`, and then as a logged-out visitor on a public list. | Same four figures, still read-only.                                                                                                  | AS 3.7, FR-025 |

Every figure in steps 2–4 must match the hand count you did before opening the dialog (**SC-006**,
**SC-009**).

---

## 4. Regression checks (the 009 fix must survive)

| Check                                                                                            | Why                                      |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| With the filter **off**, drag an item on the ranked list and reload.                             | The reorder fix from 009 still persists. |
| Ranked grid layout still shows one flat section with rank badges, hidden items faded among them. | No read-path partitioning reintroduced.  |
| Unranked (grouped) list: hide a movie — it stays in the movies section, faded.                   | Spec edge case.                          |
| `GET /api/lists/curation-demo/radarr` still returns every movie, hidden ones included.           | research.md R12.                         |
| Sorting still works and the filter survives a sort change (both params in the URL together).     | FR-005.                                  |

---

## 5. Automated gate

```bash
yarn test -- src/lib/list-item-tags.test.ts
yarn test -- src/lib/list-stats.test.ts
yarn test -- src/lib/list-view-params.test.ts
yarn test -- src/lib/list-item-ordering.test.ts
yarn test -- src/lib/list-item-permissions.test.ts
yarn test:e2e -- e2e/lists-curation.spec.ts
yarn ci:check          # lint + format + migrate + test + build — the completion gate
```

`yarn ci:check` needs `DATABASE_URL` pointing at a reachable Postgres; it runs the migration, so it
is also the check that the new migration applies cleanly from scratch.
