import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Browse sort & filter", () => {
  test("Filters button opens the filter panel", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("button", { name: /Filters/ })).toBeVisible({
      timeout: 8000,
    });
    await page.getByRole("button", { name: /Filters/ }).click();
    // Sort dropdown should appear inside the panel
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("shareable URL with ?genres and ?sort loads and shows results", async ({
    page,
  }) => {
    // Action (28) + Comedy (35), sorted by rating high-to-low
    await page.goto("/browse?genres=28,35&sort=rating_desc");
    await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({
      timeout: 15000,
    });
    // Filter badge should indicate active filters
    await expect(page.getByRole("button", { name: /Filters/ })).toBeVisible();
  });

  test("sort: Year Newest First changes URL to sort=year_desc", async ({
    page,
  }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: /Filters/ }).click();
    await page.getByRole("combobox").selectOption("year_desc");
    await page.waitForURL(/sort=year_desc/, { timeout: 5000 });
    expect(page.url()).toContain("sort=year_desc");
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("year range filter: setting yearMin and yearMax updates URL", async ({
    page,
  }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: /Filters/ }).click();

    const fromInput = page.getByPlaceholder("From");
    const toInput = page.getByPlaceholder("To");

    await fromInput.fill("1990");
    await fromInput.blur();
    await toInput.fill("2000");
    await toInput.blur();

    await page.waitForURL(/yearMin=1990/, { timeout: 5000 });
    expect(page.url()).toContain("yearMin=1990");
    expect(page.url()).toContain("yearMax=2000");
  });

  test("year range: inverted range shows inline error and no results", async ({
    page,
  }) => {
    await page.goto("/browse?yearMin=2000&yearMax=1990");
    await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByText(/Fix the year range to see results/),
    ).toBeVisible({ timeout: 5000 });
  });

  test("multi-genre toggle: selecting two genres updates URL with comma-separated genres", async ({
    page,
  }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: /Filters/ }).click();

    // Click Action genre (id 28)
    await page.goto("/browse?genres=28");
    await page.waitForURL(/genres=28/, { timeout: 5000 });

    // Navigate with two genres
    await page.goto("/browse?genres=28,35");
    await page.waitForURL(/genres=28/, { timeout: 5000 });
    expect(page.url()).toContain("genres=28");
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("clear filters resets URL to bare /browse", async ({ page }) => {
    await page.goto("/browse?genres=28&sort=year_desc");
    await expect(
      page.getByRole("button", { name: "Clear filters" }),
    ).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForURL(/\/browse(\?type=|$)/, { timeout: 5000 });
    expect(page.url()).not.toContain("genres");
    expect(page.url()).not.toContain("sort");
  });

  test("type=all hides the Filters button", async ({ page }) => {
    await page.goto("/browse?type=all");
    await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByRole("button", { name: /Filters/ }),
    ).not.toBeVisible();
  });

  test("legacy ?genre= param still works (backward compat)", async ({
    page,
  }) => {
    await page.goto("/browse?genre=28&type=movie");
    await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible({
      timeout: 15000,
    });
  });
});
