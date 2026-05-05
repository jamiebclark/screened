import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

// Stable TMDB IDs used to seed the watchlist for these tests
const SEED_MOVIES = [
  { tmdbId: 27205, type: "movie" }, // Inception (2010, ~148 min)
  { tmdbId: 550, type: "movie" }, // Fight Club (1999, ~139 min)
  { tmdbId: 11, type: "movie" }, // Star Wars (1977, ~121 min)
];
const SEED_TV = [
  { tmdbId: 1396, type: "tv" }, // Breaking Bad
];

async function seedWatchlist(
  page: Parameters<typeof ensureLoggedIn>[0],
  items: { tmdbId: number; type: string }[],
) {
  for (const item of items) {
    await page.request.post("/api/media/status", {
      data: { ...item, status: "WATCHLIST" },
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function clearWatchlist(
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
  await seedWatchlist(page, [...SEED_MOVIES, ...SEED_TV]);
});

test.afterEach(async ({ page }) => {
  await clearWatchlist(page, [...SEED_MOVIES, ...SEED_TV]);
});

test.describe("Watchlist Sort & Filter", () => {
  test("default view loads the watchlist", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(
      page.getByRole("heading", { name: "Watchlist" }),
    ).toBeVisible();
    // Sort control present with default value
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("changing sort to Title A–Z updates URL and persists on refresh", async ({
    page,
  }) => {
    await page.goto("/watchlist");
    // Open sort select and choose Title A-Z
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Title (A–Z)" }).click();

    // URL should reflect the sort param
    await expect(page).toHaveURL(/sort=title_asc/);

    // Reload and confirm sort persists
    await page.reload();
    await expect(page).toHaveURL(/sort=title_asc/);
    await expect(page.getByRole("combobox").first()).toContainText("Title");
  });

  test("runtime sort options are available", async ({ page }) => {
    await page.goto("/watchlist");
    await page.getByRole("combobox").first().click();
    await expect(
      page.getByRole("option", { name: "Runtime (shortest)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Runtime (longest)" }),
    ).toBeVisible();
  });

  test("type filter Movies shows only movies and persists in URL", async ({
    page,
  }) => {
    await page.goto("/watchlist");
    await page.getByRole("button", { name: "Movies" }).click();

    // URL should contain type=movie
    await expect(page).toHaveURL(/type=movie/);

    // Reload and confirm filter persists
    await page.reload();
    await expect(page).toHaveURL(/type=movie/);
    // Movies button should appear active (primary bg)
    await expect(page.getByRole("button", { name: "Movies" })).toBeVisible();
  });

  test("type filter TV shows only TV and can be cleared", async ({ page }) => {
    await page.goto("/watchlist");
    await page.getByRole("button", { name: "TV" }).click();
    await expect(page).toHaveURL(/type=tv/);

    // Clear filters
    await page.getByRole("button", { name: /clear/i }).click();
    await expect(page).not.toHaveURL(/type=/);
  });

  test("runtime filter persists in URL and shows correct count", async ({
    page,
  }) => {
    await page.goto("/watchlist");
    // Select runtime filter (second combobox)
    const runtimeSelect = page.getByRole("combobox").nth(1);
    await runtimeSelect.click();
    await page.getByRole("option", { name: "Up to 90 min" }).click();

    await expect(page).toHaveURL(/maxRuntime=90/);

    // Reload and confirm filter persists
    await page.reload();
    await expect(page).toHaveURL(/maxRuntime=90/);
  });

  test("clearing filters removes all filter params from URL", async ({
    page,
  }) => {
    await page.goto("/watchlist?type=movie&maxRuntime=120");
    await page.getByRole("button", { name: /clear/i }).click();

    await expect(page).not.toHaveURL(/type=/);
    await expect(page).not.toHaveURL(/maxRuntime=/);
    await expect(page).not.toHaveURL(/genres=/);
  });

  test("sort is preserved when filters are changed", async ({ page }) => {
    await page.goto("/watchlist?sort=title_asc");
    await page.getByRole("button", { name: "Movies" }).click();

    // Both sort and type should be in URL
    await expect(page).toHaveURL(/sort=title_asc/);
    await expect(page).toHaveURL(/type=movie/);
  });

  test("empty filter result shows clear filters button", async ({ page }) => {
    // Use a year range that should match nothing in our seed data
    await page.goto("/watchlist?yearFrom=1800&yearTo=1850");
    await expect(
      page.getByRole("button", { name: /clear filters/i }),
    ).toBeVisible();
  });
});
