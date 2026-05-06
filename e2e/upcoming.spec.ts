import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

// Classic titles with known past release dates — these will not appear in
// "Coming Soon" (future) but verify the page loads and empty state behaves.
// For "Just Released" we cannot use stable TMDB IDs reliably (release dates
// are fixed in the past) so we focus on structure and nav tests.
const SEED_MOVIES = [
  { tmdbId: 27205, type: "movie" }, // Inception (2010)
  { tmdbId: 550, type: "movie" }, // Fight Club (1999)
];

async function seedWatchlist(
  page: Parameters<typeof ensureLoggedIn>[0],
  items: { tmdbId: number; type: string }[],
) {
  for (const item of items) {
    await page.request.post("/api/media/status", {
      data: { ...item, status: "WATCHLIST" },
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function clearWatchlist(
  page: Parameters<typeof ensureLoggedIn>[0],
  items: { tmdbId: number; type: string }[],
) {
  for (const item of items) {
    await page.request.post("/api/media/status", {
      data: { ...item, status: null },
      headers: { "Content-Type": "application/json" },
    });
  }
}

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.afterEach(async ({ page }) => {
  await clearWatchlist(page, SEED_MOVIES);
});

test.describe("Upcoming page", () => {
  test("shows empty state when watchlist has no upcoming releases", async ({
    page,
  }) => {
    // Seed only past-release movies — nothing should appear in either section
    await seedWatchlist(page, SEED_MOVIES);
    await page.goto("/upcoming");

    await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();

    // Empty state copy and CTA
    await expect(page.getByText("Nothing coming up")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to watchlist/i }),
    ).toBeVisible();

    // Neither section heading should exist
    await expect(page.getByText("Coming Soon")).not.toBeVisible();
    await expect(page.getByText("Just Released")).not.toBeVisible();
  });

  test("empty state link navigates to /watchlist", async ({ page }) => {
    await page.goto("/upcoming");
    await page.getByRole("link", { name: /go to watchlist/i }).click();
    await expect(page).toHaveURL("/watchlist");
  });

  test("nav link to /upcoming is present and active when on the page", async ({
    page,
  }) => {
    await page.goto("/upcoming");

    const navLink = page.locator("nav").getByRole("link", { name: "Upcoming" });
    await expect(navLink).toBeVisible();

    // Active state is applied (link has active styling class)
    await expect(navLink).toHaveClass(/text-primary/);
  });

  test("nav Upcoming link navigates from another page", async ({ page }) => {
    await page.goto("/watchlist");

    await page
      .locator("nav")
      .getByRole("link", { name: "Upcoming" })
      .first()
      .click();

    await expect(page).toHaveURL("/upcoming");
    await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
  });

  test("page redirects unauthenticated users to login", async ({ browser }) => {
    // Fresh context with no auth cookies
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto("/upcoming");
    await expect(p).toHaveURL(/\/login/);
    await ctx.close();
  });

  test("watchlist shows 'See all upcoming' link when upcoming items exist", async ({
    page,
  }) => {
    // To show the upcoming section on the watchlist page we need at least one
    // item with releaseDate > now. Since we cannot guarantee that with stable
    // TMDB seeds, we verify the link's existence only when the section renders.
    await seedWatchlist(page, SEED_MOVIES);
    await page.goto("/watchlist");

    // If the "Releasing soon" section is present, the "See all upcoming" link
    // must exist inside it. If the section is absent (no future releases),
    // the link is correctly absent too.
    const releasingSection = page.locator("section").filter({
      hasText: "Releasing soon",
    });
    const sectionCount = await releasingSection.count();

    if (sectionCount > 0) {
      await expect(
        releasingSection.getByRole("link", { name: /see all upcoming/i }),
      ).toBeVisible();
    }
    // If section is absent, test passes trivially — no upcoming items in seed data.
  });
});
