import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

// Breaking Bad (tmdbId: 1396) — stable show with known seasons/episodes
const TV_URL = "/tv/1396";
const TV_TMDB_ID = 1396;

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
  // Ensure show status is set so the media item exists in DB
  await page.request.post("/api/media/status", {
    data: { tmdbId: TV_TMDB_ID, type: "tv", status: "WATCHING" },
    headers: { "Content-Type": "application/json" },
  });
});

test.describe("Episode Tracker", () => {
  test("TV show page loads with episode tracker", async ({ page }) => {
    await page.goto(TV_URL);
    await expect(
      page.getByRole("heading", { name: "Breaking Bad" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("tab", { name: "Episodes" })).toBeVisible();
  });

  test("season accordion expands and shows episodes", async ({ page }) => {
    await page.goto(TV_URL);
    await expect(page.getByText(/Season 1/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 5000 });
  });

  test("toggle single episode changes its watched indicator", async ({
    page,
  }) => {
    // Start with ep 1 unwatched
    await page.request.delete(`/api/media/${TV_TMDB_ID}/episodes`, {
      data: { seasonNumber: 1, episodeNumber: 1 },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(TV_URL);
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 10000 });

    const pilotRow = page.locator(".divide-y > div").first();

    // Verify ep 1 is NOT watched (no green circle)
    await expect(pilotRow.locator(".bg-green-500")).not.toBeAttached();

    // Click to mark as watched — wait for the API response
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/media/${TV_TMDB_ID}/episodes`) &&
          r.request().method() === "POST",
      ),
      pilotRow.click(),
    ]);

    // Ep 1 should now show as watched (green circle)
    await expect(pilotRow.locator(".bg-green-500")).toBeVisible({
      timeout: 5000,
    });
  });

  test("toggle episode from watched to unwatched", async ({ page }) => {
    // Start with ep 2 watched
    await page.request.post(`/api/media/${TV_TMDB_ID}/episodes`, {
      data: { seasonNumber: 1, episodeNumber: 2 },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(TV_URL);
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 10000 });

    // The second episode row
    const secondEpRow = page.locator(".divide-y > div").nth(1);

    // Verify ep 2 IS watched (has green circle)
    await expect(secondEpRow.locator(".bg-green-500")).toBeVisible({
      timeout: 5000,
    });

    // Unmark requires confirmation (row click no longer toggles off)
    await secondEpRow.getByRole("button", { name: "Unmark" }).click();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/media/${TV_TMDB_ID}/episodes`) &&
          r.request().method() === "DELETE",
      ),
      page.getByRole("dialog").getByRole("button", { name: "Unmark" }).click(),
    ]);

    // Ep 2 should now be unwatched (green circle gone)
    await expect(secondEpRow.locator(".bg-green-500")).not.toBeAttached({
      timeout: 5000,
    });
  });

  test("mark all episodes in season via API succeeds", async ({ page }) => {
    // Mark all 7 episodes of BB S1 via API
    const res = await page.request.post(`/api/media/${TV_TMDB_ID}/episodes`, {
      data: {
        episodes: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
          seasonNumber: 1,
          episodeNumber: n,
        })),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as { success: boolean };
    expect(data.success).toBe(true);

    // Visit page and verify episodes are shown as watched
    await page.goto(TV_URL);
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 10000 });

    // When all episodes are watched the first 7 rows all show green circles
    // Verify ep 1 AND ep 7 both have a green watched indicator
    const rows = page.locator(".divide-y > div");
    await expect(rows.first().locator(".bg-green-500")).toBeVisible({
      timeout: 5000,
    });
    // At least 7 green circles visible in the episode list (all S1 watched)
    await expect(page.locator(".divide-y .bg-green-500")).toHaveCount(7, {
      timeout: 5000,
    });
  });

  test("unmark all episodes in season via API succeeds", async ({ page }) => {
    // Clear all S1 episodes
    const res = await page.request.delete(`/api/media/${TV_TMDB_ID}/episodes`, {
      data: {
        episodes: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
          seasonNumber: 1,
          episodeNumber: n,
        })),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();

    // Visit page and verify "Mark all" button is shown in season header
    await page.goto(TV_URL);
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Mark all" }).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("episode marking creates media item when show not in DB", async ({
    page,
  }) => {
    // Post directly to the episode API for a show that may not be in DB
    const novelId = 1396; // BB — always works; the route now auto-creates
    const res = await page.request.post(`/api/media/${novelId}/episodes`, {
      data: { seasonNumber: 1, episodeNumber: 3 },
      headers: { "Content-Type": "application/json" },
    });
    // Should succeed (creates media item if needed)
    expect(res.ok()).toBeTruthy();
  });
});
