import { test, expect } from "@playwright/test";
import { login, ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Search", () => {
  test("search for a movie by title", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search movies and TV shows...").fill("Inception");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/results for/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible();
  });

  test("search for a TV show by title", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search movies and TV shows...").fill("Breaking Bad");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/results for/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("a[href^='/tv/']").first()).toBeVisible();
  });

  test("filter search results to movies only", async ({ page }) => {
    await page.goto("/search?q=avatar");
    await page.getByRole("link", { name: "Movies" }).click();
    await expect(page).toHaveURL(/type=movie/);
    await expect(page.getByText(/results for/i)).toBeVisible({ timeout: 10000 });
    // All cards should link to /movies/
    const cards = page.locator("a.group[href^='/movies/']");
    await expect(cards.first()).toBeVisible();
    const tvCards = page.locator("a.group[href^='/tv/']");
    expect(await tvCards.count()).toBe(0);
  });

  test("filter search results to TV shows only", async ({ page }) => {
    await page.goto("/search?q=avatar");
    await page.getByRole("link", { name: "TV Shows" }).click();
    await expect(page).toHaveURL(/type=tv/);
    await expect(page.getByText(/results for/i)).toBeVisible({ timeout: 10000 });
    const movieCards = page.locator("a.group[href^='/movies/']");
    expect(await movieCards.count()).toBe(0);
  });

  test("empty search shows prompt, not results", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByText("Search for movies and TV shows above")).toBeVisible();
    await expect(page.getByText(/results for/i)).not.toBeVisible();
  });

  test("no results message for gibberish query", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search movies and TV shows...").fill("zzzzqqqxxxx99999nomatch");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/no results found/i)).toBeVisible({ timeout: 10000 });
  });

  test("navigate from home trending section to search", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See all" }).first().click();
    await expect(page).toHaveURL(/\/search/);
  });
});
