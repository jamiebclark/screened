# Deploying Screened

## Docker Compose (recommended)

Pre-built images are published to Docker Hub on every release — no build step needed.

### 1. Configure environment

```bash
curl -o .env https://raw.githubusercontent.com/jamiebclark/screened/main/.env.example
# edit .env and fill in required values
```

| Variable                 | Required | Description                                                                                                             |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes      | PostgreSQL connection string                                                                                            |
| `AUTH_SECRET`            | Yes      | Random 32+ character string — `openssl rand -base64 32`                                                                 |
| `TMDB_API_KEY`           | Yes      | Read access token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)                           |
| `NEXTAUTH_URL`           | Yes      | Base URL of your app (e.g. `https://screened.example.com`)                                                              |
| `NEXT_PUBLIC_APP_URL`    | Yes      | Same as above — used client-side for OAuth redirects and absolute links                                                 |
| `SYNC_CRON_SCHEDULE`     | No       | Cron expression for automatic syncs (default: `0 */6 * * *` = every 6 hours). Example: `0 23 * * *` = every day at 11pm |
| `BACKUP_PATH`            | No       | Host path where daily database backups are written (default: `./backups` relative to docker-compose.yml)                |
| `ALLOW_PUBLIC_SIGNUP`    | No       | Default `true`. Set to `false` for invite-only mode.                                                                    |
| `SITE_ADMIN_EMAILS`      | No       | Comma-separated emails that can create signup invites when `ALLOW_PUBLIC_SIGNUP=false`.                                 |
| `CRON_SECRET`            | No       | Secret for calling the external `/api/cron/*` endpoints directly. Not needed for normal operation.                      |
| `OPENAI_API_KEY`         | No       | Enables text embeddings for Movie Night Picker discovery scoring.                                                       |
| `OMDB_API_KEY`           | No       | Caches Rotten Tomatoes / Metascore ratings on title pages.                                                              |
| `DISCORD_APPLICATION_ID` | No       | Discord Application ID — required for slash commands. See [discord-integration.md](discord-integration.md).             |
| `DISCORD_PUBLIC_KEY`     | No       | Discord Ed25519 public key — required for slash command signature verification.                                         |
| `DISCORD_BOT_TOKEN`      | No       | Required for slash commands and DM notifications.                                                                       |
| `DISCORD_CLIENT_ID`      | No       | Discord OAuth2 client ID — required for user account linking.                                                           |
| `DISCORD_CLIENT_SECRET`  | No       | Discord OAuth2 client secret — required for user account linking.                                                       |

### 2. Start everything

```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/jamiebclark/screened/main/docker-compose.yml
docker compose up -d
```

This starts three services:

- **app** — the Next.js application. Syncs all integrations automatically on the configured schedule (see `SYNC_CRON_SCHEDULE`).
- **db** — PostgreSQL 16 database.
- **db-backup** — runs `pg_dump` on startup and every 24 hours, writing compressed backups to `BACKUP_PATH`. Keeps the last 7 days.

The app will be available at `http://localhost:3000` (or your configured URL). The first user to register on a fresh database automatically gets admin access.

### 3. Updating

```bash
docker compose pull
docker compose up -d
```

> **Warning:** never run `docker compose down -v`. The `-v` flag deletes named volumes including your database. Use `docker compose down` (no flags) or `docker compose stop` to stop the stack safely.

---

## Backup and restore

### How backups work

The `db-backup` service runs `pg_dump` on startup and every 24 hours. Backups are written as gzip-compressed SQL files to `BACKUP_PATH` (default: `./backups/` relative to `docker-compose.yml`):

```
backups/
  screened-20260510-020000.sql.gz
  screened-20260509-020000.sql.gz
  ...
```

Files older than 7 days are deleted automatically.

On Unraid, the default `./backups` path lands inside your appdata directory, so your existing appdata backup covers it with no extra configuration.

To use a custom path, set `BACKUP_PATH` in your `.env`:

```
BACKUP_PATH=/mnt/user/appdata/screened/backups
```

### Restoring from a backup

Stop the app, restore the dump, then restart:

```bash
docker compose stop app
gunzip -c backups/screened-20260510-020000.sql.gz | docker exec -i screened-db-1 psql -U movienight -d movienightdb
docker compose start app
```

To restore to a completely fresh database (e.g. after recreating the volume):

```bash
docker compose up -d db
# wait for db to be healthy, then:
gunzip -c backups/screened-20260510-020000.sql.gz | docker exec -i screened-db-1 psql -U movienight -d movienightdb
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

Syncs run automatically inside the app process on the `SYNC_CRON_SCHEDULE`. The following endpoints also exist if you want to trigger a sync externally (e.g. from your own scheduler). All require `Authorization: Bearer $CRON_SECRET`.

| Endpoint                         | Description                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `POST /api/cron/plex-sync`       | Syncs watch history for all linked Plex accounts           |
| `POST /api/cron/letterboxd-sync` | Syncs diary and ratings for all linked Letterboxd accounts |
| `POST /api/cron/jellyfin-sync`   | Syncs watch history for all linked Jellyfin accounts       |
| `POST /api/cron/tautulli-sync`   | Syncs watch history for all linked Tautulli accounts       |
| `POST /api/cron/trakt-sync`      | Syncs watch history for all linked Trakt accounts          |
