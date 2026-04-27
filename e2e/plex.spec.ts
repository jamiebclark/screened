import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Plex Settings", () => {
  test("plex settings page loads", async ({ page }) => {
    await page.goto("/settings/plex");
    await expect(
      page.getByRole("heading", { name: "Plex Settings" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("sync returns error when plex not connected", async ({ page }) => {
    // Call sync API directly — user has no plex connection
    const res = await page.request.post("/api/plex/sync");
    // Should be 500 with 'Plex not connected' or similar error
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  test("plex connect button is visible on settings page", async ({ page }) => {
    await page.goto("/settings/plex");
    await expect(
      page.getByRole("button", { name: /connect plex|sync/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});
