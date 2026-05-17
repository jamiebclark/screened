import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Browse page", () => {
  test("loads with default movie results", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible({
      timeout: 10000,
    });
    // Type toggle should be visible
    await expect(page.getByRole("button", { name: "Movies" })).toBeVisible();
    await expect(page.getByRole("button", { name: "TV Shows" })).toBeVisible();
    // Results grid should have cards
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("genre badge on movie detail page links to browse with genre pre-selected", async ({
    page,
  }) => {
    // Inception (tmdbId 27205) has Action, Adventure, Science Fiction genres
    await page.goto("/movies/27205");
    await page.waitForLoadState("networkidle");

    // Find the first genre badge link and click it
    const genreLink = page.locator("a[href^='/browse?genre=']").first();
    await expect(genreLink).toBeVisible({ timeout: 8000 });

    const href = await genreLink.getAttribute("href");
    expect(href).toMatch(/\/browse\?genre=\d+&type=movie/);

    await genreLink.click();
    await page.waitForURL(/\/browse/, { timeout: 8000 });

    // Browse page should load with genre param in URL
    expect(page.url()).toMatch(/genre=\d+/);
    expect(page.url()).toContain("type=movie");

    // The active genre pill should be highlighted
    await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible();
    // Results grid should show
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("genre badge on TV detail page links to browse with tv type", async ({
    page,
  }) => {
    // Breaking Bad (tmdbId 1396)
    await page.goto("/tv/1396");
    await page.waitForLoadState("networkidle");

    const genreLink = page.locator("a[href^='/browse?genre=']").first();
    await expect(genreLink).toBeVisible({ timeout: 8000 });

    const href = await genreLink.getAttribute("href");
    expect(href).toContain("type=tv");

    await genreLink.click();
    await page.waitForURL(/\/browse/, { timeout: 8000 });
    expect(page.url()).toContain("type=tv");
  });

  test("type toggle switches between Movies and TV Shows", async ({ page }) => {
    await page.goto("/browse");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "TV Shows" }).click();
    await page.waitForURL(/type=tv/, { timeout: 5000 });
    expect(page.url()).toContain("type=tv");

    await page.getByRole("button", { name: "Movies" }).click();
    await page.waitForURL(/\/browse/, { timeout: 5000 });
    // type=movie is the default so it won't be in the URL
    expect(page.url()).not.toContain("type=tv");
  });

  test("seen/unseen filters are visible when logged in", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("button", { name: "Seen" })).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByRole("button", { name: "Not Seen" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "In My Library" }),
    ).toBeVisible();
  });
});
