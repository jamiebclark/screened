import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

/** Clear statuses commonly used in e2e so "empty" library tests are order-independent. */
async function clearCommonStatuses(page: import("@playwright/test").Page) {
  for (const { tmdbId, type } of [
    { tmdbId: 27205, type: "movie" as const },
    { tmdbId: 1396, type: "tv" as const },
  ]) {
    await page.request.post("/api/media/status", {
      data: { tmdbId, type, status: null },
      headers: { "Content-Type": "application/json" },
    });
  }
}

test.describe("Library pages (empty state)", () => {
  test.beforeEach(async ({ page }) => {
    await clearCommonStatuses(page);
  });

  test("watchlist page", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Your watchlist is empty")).toBeVisible();
  });

  test("watching page", async ({ page }) => {
    await page.goto("/watching");
    await expect(page.getByRole("heading", { name: "Watching" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Nothing in progress")).toBeVisible();
  });

  test("dropped page", async ({ page }) => {
    await page.goto("/dropped");
    await expect(page.getByRole("heading", { name: "Dropped" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Nothing dropped")).toBeVisible();
  });
});

test.describe("Picker & settings (smoke)", () => {
  test("picker page loads", async ({ page }) => {
    await page.goto("/pick");
    await expect(page.getByRole("heading", { name: "Movie Night Picker" })).toBeVisible({ timeout: 10000 });
  });

  test("saved preferences page loads", async ({ page }) => {
    await page.goto("/settings/preferences");
    await expect(page.getByRole("heading", { name: "Saved Preferences" })).toBeVisible({ timeout: 8000 });
  });

  test("letterboxd settings page loads", async ({ page }) => {
    await page.goto("/settings/letterboxd");
    await expect(page.getByRole("heading", { level: 1, name: "Letterboxd" })).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Nav", () => {
  test("picker link in header", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Picker" }).click();
    await expect(page).toHaveURL(/\/pick$/);
  });

  test("saved preferences in user menu", async ({ page }) => {
    await page.goto("/");
    await page.locator("header button:visible").first().click();
    await page.getByRole("menuitem", { name: "Saved Preferences" }).click();
    await expect(page).toHaveURL(/\/settings\/preferences$/);
  });
});

test.describe("Library with content", () => {
  test("watchlist shows movie after API seed", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHLIST" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto("/watchlist");
    await expect(page.locator("a[href^='/movies/27205']").first()).toBeVisible({ timeout: 10000 });
  });
});
