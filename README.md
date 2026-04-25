# Screened

A self-hosted web app for tracking movies and TV shows with friends, Plex sync, and Radarr integration.

## Features

- **Personal tracking** — watchlist, watching, watched, dropped status with star ratings and reviews
- **Episode tracking** — season and episode-level progress for TV shows
- **Collaborative lists** — create shared movie lists, invite members by email, everyone contributes
- **Plex sync** — link your Plex account and auto-import your watch history to mark movies as watched
- **Radarr export** — every list exposes a live URL endpoint that Radarr can poll to auto-download movies

## Quick Start

### Development

1. Copy the env file and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Required env vars:
   - `TMDB_API_KEY` — Get a free read access token at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
   - `AUTH_SECRET` — Any random 32+ character string (e.g. `openssl rand -base64 32`)
   - `DATABASE_URL` — PostgreSQL connection string

3. Start a local PostgreSQL database (or use Docker):
   ```bash
   docker run -d --name movienight-db -e POSTGRES_USER=movienight -e POSTGRES_PASSWORD=movienight -e POSTGRES_DB=movienightdb -p 5432:5432 postgres:16-alpine
   ```

4. Run migrations and start the app:
   ```bash
   yarn db:migrate
   yarn dev
   ```

### Docker Compose (Self-hosted)

1. Copy and configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your TMDB_API_KEY and AUTH_SECRET
   ```

2. Start everything:
   ```bash
   docker compose up -d
   ```

The app will be available at `http://localhost:3000`.

## Plex Integration

1. Go to **Settings → Plex Settings** in the app
2. Click **Connect Plex** — a Plex auth window opens
3. Sign in and authorize, then return to the settings page
4. Click **Sync now** to import your watch history

Plex sync matches movies using TMDB IDs from Plex's metadata agents.

## Radarr Integration

Each list has a live endpoint at:
```
http://your-server:3000/api/lists/{list-slug}/radarr
```

For private lists, append `?token={radarrToken}` (visible on the list page when logged in).

In Radarr, add it via **Lists → Add List → Custom Lists** using the URL above.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** + Radix UI primitives
- **PostgreSQL** + Prisma 7 ORM
- **Auth.js v5** (credentials auth)
- **TMDB API** for movie/TV metadata
- **Docker Compose** for self-hosting

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── (app)/           # Main app pages (dashboard, search, lists, profile)
│   └── api/             # API routes
├── components/
│   ├── ui/              # Base UI components (Button, Card, Dialog, etc.)
│   └── *.tsx            # Feature components (MediaCard, EpisodeTracker, etc.)
└── lib/
    ├── auth.ts          # Auth.js config
    ├── tmdb.ts          # TMDB API client
    ├── plex.ts          # Plex API client
    └── prisma.ts        # Prisma client singleton
```
