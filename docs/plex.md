# Plex Integration

Screened can sync your Plex watch history to automatically mark movies and TV episodes as watched.

## Setup

1. Go to **Settings → Plex** in the app
2. Click **Connect Plex** — a Plex authorization window opens in your browser
3. Sign in to Plex and authorize Screened
4. Return to the settings page and click **Sync now**

## How sync works

- Screened matches titles using the TMDB IDs embedded in Plex's metadata
- Only items with a recognized TMDB ID are imported — unmatched items are skipped
- Each sync run shows a count of matched, skipped, and newly marked items
- Your Plex token is stored in the database and is never sent to the browser

## Scheduled sync

With Docker Compose, the `plex-cron` sidecar automatically calls `/api/cron/plex-sync` every `SYNC_INTERVAL_HOURS` (default: 6). You can also trigger a sync manually at any time from Settings.

If you're running Screened outside Docker Compose, you can wire your own scheduler to call:

```
POST /api/cron/plex-sync
Authorization: Bearer <CRON_SECRET>
```
