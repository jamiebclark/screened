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
