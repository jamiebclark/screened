import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env the same way Next does, so globalSetup sees DATABASE_URL and the
// web server inherits the rest. In CI the values come from the job env instead
// and already-set variables win, so this is a no-op there.
loadEnvConfig(process.cwd());

/**
 * The suite runs against its own port so it never collides with a dev server
 * you already have up. NextAuth resolves its callback URL from AUTH_URL /
 * NEXTAUTH_URL, so those have to agree with the port the tests drive: when they
 * pointed at 3000 while the server ran elsewhere, sign-in redirected to the
 * wrong origin and every helper waiting for the post-login URL timed out.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3010);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  // Seeds the MediaItem rows the specs reference so adding a title does not
  // depend on a live TMDB key.
  globalSetup: "./e2e/global-setup",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Serve the production build by default, including locally. `next dev`
    // compiles routes on first request, which blows the short waitForURL
    // timeouts these specs use: the same auth spec goes 7/9 in 1.8 min against
    // `next dev` and 9/9 in 22s against `next start`. Run `yarn build` first,
    // or set E2E_DEV_SERVER=1 to accept the flake.
    command: process.env.E2E_DEV_SERVER
      ? `yarn next dev -p ${PORT}`
      : `yarn next start -p ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PORT: String(PORT),
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      AUTH_TRUST_HOST: "true",
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
