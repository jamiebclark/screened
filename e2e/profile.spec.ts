import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist, openUserMenuFromHeader } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Profile", () => {
  async function openNavProfile(page: import("@playwright/test").Page) {
    await page.goto("/");
    await openUserMenuFromHeader(page);
    await page.getByRole("menuitem", { name: /profile/i }).click();
    await page.waitForURL(/\/profile\//, { timeout: 8000 });
  }

  test("own profile accessible from nav", async ({ page }) => {
    await openNavProfile(page);
    // Verify we landed on a profile page with an h1 heading (any username)
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 8000 });
    // And the profile URL matches
    expect(page.url()).toMatch(/\/profile\//);
  });

  test("profile page shows stats", async ({ page }) => {
    // Set a watched movie so stats show
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });

    await openNavProfile(page);
    // Stats section has labels like "Watched", "Watchlist"
    await expect(page.locator(".text-xs.text-muted-foreground", { hasText: "Watched" }).first()).toBeVisible();
    await expect(page.locator(".text-xs.text-muted-foreground", { hasText: "Watchlist" }).first()).toBeVisible();
  });

  test("profile shows watched tab with media", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });

    await openNavProfile(page);
    await page.getByRole("tab", { name: /watched/i }).click();
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({ timeout: 5000 });
  });

  test("non-existent user profile shows 404", async ({ page }) => {
    await page.goto("/profile/nonexistentuseridxyz99999");
    await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 });
  });
});
