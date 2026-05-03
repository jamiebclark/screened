<p align="center">
  <img src="docs/logo.svg" alt="Screened" width="600">
</p>

<p align="center">
  <a href="https://github.com/jamiebclark/screened/actions/workflows/ci.yml"><img src="https://github.com/jamiebclark/screened/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/jamiebclark/screened/releases"><img src="https://img.shields.io/github/v/release/jamiebclark/screened" alt="Release"></a>
  <a href="https://hub.docker.com/r/jamiebclark/screened"><img src="https://img.shields.io/docker/pulls/jamiebclark/screened?logo=docker&logoColor=white" alt="Docker Pulls"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

<p align="center">A self-hosted web app for tracking movies and TV shows with friends, Plex sync, and Radarr integration.</p>

---

## Features

- **Personal tracking** — watchlist, watching, watched, dropped status with star ratings and reviews
- **Episode tracking** — per-episode progress for TV shows with notes and watch timestamps
- **Collaborative lists** — shared movie lists with member invites; each list exports a live Radarr endpoint
- **Plex sync** — import your watch history automatically; manual and scheduled sync supported
- **Letterboxd** — connect your public profile to import diary entries and ratings
- **Movie Night Picker** — collaborative "what should we watch?" sessions with reference-title scoring
- **Watch history** — unified log across Plex, Letterboxd, and manual entries with a calendar view
- **Discord integration** — channel webhooks, slash commands, and DM notifications (optional)

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/01-dashboard.png" alt="Dashboard" width="49%">
  <img src="docs/screenshots/02-watchlist.png" alt="Watchlist" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/04-movie-title.png" alt="Movie title page" width="49%">
  <img src="docs/screenshots/08-list-detail.png" alt="Collaborative list" width="49%">
</p>

---

## Quick Start

```bash
curl -o .env https://raw.githubusercontent.com/jamiebclark/screened/main/.env.example
curl -o docker-compose.yml https://raw.githubusercontent.com/jamiebclark/screened/main/docker-compose.yml
# edit .env — set TMDB_API_KEY, AUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL
docker compose up -d
```

The app will be available at `http://localhost:3000`. The first user to register gets admin access.

**→ [Full deployment guide](docs/deployment.md)** — env var reference, manual setup, updating, cron endpoints

---

## Documentation

| Guide                                  | Audience                                               |
| -------------------------------------- | ------------------------------------------------------ |
| [Deployment](docs/deployment.md)       | Docker Compose, env vars, manual setup                 |
| [Plex](docs/plex.md)                   | Connecting your Plex account and syncing watch history |
| [Letterboxd](docs/letterboxd.md)       | Importing your diary and ratings                       |
| [Lists & Radarr](docs/lists.md)        | Collaborative lists and auto-downloading via Radarr    |
| [Movie Night Picker](docs/picker.md)   | How the Picker and scoring work                        |
| [Watch Parties](docs/watch-parties.md) | Scheduling and inviting friends to watch together      |
| [Discord](docs/discord-integration.md) | Webhooks, slash commands, and DM notifications         |
| [Contributing](CONTRIBUTING.md)        | Local dev setup, commit conventions, PR checklist      |

---

## Tech Stack

| Layer      | Technology                            |
| ---------- | ------------------------------------- |
| Framework  | Next.js (App Router) + TypeScript     |
| Styling    | Tailwind CSS v4 + Radix UI            |
| Database   | PostgreSQL + Prisma                   |
| Auth       | Auth.js v5 (credentials + Plex OAuth) |
| Metadata   | TMDB API                              |
| Deployment | Docker Compose                        |
