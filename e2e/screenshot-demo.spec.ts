/**
 * Captures screenshots of key pages for README / docs.
 * Requires: demo seed already run (`yarn db:seed-demo`) and dev server running.
 *
 * Usage: yarn test:e2e -- e2e/screenshot-demo.spec.ts
 * Output: docs/screenshots/
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { login } from "./helpers";

const DEMO_USER = {
  email: "demo@screened.app",
  password: "screened123",
  name: "Alex Rivera",
};
const OUT = join(process.cwd(), "docs", "screenshots");

test.describe("demo screenshots", () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, DEMO_USER);
  });

  test("01-dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "01-dashboard.png") });
  });

  test("02-watchlist", async ({ page }) => {
    await page.goto("/watchlist");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "02-watchlist.png") });
  });

  test("03-watching", async ({ page }) => {
    await page.goto("/watching");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "03-watching.png") });
  });

  test("04-movie-title", async ({ page }) => {
    await page.goto("/movies/155");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "04-movie-title.png") });
  });

  test("05-tv-title", async ({ page }) => {
    await page.goto("/tv/1396");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "05-tv-title.png") });
  });

  test("06-watch-history", async ({ page }) => {
    await page.goto("/history");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "06-watch-history.png") });
  });

  test("07-lists", async ({ page }) => {
    await page.goto("/lists");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "07-lists.png") });
  });

  test("08-list-detail", async ({ page }) => {
    await page.goto("/lists/best-of-the-decade");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "08-list-detail.png") });
  });

  test("09-picker", async ({ page }) => {
    await page.goto("/pick");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "09-picker.png") });
  });
});
