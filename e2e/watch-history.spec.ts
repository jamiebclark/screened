import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

const MOVIE_TMDB = 27205;
const TV_TMDB = 1396;
const MOVIE_URL = `/movies/${MOVIE_TMDB}`;

async function clearMovieWatchData(page: import("@playwright/test").Page) {
  const res = await page.request.get(
    `/api/media/${MOVIE_TMDB}/entries?type=movie`,
  );
  if (res.ok()) {
    const entries = (await res.json()) as { id: string }[];
    for (const e of entries) {
      await page.request.delete(`/api/media/entries/${e.id}`);
    }
  }
  await page.request.post("/api/media/status", {
    data: { tmdbId: MOVIE_TMDB, type: "movie", status: null },
    headers: { "Content-Type": "application/json" },
  });
}

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
  await clearMovieWatchData(page);
});

test.describe("Watch history", () => {
  test("log a viewing, then delete (movie)", async ({ page }) => {
    // WATCHLIST gives a status (and Log a viewing) without auto-creating a watch entry;
    // WATCHED auto-adds a watch entry in POST /api/media/status, so the page would not start empty.
    await page.request.post("/api/media/status", {
      data: { tmdbId: MOVIE_TMDB, type: "movie", status: "WATCHLIST" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(MOVIE_URL);

    await expect(
      page.getByRole("heading", { name: /watch history/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/no viewings logged yet/i)).toBeVisible();

    await page.getByRole("button", { name: "Log a viewing" }).click();
    await expect(
      page.getByRole("dialog", { name: "Log a viewing" }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/\(\s*1\s+viewing\s*\)/)).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Delete viewing").click();
    await expect(page.getByText(/no viewings logged yet/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("watch history section when logged in with no status (movie)", async ({
    page,
  }) => {
    await page.goto(MOVIE_URL);
    await expect(
      page.getByRole("heading", { name: /watch history/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/set a watch status first to start logging viewings/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Log a viewing" }),
    ).not.toBeVisible();
  });

  test("TV show logs viewings per episode under Episodes", async ({
    page,
  }) => {
    await page.request.post("/api/media/status", {
      data: { tmdbId: TV_TMDB, type: "tv", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    await page.goto(`/tv/${TV_TMDB}`);
    await expect(page.getByRole("tab", { name: "Episodes" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Pilot")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: /^Log$/ }).first(),
    ).toBeVisible();
  });
});
