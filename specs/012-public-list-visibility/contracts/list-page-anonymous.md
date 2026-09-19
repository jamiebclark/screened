# Contract: `/lists/[slug]` page by viewer context

**Feature**: 012-public-list-visibility

## Routing

| Path                    | Route group | Anonymous behaviour                                 |
| ----------------------- | ----------- | --------------------------------------------------- |
| `/lists`                | `(app)`     | redirect to `/login?callbackUrl=/lists`             |
| `/lists/new`            | `(app)`     | redirect to login                                   |
| `/lists/[slug]`         | `(public)`  | tier-dependent (below)                              |
| `/lists/[slug]/history` | `(public)`  | page-level `auth()` → redirect to login (unchanged) |

## `/lists/[slug]` by tier × viewer

| Tier    | Anonymous                                   | Signed-in non-member               | Member/owner |
| ------- | ------------------------------------------- | ---------------------------------- | ------------ |
| PUBLIC  | **anonymous read-only view**                | today's non-member view            | full view    |
| MEMBERS | redirect `/login?callbackUrl=/lists/<slug>` | today's non-member view            | full view    |
| PRIVATE | redirect `/login?callbackUrl=/lists/<slug>` | `PrivateListGate` (request access) | full view    |
| missing | 404                                         | 404                                | 404          |

`<head><title>` is the list name only when access is `granted`; otherwise "List".

## Anonymous read-only view — rendered

- Tier badge (Globe icon, "Public list"), list name, description, item count
- Sort controls (date added / votes / title / release year) — none depend on viewer state
- Items (grid or list display mode per list setting) with: poster, title, year, type, rank badge (ranked lists), tags, vote pill (totals, non-interactive), comment-count badge, non-spoiler notes in modal
- Stats modal (aggregate item stats only; no challenge-window member progress)
- Tags modal (read-only)
- **One** sign-in prompt in the header action slot: "Sign in to vote and comment" → `/login?callbackUrl=/lists/<slug>`; secondary "Create an account" → `/register`
- Same prompt in the item modal where comments would appear
- Public frame: nav with Sign in / Register, footer

## Anonymous read-only view — never rendered / never in payload

- Member avatars, member count, members list
- `addedBy` avatar/name on items and in the modal
- "Watched by" / "Watching" chips; "N in your watched history"
- Unread comment highlighting; comment threads
- Add item button/FAB, hide/unhide toggle, reorder handles, delete, tag/notes editors
- Vote buttons (pill is display-only)
- Settings/Integrations button, Radarr URL, Discord fields
- Challenge history link
- "Hide hidden items" toggle — hidden items are always excluded
- Request-access gate (Private) — anonymous users are redirected instead

## Owner-facing visibility selector (new list form + settings modal)

Three radio options, in this order, with `Site members` preselected on the new-list form:

| Value     | Label        | Description                                     | Icon  |
| --------- | ------------ | ----------------------------------------------- | ----- |
| `PUBLIC`  | Public       | Anyone on the internet, even without an account | Globe |
| `MEMBERS` | Site members | Anyone signed in to Screened                    | Users |
| `PRIVATE` | Private      | Only list members                               | Lock  |

Existing "switching to private will remove non-member access" warning is shown when changing from PUBLIC or MEMBERS to PRIVATE.

## Tier badge surfaces

`ListCard` (lists index), `ListPageHeader`, `TitleListsSection` all render `<Icon/> <label>` using the option table above.
