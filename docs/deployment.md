# Deploying Screened

## Docker Compose (recommended)

Pre-built images are published to Docker Hub on every release — no build step needed.

### 1. Configure environment

```bash
curl -o .env https://raw.githubusercontent.com/jamiebclark/screened/main/.env.example
# edit .env and fill in required values
```

| Variable                 | Description                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string                                                                                          |
| `AUTH_SECRET`            | Random 32+ character string — `openssl rand -base64 32`                                                               |
| `TMDB_API_KEY`           | Read access token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)                         |
| `NEXTAUTH_URL`           | Base URL of your app (e.g. `https://screened.example.com`)                                                            |
| `NEXT_PUBLIC_APP_URL`    | Same as above — used client-side for OAuth redirects and absolute links                                               |
| `CRON_SECRET`            | Shared secret for `/api/cron/*` — `openssl rand -hex 32`                                                              |
| `SYNC_INTERVAL_HOURS`    | Hours between automatic sync jobs (default: `6`)                                                                      |
| `ALLOW_PUBLIC_SIGNUP`    | Default `true`. Set to `false` for invite-only mode.                                                                  |
| `SITE_ADMIN_EMAILS`      | Comma-separated emails that can create signup invites when `ALLOW_PUBLIC_SIGNUP=false`.                               |
| `OPENAI_API_KEY`         | Optional. Enables text embeddings for Movie Night Picker discovery scoring.                                           |
| `OMDB_API_KEY`           | Optional. Caches Rotten Tomatoes / Metascore ratings on title pages.                                                  |
| `DISCORD_APPLICATION_ID` | Optional. Discord Application ID — required for slash commands. See [discord-integration.md](discord-integration.md). |
| `DISCORD_PUBLIC_KEY`     | Optional. Discord Ed25519 public key — required for slash command signature verification.                             |
| `DISCORD_BOT_TOKEN`      | Optional. Required for slash commands and DM notifications.                                                           |
| `DISCORD_CLIENT_ID`      | Optional. Discord OAuth2 client ID — required for user account linking.                                               |
| `DISCORD_CLIENT_SECRET`  | Optional. Discord OAuth2 client secret — required for user account linking.                                           |

### 2. Start everything

```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/jamiebclark/screened/main/docker-compose.yml
docker compose up -d
```

This starts the app, a PostgreSQL database, and cron sidecars that call `/api/cron/plex-sync` and `/api/cron/letterboxd-sync` on a schedule. The app will be available at `http://localhost:3000` (or your configured URL). The first user to register on a fresh database automatically gets admin access.

### 3. Updating

```bash
docker compose pull
docker compose up -d
```

---

## Manual setup (development / bare Node)

### Prerequisites

- Node.js v22+
- Yarn v1.22+
- PostgreSQL (local or Docker)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Steps

```bash
git clone https://github.com/jamiebclark/screened.git
cd screened
yarn install
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET, TMDB_API_KEY, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL
yarn db:migrate
yarn dev
```

The app will be at `http://localhost:3000`.

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

---

## Cron endpoints

The Docker Compose sidecars call these endpoints on a schedule. You can also call them from your own scheduler:

| Endpoint                         | Description                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `POST /api/cron/plex-sync`       | Syncs watch history for all linked Plex accounts           |
| `POST /api/cron/letterboxd-sync` | Syncs diary and ratings for all linked Letterboxd accounts |

All cron endpoints require `Authorization: Bearer $CRON_SECRET`.
