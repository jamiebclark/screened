# Letterboxd Integration

Screened can import your Letterboxd diary entries and ratings, merging them into your watch history alongside Plex and manual entries.

## Setup

1. Go to **Settings → Letterboxd** in the app
2. Enter your public Letterboxd username and save
3. Click **Sync now** to import your diary and ratings

Your Letterboxd profile must be public for the sync to work.

## Scheduled sync

With Docker Compose, the `letterboxd-cron` sidecar automatically calls `/api/cron/letterboxd-sync` every `SYNC_INTERVAL_HOURS` (default: 6).

If you're running Screened outside Docker Compose, you can wire your own scheduler:

```
POST /api/cron/letterboxd-sync
Authorization: Bearer <CRON_SECRET>
```

This syncs all linked Letterboxd accounts in one call.
