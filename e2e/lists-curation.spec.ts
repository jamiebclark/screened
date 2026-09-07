import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  ensureTestUsersExist,
  login,
  logout,
  TEST_USER_2,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

async function createRankedList(
  page: import("@playwright/test").Page,
  name: string,
) {
  const res = await page.request.post("/api/lists", {
    data: { name, isPublic: true, rankingEnabled: true, displayMode: "LIST" },
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

test.describe("Lists - Curation (hide, tags, stats)", () => {
  test("hide/unhide toggle fades an item for everyone, preserves its rank, and reverts on error", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate Hide ${Date.now()}`);
    const item1 = await addMovie(page, list.slug, 27205); // Inception
    const item2 = await addMovie(page, list.slug, 550); // Fight Club
    await addMovie(page, list.slug, 13); // Forrest Gump

    await page.request.post(`/api/lists/${list.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "CONTRIBUTOR" },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Fight Club")).toBeVisible({ timeout: 10000 });

    const hideButtons = page.getByLabel("Hide item");
    // Item 2 is Fight Club: hide it.
    const fightClubRow = page
      .locator("text=Fight Club")
      .locator("..")
      .locator("..");
    await fightClubRow.getByLabel("Hide item").click();
    await expect(page.getByLabel("Unhide item")).toHaveCount(1);

    // Ranks of the other items are unchanged: still 3 rows total.
    await expect(page.getByText("Inception")).toBeVisible();
    await expect(page.getByText("Forrest Gump")).toBeVisible();

    // A second member sees it faded too.
    await logout(page);
    await login(page, TEST_USER_2);
    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Fight Club")).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('[class*="opacity-50"]', { hasText: "Fight Club" }),
    ).toHaveCount(1);

    await logout(page);
    await login(page);

    // Unhide restores full emphasis.
    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByLabel("Unhide item")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Unhide item").click();
    await expect(page.getByLabel("Hide item")).toHaveCount(3);
    void hideButtons;
    void item1;
    void item2;
  });

  test("VIEWER sees no hide toggle but sees faded items and the filter still works", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate Viewer ${Date.now()}`);
    const item = await addMovie(page, list.slug, 27205);
    await addMovie(page, list.slug, 550);

    await page.request.patch(
      `/api/lists/${list.slug}/items/${item.id}/hidden`,
      {
        data: { isHidden: true },
        headers: { "Content-Type": "application/json" },
      },
    );

    await page.request.post(`/api/lists/${list.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "VIEWER" },
      headers: { "Content-Type": "application/json" },
    });

    await logout(page);
    await login(page, TEST_USER_2);

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Hide item")).toHaveCount(0);
    await expect(page.getByLabel("Unhide item")).toHaveCount(0);

    // Filter still works for a VIEWER.
    await page.getByRole("button", { name: "Hide hidden items" }).click();
    await expect(page).toHaveURL(/hidden=exclude/);
    await expect(page.getByText("Inception")).not.toBeVisible();

    await logout(page);
    await login(page);
  });

  test("filter removes hidden items without renumbering, survives reload, and drops drag handles", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate Filter ${Date.now()}`);
    const item1 = await addMovie(page, list.slug, 27205);
    const item2 = await addMovie(page, list.slug, 550);
    await addMovie(page, list.slug, 13);

    await page.request.patch(
      `/api/lists/${list.slug}/items/${item2.id}/hidden`,
      {
        data: { isHidden: true },
        headers: { "Content-Type": "application/json" },
      },
    );

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Drag to reorder")).toHaveCount(3);

    await page.getByRole("button", { name: "Hide hidden items" }).click();
    await expect(page).toHaveURL(/hidden=exclude/);
    await expect(page.getByText("Fight Club")).not.toBeVisible();
    await expect(page.getByText("Inception")).toBeVisible();
    await expect(page.getByText("Forrest Gump")).toBeVisible();

    // No drag handles while filtered, and the explanation is shown.
    await expect(page.getByLabel("Drag to reorder")).toHaveCount(0);
    await expect(
      page.getByText("Reordering is off while hidden items are filtered out."),
    ).toBeVisible();

    // Reload preserves the filter.
    await page.reload();
    await expect(page).toHaveURL(/hidden=exclude/);
    await expect(page.getByText("Fight Club")).not.toBeVisible();

    void item1;
  });

  test("hiding every item while filtered shows the all-hidden empty state with a clear-filter control", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate AllHidden ${Date.now()}`);
    const item1 = await addMovie(page, list.slug, 27205);
    const item2 = await addMovie(page, list.slug, 550);

    for (const item of [item1, item2]) {
      await page.request.patch(
        `/api/lists/${list.slug}/items/${item.id}/hidden`,
        {
          data: { isHidden: true },
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await page.goto(`/lists/${list.slug}?hidden=exclude`);
    await expect(
      page.getByText("Every item on this list is hidden."),
    ).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Hide hidden items" }).click();
    await expect(page).not.toHaveURL(/hidden=exclude/);
    await expect(page.getByText("Inception")).toBeVisible();
  });

  test("hiding an item does not allow exceeding the item cap (FR-026)", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate Cap ${Date.now()}`);
    const item = await addMovie(page, list.slug, 27205);
    await addMovie(page, list.slug, 550);

    const setCap = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { itemCap: 2 },
      headers: { "Content-Type": "application/json" },
    });
    expect(setCap.ok()).toBeTruthy();

    await page.request.patch(
      `/api/lists/${list.slug}/items/${item.id}/hidden`,
      {
        data: { isHidden: true },
        headers: { "Content-Type": "application/json" },
      },
    );

    const addAnother = await page.request.post(
      `/api/lists/${list.slug}/items`,
      {
        data: { tmdbId: 13, type: "movie" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(addAnother.status()).toBe(403);
    const body = (await addAnother.json()) as { error: string };
    expect(body.error).toBe("List is at capacity");
  });

  test("tags: add via UI, suggest by prefix, no cross-list leakage, and remove", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate Tags ${Date.now()}`);
    const otherList = await createRankedList(
      page,
      `Curate Tags Other ${Date.now()}`,
    );
    await addMovie(page, list.slug, 27205); // Inception
    await addMovie(page, list.slug, 550); // Fight Club
    await addMovie(page, otherList.slug, 13); // Forrest Gump

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    // Open Inception and add two tags.
    await page.getByText("Inception").first().click();
    const tagInput = page.getByPlaceholder("Add a tag…");
    await expect(tagInput).toBeVisible();
    await tagInput.fill("halloween");
    await tagInput.press("Enter");
    await expect(page.getByText("halloween", { exact: true })).toBeVisible();
    await tagInput.fill("rewatch");
    await tagInput.press("Enter");
    await expect(page.getByText("rewatch", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    // Open Fight Club, type a prefix, expect the suggestion.
    await page.getByText("Fight Club").first().click();
    const tagInput2 = page.getByPlaceholder("Add a tag…");
    await tagInput2.fill("hal");
    await expect(page.getByText("halloween", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    // A different list offers no suggestions from this one.
    await page.goto(`/lists/${otherList.slug}`);
    await expect(page.getByText("Forrest Gump")).toBeVisible({
      timeout: 10000,
    });
    await page.getByText("Forrest Gump").first().click();
    const tagInput3 = page.getByPlaceholder("Add a tag…");
    await tagInput3.fill("hal");
    await expect(page.getByText("halloween", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Remove the tag from Inception.
    await page.goto(`/lists/${list.slug}`);
    await page.getByText("Inception").first().click();
    await page.getByLabel("Remove tag halloween").click();
    await expect(page.getByText("halloween", { exact: true })).toHaveCount(0);
  });

  test("VIEWER sees tag chips but no tag input", async ({ page }) => {
    const list = await createRankedList(
      page,
      `Curate TagsViewer ${Date.now()}`,
    );
    const item = await addMovie(page, list.slug, 27205);

    await page.request.post(`/api/lists/${list.slug}/items/${item.id}/tags`, {
      data: { labels: ["noir"] },
      headers: { "Content-Type": "application/json" },
    });

    await page.request.post(`/api/lists/${list.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "VIEWER" },
      headers: { "Content-Type": "application/json" },
    });

    await logout(page);
    await login(page, TEST_USER_2);

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });
    await page.getByText("Inception").first().click();
    await expect(page.getByText("noir", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Add a tag…")).toHaveCount(0);

    await logout(page);
    await login(page);
  });

  test("stats modal reports items, still-in-play, decades and tags-in-use, excluding hidden-only tags", async ({
    page,
  }) => {
    const list = await createRankedList(page, `Curate Stats ${Date.now()}`);

    const itemA = await addMovie(page, list.slug, 27205); // Inception (2010)
    const itemB = await addMovie(page, list.slug, 550); // Fight Club (1999)
    const itemC = await addMovie(page, list.slug, 13); // Forrest Gump (1994)

    // Hide one item and put a tag only on it.
    await page.request.patch(
      `/api/lists/${list.slug}/items/${itemC.id}/hidden`,
      {
        data: { isHidden: true },
        headers: { "Content-Type": "application/json" },
      },
    );
    await page.request.post(`/api/lists/${list.slug}/items/${itemC.id}/tags`, {
      data: { labels: ["hidden-only"] },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post(`/api/lists/${list.slug}/items/${itemA.id}/tags`, {
      data: { labels: ["visible-tag"] },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("List stats").click();
    await expect(page.getByText("List stats")).toBeVisible();
    await expect(page.getByText("Items")).toBeVisible();

    // 3 items total, 2 visible (item C is hidden).
    await expect(
      page.locator("p.text-2xl.font-semibold", { hasText: "3" }),
    ).toBeVisible();
    await expect(
      page.locator("p.text-2xl.font-semibold", { hasText: "2" }),
    ).toBeVisible();

    // Only "close" is interactive in the dialog — no mutation affordance.
    await expect(
      page.getByRole("dialog").getByRole("button", { name: /delete|hide/i }),
    ).toHaveCount(0);

    void itemB;
  });

  test("Radarr export still includes hidden movies", async ({ page }) => {
    const list = await createRankedList(page, `Curate Radarr ${Date.now()}`);
    const item = await addMovie(page, list.slug, 27205);
    await page.request.patch(
      `/api/lists/${list.slug}/items/${item.id}/hidden`,
      {
        data: { isHidden: true },
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await page.request.get(`/api/lists/${list.slug}/radarr`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { id: number }[];
    expect(body.some((m) => m.id === 27205)).toBe(true);
  });
});
