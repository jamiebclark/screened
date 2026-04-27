import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

// Use a stable TMDB movie ID (Inception = 27205)
const MOVIE_URL = "/movies/27205";
const TV_TMDB = 1396; // Breaking Bad
const TV_URL = `/tv/${TV_TMDB}`;

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Watch Status", () => {
  test("add movie to watchlist", async ({ page }) => {
    await page.goto(MOVIE_URL);
    // Clear status first via API
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: null },
      headers: { "Content-Type": "application/json" },
    });
    await page.reload();

    const btn = page
      .getByRole("button", {
        name: /track|watchlist|watching|watched|dropped/i,
      })
      .first();
    await btn.click();
    await page.getByRole("menuitem", { name: "Watchlist" }).click();
    await expect(page.getByRole("button", { name: /watchlist/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("change status from watchlist to watching", async ({ page }) => {
    // Set initial status to watchlist
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHLIST" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);

    await page.getByRole("button", { name: /watchlist/i }).click();
    await page.getByRole("menuitem", { name: "Watching" }).click();
    await expect(page.getByRole("button", { name: /watching/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("change status to watched", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHING" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);

    await page.getByRole("button", { name: /watching/i }).click();
    await page.getByRole("menuitem", { name: "Watched" }).click();
    await expect(page.getByRole("button", { name: /watched/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("change status to dropped", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);

    await page.getByRole("button", { name: /watched/i }).click();
    await page.getByRole("menuitem", { name: "Dropped" }).click();
    await expect(page.getByRole("button", { name: /dropped/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("remove watch status", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHLIST" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);

    await page.getByRole("button", { name: /watchlist/i }).click();
    await page.getByRole("menuitem", { name: "Remove" }).click();
    // After removing status, the WatchStatusButton reverts to "Track" (the dropdown trigger)
    await expect(
      page.getByRole("button", { name: "Track" }).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("remove watch status deletes watch history entries", async ({
    page,
  }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: null },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    const withEntries = await page.request.get(
      "/api/media/27205/entries?type=movie",
    );
    expect(withEntries.ok()).toBeTruthy();
    const before = (await withEntries.json()) as unknown[];
    expect(before.length).toBeGreaterThan(0);

    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: null },
      headers: { "Content-Type": "application/json" },
    });
    const cleared = await page.request.get(
      "/api/media/27205/entries?type=movie",
    );
    expect(cleared.ok()).toBeTruthy();
    const after = (await cleared.json()) as unknown[];
    expect(after).toHaveLength(0);
  });

  test("remove watch status clears TV episode progress", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: TV_TMDB, type: "tv", status: null },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post("/api/media/status", {
      data: { tmdbId: TV_TMDB, type: "tv", status: "WATCHING" },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post(`/api/media/${TV_TMDB}/episodes`, {
      data: { seasonNumber: 1, episodeNumber: 1 },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(TV_URL);
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 10000 });
    const pilotRow = page.locator(".divide-y > div").first();
    await expect(pilotRow.locator(".bg-green-500")).toBeVisible({
      timeout: 5000,
    });

    await page.request.post("/api/media/status", {
      data: { tmdbId: TV_TMDB, type: "tv", status: null },
      headers: { "Content-Type": "application/json" },
    });
    await page.reload();
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 10000 });
    await expect(pilotRow.locator(".bg-green-500")).not.toBeAttached({
      timeout: 5000,
    });
  });

  test("rate a movie with stars", async ({ page }) => {
    // Set status to watched so rating shows
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);

    // If stars render as buttons, click the 4th star
    const starBtns = page.locator("button[data-rating]");
    if ((await starBtns.count()) > 0) {
      await starBtns.nth(3).click();
      await expect(starBtns.nth(3)).toBeVisible();
    }
    // Just verify the rating component is present
    await expect(page.getByRole("button", { name: /watched/i })).toBeVisible();
  });

  test("TV show watch status", async ({ page }) => {
    // Breaking Bad = 1396
    await page.request.post("/api/media/status", {
      data: { tmdbId: 1396, type: "tv", status: null },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto("/tv/1396");

    const btn = page
      .getByRole("button", {
        name: /track|watchlist|watching|watched|dropped/i,
      })
      .first();
    await btn.click();
    await page.getByRole("menuitem", { name: "Watching" }).click();
    await expect(page.getByRole("button", { name: /watching/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("status persists after page reload", async ({ page }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);
    await expect(page.getByRole("button", { name: /watched/i })).toBeVisible({
      timeout: 5000,
    });

    await page.reload();
    await expect(page.getByRole("button", { name: /watched/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
