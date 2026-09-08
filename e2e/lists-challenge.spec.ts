import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  ensureTestUsersExist,
  login,
  logout,
  TEST_USER_2,
} from "./helpers";

async function createList(
  page: import("@playwright/test").Page,
  name: string,
  displayMode: "GRID" | "LIST" = "LIST",
) {
  const res = await page.request.post("/api/lists", {
    data: { name, isPublic: true, displayMode },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { slug: string };
}

async function addMovie(
  page: import("@playwright/test").Page,
  slug: string,
  tmdbId: number,
) {
  const r = await page.request.post(`/api/lists/${slug}/items`, {
    data: { tmdbId, type: "movie" },
    headers: { "Content-Type": "application/json" },
  });
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as { id: string };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Navigate to a list and wait for it to be interactive.
 *
 * The page is a Server Component: its markup arrives before hydration, so a
 * click issued straight after `goto` can land on a control whose handler is not
 * attached yet, or be undone by the next RSC payload. Waiting on the heading
 * costs nothing and removes a whole class of flake.
 */
async function gotoList(
  page: import("@playwright/test").Page,
  slug: string,
  path = "",
) {
  await page.goto(`/lists/${slug}${path}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 15000,
  });
}

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Lists - Challenge tracking", () => {
  test("declared tags on an empty list are suggested and appear at count 0 (US1)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge Tags ${Date.now()}`);

    await gotoList(page, list.slug);
    await page.getByLabel("Manage list tags").click();
    await expect(page.getByText("List tags")).toBeVisible();
    await expect(page.getByText("No tags declared yet.")).toBeVisible();

    const input = page.getByPlaceholder("Declare a new tag…");
    await input.fill("folk horror");
    await page.getByLabel("Declare tag").click();
    await expect(page.getByText("folk horror", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("0", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await addMovie(page, list.slug, 27205); // Inception
    await gotoList(page, list.slug);
    await page.getByText("Inception").first().click();
    const tagInput = page.getByPlaceholder("Add a tag…");
    await tagInput.fill("folk");
    await expect(page.getByText("folk horror", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("List stats").click();
    await expect(page.getByText("Tags in use")).toBeVisible();
    await expect(page.getByText("folk horror", { exact: true })).toBeVisible();
  });

  test("VIEWER can read declared tags but has no create/rename/delete controls, and the API rejects them (US1)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge TagsViewer ${Date.now()}`);
    await page.request.post(`/api/lists/${list.slug}/tags`, {
      data: { label: "noir" },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post(`/api/lists/${list.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "VIEWER" },
      headers: { "Content-Type": "application/json" },
    });

    await logout(page);
    await login(page, TEST_USER_2);

    await gotoList(page, list.slug);
    await page.getByLabel("Manage list tags").click();
    await expect(page.getByText("noir", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Declare a new tag…")).toHaveCount(0);
    await expect(page.getByLabel(/Rename tag/)).toHaveCount(0);
    await expect(page.getByLabel(/Delete tag/)).toHaveCount(0);

    const res = await page.request.post(`/api/lists/${list.slug}/tags`, {
      data: { label: "another" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(403);

    await logout(page);
    await login(page);
  });

  test("challenge window can be set and rejects an invalid end date (US2)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge Window ${Date.now()}`);
    await gotoList(page, list.slug);
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByText("Challenge window").waitFor();

    await page.locator("#challenge-starts-at").fill("2026-09-01");
    await page.locator("#challenge-ends-at").fill("2026-10-31");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

    // Reject an end date before the start date; nothing is saved.
    await page.locator("#challenge-ends-at").fill("2026-08-01");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText("Challenge end date cannot be before the start date"),
    ).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();
    await expect(page.locator("#challenge-starts-at")).toHaveValue(
      "2026-09-01",
    );
    await expect(page.locator("#challenge-ends-at")).toHaveValue("2026-10-31");
  });

  test("a non-owner CONTRIBUTOR is rejected setting the challenge window (US2)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge WindowPerm ${Date.now()}`);
    await page.request.post(`/api/lists/${list.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "CONTRIBUTOR" },
      headers: { "Content-Type": "application/json" },
    });

    await logout(page);
    await login(page, TEST_USER_2);
    const res = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: "2026-09-01", challengeEndsAt: "2026-10-31" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(403);

    await logout(page);
    await login(page);
  });

  test("in-window watch is credited and reflected in history and stats; out-of-window watch is not (US2)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge Score ${Date.now()}`);
    const item = await addMovie(page, list.slug, 27205); // Inception
    await page.request.post(`/api/lists/${list.slug}/tags`, {
      data: { label: "mind-bender" },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post(`/api/lists/${list.slug}/items/${item.id}/tags`, {
      data: { labels: ["mind-bender"] },
      headers: { "Content-Type": "application/json" },
    });

    // Window set to a range entirely in the past: today's watch will fall outside it.
    await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: "2020-01-01", challengeEndsAt: "2020-01-31" },
      headers: { "Content-Type": "application/json" },
    });

    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });

    await gotoList(page, list.slug, "/history");
    await expect(
      page.getByText("Nothing watched in this window yet."),
    ).toBeVisible({ timeout: 10000 });

    await gotoList(page, list.slug);
    await page.getByLabel("List stats").click();
    await expect(page.getByText("During the challenge")).toBeVisible();
    await expect(page.getByText("0 / 1")).toBeVisible();
    await page.keyboard.press("Escape");

    // Widen the window to include today: the same watch now counts.
    await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: todayIso(), challengeEndsAt: null },
      headers: { "Content-Type": "application/json" },
    });

    await gotoList(page, list.slug, "/history");
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    await gotoList(page, list.slug);
    await page.getByLabel("List stats").click();
    await expect(page.getByText("1 / 1")).toBeVisible();
  });

  test("uncovered categories are listed last, explain themselves, and the modal scrolls inside the viewport (US2)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge Cover ${Date.now()}`);
    const item = await addMovie(page, list.slug, 27205); // Inception

    // Enough declared tags to push the modal past the viewport height.
    const labels = Array.from({ length: 18 }, (_, i) => `category ${i + 1}`);
    for (const label of labels) {
      await page.request.post(`/api/lists/${list.slug}/tags`, {
        data: { label },
        headers: { "Content-Type": "application/json" },
      });
    }
    // Assigned to a title, but nobody has logged a watch of it.
    await page.request.post(`/api/lists/${list.slug}/items/${item.id}/tags`, {
      data: { labels: ["category 1"] },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: todayIso(), challengeEndsAt: null },
      headers: { "Content-Type": "application/json" },
    });

    await gotoList(page, list.slug);
    await expect(page.getByText("Inception").first()).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("List stats").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("During the challenge")).toBeVisible();

    // The assigned-but-unwatched category still counts as uncovered, and the
    // modal now says why rather than leaving it looking like a bug.
    await expect(dialog.getByText("Still to cover")).toBeVisible();
    await expect(
      dialog.getByText(/Assigning a tag is not enough/),
    ).toBeVisible();

    // ...and it sits last, below the all-time tiles and the per-tag counts.
    const headings = await dialog.locator("h3").allInnerTexts();
    expect(headings.length).toBeGreaterThan(1);
    expect(headings[headings.length - 1]).toContain("Still to cover");

    // The dialog stays inside the viewport; the overflow scrolls within it.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.height).toBeLessThanOrEqual(viewport!.height);

    const body = dialog.getByTestId("list-stats-body");
    const overflow = await body.evaluate(
      (el) => el.scrollHeight - el.clientHeight,
    );
    expect(overflow).toBeGreaterThan(0);
  });

  test("clearing the window drops the in-window stats block and the history stays unrestricted (US2)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge Clear ${Date.now()}`);
    await addMovie(page, list.slug, 27205);
    await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: "2020-01-01", challengeEndsAt: "2020-01-31" },
      headers: { "Content-Type": "application/json" },
    });

    await gotoList(page, list.slug);
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByText("Clear window").click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");

    await page.getByLabel("List stats").click();
    await expect(page.getByText("During the challenge")).toHaveCount(0);

    await gotoList(page, list.slug, "/history");
    await expect(
      page.getByText(
        "No member has logged a watch of anything on this list yet.",
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  test("member-only History link is hidden from a logged-out visitor and redirects to login (US2)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge HistoryAuth ${Date.now()}`);
    await addMovie(page, list.slug, 27205);

    await logout(page);
    await gotoList(page, list.slug, "/history");
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });

  test("tagged cards show up to two chips plus a +N counter without adding a row to the grid (US3)", async ({
    page,
  }) => {
    const list = await createList(page, `Challenge Grid ${Date.now()}`, "GRID");
    const tagged = await addMovie(page, list.slug, 27205); // Inception
    await addMovie(page, list.slug, 550); // Fight Club
    await addMovie(page, list.slug, 13); // Forrest Gump

    await page.request.post(`/api/lists/${list.slug}/items/${tagged.id}/tags`, {
      data: { labels: ["a", "b", "c", "d", "e"] },
      headers: { "Content-Type": "application/json" },
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoList(page, list.slug);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("a", { exact: true })).toBeVisible();
    await expect(page.getByText("b", { exact: true })).toBeVisible();
    await expect(page.getByText("+3", { exact: true })).toBeVisible();
    await expect(page.getByText("c", { exact: true })).toHaveCount(0);

    // Untagged and tagged cards land in the same grid row (same top offset) —
    // the chip row does not push the grid to a new row/column count.
    const taggedBox = await page.getByText("Inception").first().boundingBox();
    const untaggedBox = await page
      .getByText("Fight Club")
      .first()
      .boundingBox();
    expect(taggedBox).not.toBeNull();
    expect(untaggedBox).not.toBeNull();
    expect(Math.abs((taggedBox!.y ?? 0) - (untaggedBox!.y ?? 0))).toBeLessThan(
      5,
    );

    // Clicking the poster still opens the item modal (chips are inert).
    await page.getByText("Inception").first().click();
    await expect(page.getByPlaceholder("Add a tag…")).toBeVisible();
  });

  test("sticky header appears on a long list with matching actions, respects VIEWER's lack of Add, and stays absent on a short list (US4)", async ({
    page,
  }) => {
    const longList = await createList(page, `Challenge Sticky ${Date.now()}`);
    const tmdbIds = [
      27205, 550, 13, 155, 157336, 24428, 118340, 293660, 76341, 335984, 603,
      604, 605, 12, 807, 122, 120, 121, 671, 672,
    ];
    for (const id of tmdbIds) {
      await addMovie(page, longList.slug, id);
    }

    await gotoList(page, longList.slug);
    await expect(page.getByText("Inception").first()).toBeVisible({
      timeout: 10000,
    });

    await page.mouse.wheel(0, 2000);
    const stickyBar = page.getByRole("region", { name: "Pinned list actions" });
    await expect(stickyBar).toBeVisible();
    await expect(
      stickyBar.getByLabel("Add item", { exact: true }),
    ).toBeVisible();
    await expect(stickyBar.getByLabel("Stats", { exact: true })).toBeVisible();

    await page.mouse.wheel(0, -3000);
    await expect(stickyBar).toHaveCount(0);

    // VIEWER: no add action in the sticky bar.
    await page.request.post(`/api/lists/${longList.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "VIEWER" },
      headers: { "Content-Type": "application/json" },
    });
    await logout(page);
    await login(page, TEST_USER_2);
    await gotoList(page, longList.slug);
    await expect(page.getByText("Inception").first()).toBeVisible({
      timeout: 10000,
    });
    await page.mouse.wheel(0, 2000);
    const viewerStickyBar = page.getByRole("region", {
      name: "Pinned list actions",
    });
    await expect(viewerStickyBar).toBeVisible();
    await expect(
      viewerStickyBar.getByLabel("Add item", { exact: true }),
    ).toHaveCount(0);
    await logout(page);
    await login(page);

    // A short list never shows the bar.
    const shortList = await createList(page, `Challenge Short ${Date.now()}`);
    await addMovie(page, shortList.slug, 27205);
    await gotoList(page, shortList.slug);
    await expect(page.getByText("Inception").first()).toBeVisible({
      timeout: 10000,
    });
    await page.mouse.wheel(0, 2000);
    await expect(
      page.getByRole("region", { name: "Pinned list actions" }),
    ).toHaveCount(0);
  });
});
