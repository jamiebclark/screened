# Screened

A self-hosted web app for tracking movies and TV shows with friends, Plex sync, and Radarr integration.

## Features

- **Personal tracking** — watchlist, watching, watched, dropped status with star ratings and reviews
- **Episode tracking** — season and episode-level progress for TV shows; each episode can show last watched time, optional notes, and **Unmark** (soft unwatch keeps the prior time if you mark it again)
- **Collaborative lists** — create shared movie lists, invite members by email, everyone contributes
- **Plex sync** — link your Plex account; import your watch history (manual sync, plus optional scheduled sync when you use Docker)
- **Letterboxd** — connect your public Letterboxd profile to import diary and ratings; a secured cron API exists if you add your own scheduler
- **Movie Night Picker** — collaborative “what should we watch?” session with shareable rooms, reference titles, and optional discovery scoring
- **Watch history** — per-source log (Plex, Letterboxd, manual) with import management and list-driven CSV import on shared lists; global history and calendar merge movie/TV diary lines with TV episode watches (Plex or in-app). **Movies** keep a **Watch history** section on the title page; **TV** logs viewings per episode under **Episodes**
- **Radarr export** — every list exposes a live URL endpoint that Radarr can poll to auto-download movies
- **Taste / embeddings (optional)** — with `OPENAI_API_KEY` set, titles get text embeddings for picker scoring and “similar to your picks”-style features

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v22+
- [Yarn](https://yarnpkg.com) v1.22+
- A PostgreSQL database (local, Docker, or hosted)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### 1. Clone and install

```bash
git clone https://github.com/jamiebclark/screened.git
cd screened
yarn install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable              | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string                                                                                             |
| `AUTH_SECRET`         | Random 32+ character string — run `openssl rand -base64 32`                                                              |
| `TMDB_API_KEY`        | Read access token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)                            |
| `NEXTAUTH_URL`        | Base URL of your app (e.g. `http://localhost:3000`)                                                                      |
| `NEXT_PUBLIC_APP_URL` | Same as above — used client-side for OAuth redirects and absolute links                                                  |
| `CRON_SECRET`         | Shared secret for `/api/cron/*` (Plex and Letterboxd scheduled sync in Docker) — e.g. `openssl rand -hex 32`             |
| `SYNC_INTERVAL_HOURS` | Hours between automatic Plex/Letterboxd sync jobs when using Docker cron (default: `6`)                                  |
| `OPENAI_API_KEY`      | Optional; enables text embeddings for the Movie Night Picker and related scoring                                         |
| `ALLOW_PUBLIC_SIGNUP` | Optional; default `true`. Set to `false` for invite-only signup (see `.env.example`).                                    |
| `SITE_ADMIN_EMAILS`   | Optional; comma-separated emails that may create signup invites (Settings → Signup invites) when using invite-only mode. |

### 3. Start a local database

If you don't have PostgreSQL running locally, spin one up with Docker:

```bash
docker run -d \
  --name screened-db \
  -e POSTGRES_USER=movienight \
  -e POSTGRES_PASSWORD=movienight \
  -e POSTGRES_DB=movienightdb \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Run migrations and start

```bash
yarn db:migrate   # runs Prisma migrations
yarn dev          # starts Next.js on http://localhost:3000
```

---

## Docker Compose (Self-hosted)

The easiest way to run Screened on a home server or VPS.

### 1. Configure environment

```bash
cp .env.example .env
```

At minimum set `TMDB_API_KEY`, `AUTH_SECRET`, `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` to your server's public URL, and `CRON_SECRET` if you use the included cron services.

### 2. Start everything

```bash
docker compose up -d
```

This starts the app, a PostgreSQL database, and a small **plex-cron** sidecar that `POST`s to `/api/cron/plex-sync` on a schedule. Set `CRON_SECRET` in `.env` to match what the app expects (see `.env.example`). The same `CRON_SECRET` pattern applies to `POST /api/cron/letterboxd-sync` if you add a separate job or external cron.

The app will be available at `http://localhost:3000` (or your configured URL).

### 3. Updating

```bash
docker compose pull
docker compose up -d
```

---

## Plex Integration

Screened can sync your Plex watch history to automatically mark movies as watched.

### Setup

1. Go to **Settings → Plex Settings** in the app
2. Click **Connect Plex** — a Plex authorization window opens in your browser
3. Sign in to Plex and authorize Screened
4. Return to the settings page and click **Sync now**

### How it works

- Screened matches movies and TV using TMDB IDs embedded in Plex’s metadata (see sync results for counts)
- Only items with a recognized TMDB ID are synced — unmatched items are skipped
- You can run **Sync now** any time. With **Docker Compose**, the **plex-cron** service also calls the app’s cron endpoint on a schedule (`SYNC_INTERVAL_HOURS`, `CRON_SECRET`); other deployments can hit `/api/cron/plex-sync` the same way if you wire your own scheduler
- Your Plex token is stored in the database and is not sent to the browser

## Letterboxd integration

1. Open **Settings → Letterboxd**
2. Link your public Letterboxd username and run a sync to import your diary and ratings
3. For hands-off updates, `POST /api/cron/letterboxd-sync` (with `Authorization: Bearer $CRON_SECRET`) syncs all linked accounts; Compose does not include a second sidecar, but you can wire the same call from your own scheduler

## Movie Night Picker

Use **Pick** in the app to start or join a picker room: share the room with friends, set reference “attractor” (and repellor) titles, and run a session. Discovery-style scoring and library-based scoring work best when media has been enriched and (for embedding-based paths) `OPENAI_API_KEY` is set in the environment.

---

## Radarr Integration

Every list in Screened exposes a live Radarr-compatible endpoint that Radarr can poll to automatically download movies added to that list.

### Endpoint format

```
http://your-server:3000/api/lists/{list-slug}/radarr
```

For **private lists**, append a token to authenticate:

```
http://your-server:3000/api/lists/{list-slug}/radarr?token={radarrToken}
```

The `radarrToken` is shown on the list's page when you're logged in.

### Adding to Radarr

1. In Radarr, go to **Settings → Lists → Add List**
2. Choose **Custom Lists**
3. Paste the endpoint URL above
4. Set your quality profile and root folder
5. Save — Radarr will now poll the list and queue downloads automatically

---

## Collaborative Lists

Lists are the core social feature of Screened. Any member of a list can add, remove, and rate movies.

### Creating a list

1. Go to **Lists → New List**
2. Give it a name — a URL-friendly slug is generated automatically
3. Choose public or private visibility

### Inviting members

1. Open a list and click **Invite member**
2. Enter a member's email address — they must already have a Screened account
3. They'll immediately have access to contribute to the list (or request access, depending on list role and link visibility)

List owners can also review **access requests** for private lists; contributors may receive **notifications** when someone asks to join.

### Privacy

- **Public lists** are accessible via the Radarr endpoint without a token
- **Private lists** require a token for the Radarr endpoint, and are not discoverable by other users

---

## Tech Stack

| Layer      | Technology                            |
| ---------- | ------------------------------------- |
| Framework  | Next.js 16 (App Router) + TypeScript  |
| Styling    | Tailwind CSS v4 + Radix UI            |
| Database   | PostgreSQL + Prisma 7                 |
| Auth       | Auth.js v5 (credentials + Plex OAuth) |
| Metadata   | TMDB API                              |
| Deployment | Docker Compose                        |

---

## Development

### Available scripts

| Command            | Description                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `yarn dev`         | Start development server                                                                                       |
| `yarn build`       | Build for production                                                                                           |
| `yarn lint`        | Run ESLint                                                                                                     |
| `yarn db:migrate`  | Run Prisma migrations                                                                                          |
| `yarn db:push`     | Push schema without a migration (dev / throwaway only — use migrations for anything `migrate deploy` will run) |
| `yarn test:e2e`    | Playwright end-to-end tests                                                                                    |
| `yarn db:studio`   | Open Prisma Studio (database GUI)                                                                              |
| `yarn db:generate` | Regenerate Prisma client                                                                                       |

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
