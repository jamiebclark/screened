<p align="center">
  <img src="docs/logo.svg" alt="Screened" width="600">
</p>

<p align="center">
  <a href="https://github.com/jamiebclark/screened/actions/workflows/ci.yml"><img src="https://github.com/jamiebclark/screened/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/jamiebclark/screened/releases"><img src="https://img.shields.io/github/v/release/jamiebclark/screened" alt="Release"></a>
  <a href="https://hub.docker.com/r/jamiebclark/screened"><img src="https://img.shields.io/docker/pulls/jamiebclark/screened?logo=docker&logoColor=white" alt="Docker Pulls"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

<p align="center">A self-hosted home for your shared watchlist. Track, pick, and plan what to watch with friends — with Plex, Letterboxd, and Radarr integration for home media server users.</p>

---

- [Why Screened?](#why-screened)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Getting Help](#getting-help)
- [Contributing](#contributing)
- [Tech Stack](#tech-stack)
- [Development](#development)

---

## Why Screened?

Most tracking apps are built for solo use. Letterboxd is great for logging what you've watched, but there's no way to build a list with friends. Tools like Watcharr add collaborative lists, but the list lives in a silo — it can't drive your download client or help you actually decide what to watch next.

Screened was built to close that gap: a shared watchlist that feeds your Picker, your Watch Parties, and — for home server users — your Radarr queue automatically.

---

## Features

- **Collaborative lists** — shared watchlists with member invites; each list exports a live Radarr endpoint for home media server users
- **Movie Night Picker** — collaborative "what should we watch?" sessions with reference-title scoring
- **Watch Parties** — schedule viewings and invite friends; everyone gets notified and can RSVP
- **Personal tracking** — watchlist, watching, watched, dropped status with star ratings and reviews
- **Episode tracking** — per-episode progress for TV shows with notes and watch timestamps
- **Plex sync** — import your watch history automatically; manual and scheduled sync supported
- **Letterboxd** — connect your public profile to import diary entries and ratings
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

The app will be available at `http://localhost:3000` (or whatever `PORT` you set in `.env`). The first user to register gets admin access.

**→ [Full deployment guide](docs/deployment.md)** — env var reference, sync scheduling, backup & restore, manual setup

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

---

## Getting Help

- **[GitHub Discussions](https://github.com/jamiebclark/screened/discussions)** — questions, ideas, and general conversation
- **[GitHub Issues](https://github.com/jamiebclark/screened/issues)** — bug reports and feature requests only

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local dev setup, commit conventions, and the PR checklist.

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

---

## Development

### Available scripts

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `yarn dev`         | Start development server          |
| `yarn build`       | Build for production              |
| `yarn lint`        | Run ESLint                        |
| `yarn db:migrate`  | Run Prisma migrations             |
| `yarn test:e2e`    | Playwright end-to-end tests       |
| `yarn db:studio`   | Open Prisma Studio (database GUI) |
| `yarn db:generate` | Regenerate Prisma client          |

### Project structure

```
src/
├── app/
│   ├── (auth)/          # Login and register
│   ├── (app)/           # App shell: home, search, pick, watchlists, lists, movies, TV, settings, history, …
│   └── api/             # Route handlers (media, lists, plex, letterboxd, picker, cron, auth, …)
├── components/          # Feature UI and components/ui (Radix + Tailwind)
├── generated/           # Prisma client output (from prisma/schema.prisma)
└── lib/                 # auth, prisma, tmdb, plex, letterboxd, embeddings, picker state, etc.
```

Prisma schema and migrations live under `prisma/`; the generated client is written to `src/generated/prisma` (not committed).

### Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Releases and changelogs are automated via [semantic-release](https://semantic-release.gitbook.io/).

```
feat(lists): add CSV import for watchlists
fix(plex): handle expired tokens gracefully
docs: update Radarr setup instructions
```
