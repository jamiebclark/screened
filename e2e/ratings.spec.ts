import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

const MOVIE_URL = "/movies/27205"; // Inception

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
  // Ensure status is WATCHED so rating stars appear
  await page.request.post("/api/media/status", {
    data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
    headers: { "Content-Type": "application/json" },
  });
});

test.describe("Ratings", () => {
  test("rating stars appear when status is watched", async ({ page }) => {
    await page.goto(MOVIE_URL);
    await expect(page.getByRole("button", { name: /rate \d star/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("click 4-star rating saves and persists", async ({ page }) => {
    // Clear any existing rating
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", rating: null },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(MOVIE_URL);
    const fourthStar = page.getByRole("button", { name: "Rate 4 stars" });
    await expect(fourthStar).toBeVisible({ timeout: 5000 });
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/media/status") &&
          r.request().method() === "POST" &&
          r.status() === 200
      ),
      fourthStar.click(),
    ]);

    // Reload and verify rating persists (stars 1–4 use filled styling)
    await page.reload();
    const fourAfter = page.getByRole("button", { name: "Rate 4 stars" });
    await expect(fourAfter.locator("svg").first()).toBeVisible({ timeout: 5000 });
    await expect(fourAfter.locator("svg").first()).toHaveClass(/fill-yellow-400/);
  });

  test("click same star twice unsets rating", async ({ page }) => {
    // Set rating to 3
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", rating: 3 },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(MOVIE_URL);
    const thirdStar = page.getByRole("button", { name: "Rate 3 stars" });
    await expect(thirdStar).toBeVisible({ timeout: 5000 });
    await thirdStar.click();

    // Rating should be unset — the 3rd star should no longer be filled
    await page.reload();
    await expect(page.locator("button[aria-label='Rate 3 stars'] svg.fill-yellow-400")).not.toBeVisible({ timeout: 5000 });
  });

  test("rating stars not visible when no watch status", async ({ page }) => {
    // Remove status entirely
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: null },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(MOVIE_URL);
    // Rating stars should be hidden (only shown when userStatus is set)
    await expect(page.getByRole("button", { name: /rate \d star/i })).not.toBeVisible();
  });

  test("can rate TV show", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 1396, type: "tv", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto("/tv/1396");
    await expect(page.getByRole("button", { name: /rate \d star/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Rate 5 stars" }).click();
    await expect(page.locator("button[aria-label='Rate 5 stars'] svg.fill-yellow-400")).toBeVisible({ timeout: 5000 });
  });
});
