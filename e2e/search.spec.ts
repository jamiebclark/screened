import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  ensureTestUsersExist,
  LIVE_TMDB,
  LIVE_TMDB_REASON,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Search", () => {
  test("search for a movie by title", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    await page.goto("/search");
    await page
      .getByPlaceholder("Search movies and TV shows...")
      .fill("Inception");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/results for/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("a[href^='/movies/']").first()).toBeVisible();
  });

  test("search for a TV show by title", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    await page.goto("/search");
    await page
      .getByPlaceholder("Search movies and TV shows...")
      .fill("Breaking Bad");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/results for/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("a[href^='/tv/']").first()).toBeVisible();
  });

  test("filter search results to movies only", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    await page.goto("/search?q=avatar");
    await page.getByRole("link", { name: "Movies" }).click();
    await expect(page).toHaveURL(/type=movie/);
    await expect(page.getByText(/results for/i)).toBeVisible({
      timeout: 10000,
    });
    // All cards should link to /movies/
    const cards = page.locator("a.group[href^='/movies/']");
    await expect(cards.first()).toBeVisible();
    const tvCards = page.locator("a.group[href^='/tv/']");
    expect(await tvCards.count()).toBe(0);
  });

  test("filter search results to TV shows only", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    await page.goto("/search?q=avatar");
    await page.getByRole("link", { name: "TV Shows" }).click();
    await expect(page).toHaveURL(/type=tv/);
    await expect(page.getByText(/results for/i)).toBeVisible({
      timeout: 10000,
    });
    const movieCards = page.locator("a.group[href^='/movies/']");
    expect(await movieCards.count()).toBe(0);
  });

  test("empty search shows prompt, not results", async ({ page }) => {
    await page.goto("/search");
    await expect(
      page.getByText("Search for movies and TV shows above"),
    ).toBeVisible();
    await expect(page.getByText(/results for/i)).not.toBeVisible();
  });

  test("no results message for gibberish query", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    await page.goto("/search");
    await page
      .getByPlaceholder("Search movies and TV shows...")
      .fill("zzzzqqqxxxx99999nomatch");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/no results found/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("navigate from home trending section to search", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    await page.goto("/");
    // Prefer the Trending movies "See all" — the first "See all" on the page may be Recently watched → /history.
    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Trending movies" }) })
      .getByRole("link", { name: "See all" })
      .click();
    await expect(page).toHaveURL(/\/search/);
  });
});

test.describe("GET /api/search", () => {
  test("finds the 1985 film House when restricted by type and year", async ({
    page,
  }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    const res = await page.request.get(
      "/api/search?q=House&type=movie&year=1985",
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      results: { tmdbId: number; title: string; year: number | null }[];
    };
    expect(
      body.results.some((r) => r.tmdbId === 25165 && r.year === 1985),
    ).toBeTruthy();
  });

  test("finds the 1989 film Arena when restricted by type and year", async ({
    page,
  }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    const res = await page.request.get(
      "/api/search?q=Arena&type=movie&year=1989",
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      results: { title: string; year: number | null }[];
    };
    expect(body.results.some((r) => r.year === 1989)).toBeTruthy();
  });

  test("rejects a non-numeric year with 400", async ({ page }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    const res = await page.request.get("/api/search?q=House&year=abc");
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/year/i);
  });
});

test.describe("List add-title dialog search refinement", () => {
  test("restrict to movies, set year, and add the 1985 House to a list", async ({
    page,
  }) => {
    test.skip(!LIVE_TMDB, LIVE_TMDB_REASON);
    const res = await page.request.post("/api/lists", {
      data: { name: `Search test ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await page.getByRole("button", { name: "Add item to list" }).click();
    await expect(page.getByText("Search to add")).toBeVisible();

    await page.getByRole("button", { name: "Films" }).click();
    await page.getByPlaceholder("Year").fill("1985");
    await page.getByPlaceholder("Search movies and TV shows…").fill("House");

    const row = page.getByRole("button", { name: /House/ }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();

    await expect(page.getByText("Add to list")).toBeVisible();
    await page.getByRole("button", { name: "Add to list" }).click();
    await expect(page.getByText("Search to add")).not.toBeVisible({
      timeout: 10000,
    });
  });
});
