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
