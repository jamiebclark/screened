# Contributing to Screened

Thank you for your interest in contributing! This document covers how to get a local development environment running, the commit and PR conventions, and what's expected before merging.

## Local setup

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
# Fill in DATABASE_URL, AUTH_SECRET, TMDB_API_KEY, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL
yarn db:migrate
yarn dev
```

The app will be at `http://localhost:3000`. The first user to register on a fresh database automatically gets admin access.

### Seeding demo data

To populate your database with sample users and watch history for development:

```bash
yarn db:seed-demo
```

This creates two users (`demo@screened.app` and `friend@screened.app`, password `screened123`), movies/TV shows fetched from TMDB, lists, and a friendship. The script is idempotent — it wipes and recreates the demo accounts each run.

## Running tests

```bash
yarn test          # Vitest unit tests
yarn test:e2e      # Playwright end-to-end tests (requires running dev server)
yarn ci:check      # Full CI suite (lint + format + migrate + test + build)
```

Run a single spec:

```bash
yarn test -- src/lib/foo.test.ts
yarn test:e2e -- e2e/foo.spec.ts
```

## Commit conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Semantic-release reads commit history to generate releases and changelogs, so the format is required.

```
<type>(<scope>): <short summary>
```

| Type       | When to use                                        |
| ---------- | -------------------------------------------------- |
| `feat`     | New user-facing feature (triggers a minor release) |
| `fix`      | Bug fix (triggers a patch release)                 |
| `refactor` | Code change with no behavior change                |
| `chore`    | Tooling, config, dependencies                      |
| `docs`     | Documentation only                                 |
| `test`     | Tests only                                         |
| `perf`     | Performance improvement                            |
| `ci`       | CI/CD pipeline changes                             |

**One logical concern per commit.** If your change spans schema + lib + UI, that's three commits. Infrastructure (migrations, generated code) lands before application code that depends on it.

Breaking changes: use `feat!:` or add a `BREAKING CHANGE:` footer.

## Pull request checklist

Before opening a PR:

- [ ] `yarn lint` passes on touched files
- [ ] `yarn test` passes
- [ ] New logic in `src/lib/` has Vitest coverage for non-trivial paths
- [ ] No raw exception messages in API responses
- [ ] No new `NEXT_PUBLIC_` env vars containing secrets
- [ ] `.env.example` and `README.md` updated if you added an env var or changed Docker/cron behavior
- [ ] UI changes tested manually with `yarn dev`

## Where to ask questions

Open a [GitHub Discussion](https://github.com/jamiebclark/screened/discussions) for questions, ideas, or anything that isn't a bug report or feature request. For bugs and feature requests, use the issue templates.
