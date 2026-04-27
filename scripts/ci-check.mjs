/**
 * Local parity with `.github/workflows/ci.yml`:
 * format check → lint → migrate deploy → ensure shadow DB exists → migrate diff → generate → test → build.
 *
 * Requires DATABASE_URL (e.g. from `.env`). If SHADOW_DATABASE_URL is unset,
 * uses same host/user as DATABASE_URL with database name `prisma_shadow_ci`.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import pg from "pg";

function loadDotEnv() {
  if (!existsSync(".env")) return;
  const text = readFileSync(".env", "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0 && r.status !== null) process.exit(r.status);
  if (r.error) throw r.error;
}

function adminConnectionString(databaseUrl) {
  return databaseUrl.replace(/\/([^/?]+)(\?|$)/, "/postgres$2");
}

function shadowDbNameFromUrl(shadowUrl) {
  const m = shadowUrl.match(/\/([^/?]+)(\?|$)/);
  if (!m)
    throw new Error("Could not parse database name from SHADOW_DATABASE_URL");
  return m[1];
}

run("yarn", ["format:check"]);
run("yarn", ["lint"]);

loadDotEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ci-check: set DATABASE_URL (e.g. in .env)");
  process.exit(1);
}

if (!process.env.SHADOW_DATABASE_URL) {
  process.env.SHADOW_DATABASE_URL = databaseUrl.replace(
    /\/([^/?]+)(\?|$)/,
    "/prisma_shadow_ci$2",
  );
}

const shadowDbName = shadowDbNameFromUrl(process.env.SHADOW_DATABASE_URL);
if (!/^[a-zA-Z0-9_]+$/.test(shadowDbName)) {
  console.error("ci-check: shadow database name must be [a-zA-Z0-9_]+");
  process.exit(1);
}

const adminUrl = adminConnectionString(databaseUrl);
const client = new pg.Client({ connectionString: adminUrl });
await client.connect();
try {
  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [shadowDbName],
  );
  if (rows.length === 0) {
    await client.query(`CREATE DATABASE ${shadowDbName}`);
    console.log(`ci-check: created shadow database "${shadowDbName}"`);
  }
} finally {
  await client.end();
}

run("yarn", ["prisma", "migrate", "deploy"]);
run("yarn", [
  "prisma",
  "migrate",
  "diff",
  "--from-migrations",
  "prisma/migrations",
  "--to-schema",
  "prisma/schema.prisma",
  "--exit-code",
]);
run("yarn", ["db:generate"]);
run("yarn", ["test"]);
run("yarn", ["build"], {
  AUTH_SECRET:
    process.env.AUTH_SECRET ?? "ci-build-placeholder-min-32-chars-long!!",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  TMDB_API_KEY: process.env.TMDB_API_KEY ?? "00000000000000000000000000000000",
});

console.log("ci-check: all steps passed.");
