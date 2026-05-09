import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

// Stable TMDB IDs used for seeding
const SEED_MOVIES = [
  { tmdbId: 27205, type: "movie" }, // Inception (2010)
  { tmdbId: 550, type: "movie" }, // Fight Club (1999)
];

async function markWatched(
  page: Parameters<typeof ensureLoggedIn>[0],
  items: { tmdbId: number; type: string }[],
) {
  for (const item of items) {
    await page.request.post("/api/media/status", {
      data: { ...item, status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function clearStatus(
  page: Parameters<typeof ensureLoggedIn>[0],
  items: { tmdbId: number; type: string }[],
) {
  for (const item of items) {
    await page.request.post("/api/media/status", {
      data: { ...item, status: null },
      headers: { "Content-Type": "application/json" },
    });
  }
}

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.afterEach(async ({ page }) => {
  await clearStatus(page, SEED_MOVIES);
});

test.describe("Stats page", () => {
  test("redirects unauthenticated users to login", async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto("/stats");
    await expect(p).toHaveURL(/\/login/);
    await ctx.close();
  });

  test("shows stats sections when user has watch history", async ({ page }) => {
    await markWatched(page, SEED_MOVIES);
    await page.goto("/stats");

    // Summary stat cards are present
    await expect(page.getByText(/movies/i).first()).toBeVisible();
    await expect(page.getByText(/hours watched/i)).toBeVisible();

    // Genre section exists (Inception and Fight Club both have genres)
    await expect(
      page.getByRole("heading", { name: /top genres/i }),
    ).toBeVisible();

    // Decades section exists
    await expect(
      page.getByRole("heading", { name: /by decade/i }),
    ).toBeVisible();
  });

  test("shows empty state when user has no watch history", async ({
    browser,
  }) => {
    // Use a fresh browser context (new user with no history) — register inline
    const ctx = await browser.newContext();
    const p = await ctx.newPage();

    const unique = `stats-empty-${Date.now()}@test.local`;
    await p.request.post("/api/auth/register", {
      data: { name: "Stats Empty", email: unique, password: "testpassword123" },
      headers: { "Content-Type": "application/json" },
    });
    await p.goto("/login");
    await p.getByLabel("Email").fill(unique);
    await p.getByLabel("Password").fill("testpassword123");
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await p.waitForURL("/", { timeout: 10000 });

    await p.goto("/stats");
    await expect(p.getByText(/no watch history yet/i)).toBeVisible();
    await ctx.close();
  });

  test("WatchingTabs navigation: Stats tab is active on /stats", async ({
    page,
  }) => {
    await page.goto("/stats");
    const statsTab = page.getByRole("link", { name: "Stats" });
    await expect(statsTab).toBeVisible();
    await expect(statsTab).toHaveClass(/border-primary/);
  });

  test("WatchingTabs navigation: can reach /stats from /history", async ({
    page,
  }) => {
    await page.goto("/history");
    await page.getByRole("link", { name: "Stats" }).click();
    await expect(page).toHaveURL("/stats");
  });

  test("Directors and cast sections render with data", async ({ page }) => {
    await markWatched(page, SEED_MOVIES);
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: /directors/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /most watched cast/i }),
    ).toBeVisible();
  });
});
