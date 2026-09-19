import { test, expect, type Page } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist, TEST_USER_2 } from "./helpers";

const LIST_NAME = `E2E List ${Date.now()}`;
const LIST_SLUG_PATTERN = /\/lists\/[a-z0-9-]+/;

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

/** The invite form lives on the Members tab of the list settings modal. */
async function openInviteDialog(page: Page) {
  await page.getByRole("button", { name: "List settings" }).click();
  await page.getByRole("tab", { name: "Members" }).click();
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Invite to list" }),
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Lists", () => {
  test("create a new public list", async ({ page }) => {
    await page.goto("/lists/new");
    await page.getByLabel("List name").fill(LIST_NAME);
    await page.getByRole("button", { name: "Create list" }).click();
    await page.waitForURL(LIST_SLUG_PATTERN, { timeout: 10000 });
    await expect(page.getByText(LIST_NAME)).toBeVisible();
  });

  test("view own lists page", async ({ page }) => {
    await page.goto("/lists");
    await expect(
      page.getByRole("heading", { name: "Lists", exact: true }),
    ).toBeVisible();
    // Create list link should be present
    await expect(
      page.getByRole("link", { name: /new list|create/i }),
    ).toBeVisible();
  });

  test("create list and add a movie from movie detail page", async ({
    page,
  }) => {
    // First create a list
    const listName = `Movie List ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name: listName, visibility: "MEMBERS" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    void (await res.json());

    // Go to Inception movie page and add to list
    await page.goto("/movies/27205");
    await page.getByRole("button", { name: /add to list/i }).click();

    // Dialog opens with list options
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    // Wait for lists to load
    await page.waitForTimeout(1000);
    const listButton = page.getByRole("button", { name: listName });
    await expect(listButton).toBeVisible({ timeout: 5000 });
    await listButton.click();
    // After adding, the button turns green with a check icon (no text success message)
    await expect(page.locator(".text-green-400").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("remove movie from list", async ({ page }) => {
    // Create list and add movie via API
    const listName = `Remove Test ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name: listName, visibility: "MEMBERS" },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(`/lists/${list.slug}`);
    const card = page.getByText("Inception").first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Removal lives in the item modal, opened by tapping the card
    await card.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /remove from list/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Inception")).toHaveCount(0, {
      timeout: 5000,
    });
  });

  test("invite a member to a list by searching name", async ({ page }) => {
    // Create a list
    const listName = `Invite Test ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name: listName, visibility: "MEMBERS" },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await openInviteDialog(page);

    // Search for the second test user
    await page.getByPlaceholder(/search users/i).fill("E2E Friend");
    // Wait for autocomplete results
    await expect(page.getByText("E2E Friend")).toBeVisible({ timeout: 5000 });
    await page.getByText("E2E Friend").first().click();

    // Submit
    await page.getByRole("button", { name: /add to list/i }).click();
    await expect(page.getByText(/has been added/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("invite member by email directly", async ({ page }) => {
    const listName = `Email Invite ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name: listName, visibility: "MEMBERS" },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await openInviteDialog(page);

    await page.getByPlaceholder(/search users/i).fill(TEST_USER_2.email);
    await page.getByRole("button", { name: /add to list/i }).click();
    await expect(page.getByText(/has been added/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("invite fails for non-existent user", async ({ page }) => {
    const listName = `Not Found ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name: listName, visibility: "MEMBERS" },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await openInviteDialog(page);
    await page
      .getByPlaceholder(/search users/i)
      .fill("nobody@doesnotexist.test");
    await page.getByRole("button", { name: /add to list/i }).click();
    await expect(page.getByText(/not found|no user/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("list shows radarr URL when movies are present", async ({ page }) => {
    const listName = `Radarr Test ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name: listName, visibility: "MEMBERS" },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(`/lists/${list.slug}`);
    // The Radarr URL lives on the Integrations tab of the settings modal
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Integrations" }).click();
    await expect(page.getByText("Radarr import URL")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/\/api\/lists\//)).toBeVisible();
  });

  test("owner can switch a list between private, site members and public", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Visibility Test ${Date.now()}`, visibility: "PRIVATE" },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    const main = page.getByRole("main");
    await expect(main.getByText("Private list")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByText("Site members", { exact: true }).click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(main.getByText("Site members list")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByText("Public", { exact: true }).click();
    await expect(
      page.getByText(/anyone with the link can view this list/i),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(main.getByText("Public list")).toBeVisible({
      timeout: 10000,
    });
  });

  test("non-existent list shows 404", async ({ page }) => {
    await page.goto("/lists/this-list-does-not-exist-xyz");
    await expect(page.getByText(/not found|404/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
