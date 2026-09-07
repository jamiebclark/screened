# Lists

Lists are Screened's core social feature — shared collections of movies that any member can contribute to. They also double as live Radarr import endpoints so your download client stays in sync automatically.

## Creating a list

1. Go to **Lists → New List**
2. Give it a name — a URL-friendly slug is generated automatically
3. Choose public or private visibility

## Inviting members

1. Open a list and click **Invite member**
2. Enter a member's email address — they must already have a Screened account
3. They'll immediately have contributor access

List owners can review **access requests** for private lists. Contributors receive notifications when someone asks to join.

## Editing a list

Owners can open the gear icon on a list's page and use the **Settings** tab to:

- Rename the list and edit its description (100 / 1000 character limits; a blank name is
  rejected). The URL slug never changes when you rename a list.
- Change the **Layout** (Grid or List) — items re-render immediately in the new layout, and a
  ranked list keeps its rank order and numbers regardless of layout.
- Toggle ranking, voting, and comments, and set an item cap.

Changes apply immediately for every viewer without a manual reload. Contributors and viewers do
not see these editing controls, and direct API edits from non-owners are rejected.

### Deleting a list

The **Settings** tab ends with a **Danger zone** holding **Delete list**. Only the list's owner
sees it, and the API rejects a delete from anyone else. Deleting takes two clicks — the first
reveals a confirmation naming the list — because it is permanent and applies to everyone: the
list's items, tags, comments and votes all go with it, for every member, and there is no undo. If
the list had a Discord webhook, that webhook is removed too. You are returned to `/lists`
afterwards.

Deleting a list does not touch anyone's watch history or ratings; those live on the titles
themselves, not on the list.

### Ranked lists

When a list has ranking enabled, dragging an item to a new position persists that order for every
member, in both Grid and List layout, regardless of mixing movies and TV shows or each viewer's own
watched state. If a reorder fails to save, the drag reverts and an error is shown — your list is
never left silently out of order.

## Finding titles to add

The add-title search on a list supports narrowing results:

- Restrict to **Films**, **TV**, or **All** (the default).
- Restrict to a specific release year.
- **Load more** to page beyond the first set of results.

Combine type and year to find titles that are hard to distinguish by name alone — for example,
searching "House" restricted to Films and year 1985 finds the 1985 film directly.

## Curating a list

Owners and contributors can curate items without deleting them, keeping viewers focused on what
still matters while preserving history and votes.

### Hiding items

Click the eye icon on any item to hide it. Hidden items:

- Render at reduced opacity with an `EyeOff` badge, visible to every member — not just the person
  who hid it.
- Keep their rank, note, votes and comments exactly as they were; unhiding restores full emphasis
  with nothing lost.
- Stay in a ranked list's drag order — the gap left behind is not renumbered.
- Are still counted for the list's item cap, and still included in the Radarr export.

Viewers can see which items are hidden but cannot hide or unhide anything themselves.

Use the **hidden-item filter** pill in the header to remove hidden items from view entirely. The
filter's state lives in the URL (`?hidden=exclude`), so it survives a reload and a shared link.
While the filter is active, drag-to-reorder is disabled — reordering a partial list would make the
persisted order ambiguous — and a note explains why. If every item on the list happens to be
hidden, filtering shows an explanatory message instead of an empty list.

### Tagging items

Any member with edit rights can add free-text tags to an item — for example `halloween` or
`rewatch`. Tags:

- Are shared with every viewer of the list, not just their creator.
- Build a per-list autocomplete vocabulary: typing a few characters on any item suggests tags
  already used elsewhere on that same list. Tags never leak across lists.
- Canonicalize to the casing first used on the list (`Noir` and `noir` collapse into a single
  chip), and are capped at 15 tags per item, 30 characters per tag.
- Remain visible and editable on hidden items.

Viewers can read tag chips but cannot add or remove them.

### List stats

Click the stats icon in the header to see a read-only breakout of the list's shape: total items,
items still in play (not hidden), distinct release decades, and distinct tags in use on visible
items. Stats describe the whole list regardless of the current hidden-item filter, and are visible
to every viewer, including logged-out visitors on public lists.

## Running a challenge

Lists support Hooptober-style challenges: declare the categories up front, set a window, and let
the list track who watched what and when.

### Declaring categories

Click the **Tags** icon in the header to open the list's declared tags — separate from the
free-text tags on individual items:

- Curators (owners and contributors) can declare, rename, and delete tags here, independently of
  any item. A newly declared tag shows **0 films** until something is tagged with it.
- Declared tags are offered as suggestions the moment you start tagging an item, and any label you
  type that isn't already declared is added to the list's vocabulary automatically.
- Renaming merges nothing — it only changes the label everywhere it's used. Trying to rename one
  tag to a name another tag on the list already uses is rejected.
- Deleting a tag tells you how many items it will be removed from before you confirm.
- Viewers can read declared tags but cannot create, rename, or delete them.

### Setting the challenge window

Owners set an optional challenge window from the **Settings** tab — a start date, an end date, or
both. Only owners can change it; contributors and viewers cannot. **Clear window** removes both
dates. While a window is set:

- The list's Stats show a **During the challenge** block above the all-time figures: categories
  covered (against the declared tag count), decades, countries, and films watched, plus a
  **Still to cover** list of every uncovered category.
- A watch counts once its date falls on or inside the window's start and end dates (both inclusive)
  — watching a title again inside the window after an earlier out-of-window watch is what flips its
  categories from uncovered to covered.
- Hiding an item removes it from the in-window figures but its watch stays listed in the history.

With no window set, only the all-time figures show, and the history has no date restriction.

### Reading the shared history

The **History** icon (owners and members only) opens a shared, date-ordered scoreboard of who
watched what on the list, attributed by name and avatar, TV episodes labelled `S1E4`-style and
interleaved with films by date. If a window is set, only in-window watches appear; log out or set a
window with nothing in it yet and you'll see a short explanation instead of an empty page.

### Grid and sticky header

In Grid layout, a tagged item shows up to two of its tags beneath the poster plus a `+N` counter for
the rest — untagged cards are unchanged. On a long list, a slim bar with the list name and the same
Add/Stats actions as the header stays in reach once you scroll past the top; it never appears on a
list short enough to fit on screen.

## Privacy

| Visibility | Radarr endpoint | Discoverable by others |
| ---------- | --------------- | ---------------------- |
| Public     | No token needed | Yes                    |
| Private    | Token required  | No                     |

## Radarr integration

Every list exposes a live endpoint that Radarr polls to auto-download movies added to the list.

**Endpoint format:**

```
http://your-server:3000/api/lists/{list-slug}/radarr
```

For private lists, append your list token:

```
http://your-server:3000/api/lists/{list-slug}/radarr?token={radarrToken}
```

The token is shown on the list's page when you're logged in.

**Adding to Radarr:**

1. In Radarr, go to **Settings → Lists → Add List**
2. Choose **Custom Lists**
3. Paste the endpoint URL
4. Set your quality profile and root folder
5. Save — Radarr will poll the list and queue downloads automatically

**Response format:**

Radarr's "Custom Lists" type parses the response as TMDB-shaped JSON and matches
movies on the `id` field only — it discards any entry whose `id` is missing or
zero, reporting the list as empty. `title` and `year` are ignored by Radarr and
included purely to make the raw JSON readable.

```json
[{ "id": 9820, "title": "The Parent Trap", "year": 1998, "adult": false }]
```
