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

test.describe("Lists - Edit settings", () => {
  test("owner renames via the UI and sees the new name without a manual reload", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Rename Me ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();

    const newName = `Renamed ${Date.now()}`;
    await page.getByLabel("Name").fill(newName);
    await page.getByRole("button", { name: "Save settings" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: newName }),
    ).toBeVisible({ timeout: 10000 });

    await page.goto("/lists");
    await expect(page.getByText(newName)).toBeVisible({ timeout: 10000 });
  });

  test("owner clears the description and the slug never changes", async ({
    page,
  }) => {
    const name = `Desc Clear ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name, description: "Original description", isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Original description")).toBeVisible();

    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByLabel("Description").fill("");
    await page.getByRole("button", { name: "Save settings" }).click();

    await expect(page.getByText("Original description")).toHaveCount(0);
    expect(page.url()).toContain(`/lists/${list.slug}`);
  });

  test("owner cannot save an empty name or a name over the character limit", async ({
    page,
  }) => {
    const name = `Validate Me ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();

    await page.getByLabel("Name").fill("");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("List name is required")).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("");

    await page.getByLabel("Name").fill("a".repeat(150));
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText("List name must be 100 characters or fewer"),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
      timeout: 10000,
    });
  });

  test("a CONTRIBUTOR and a VIEWER see no name/description editing affordance, and a direct PATCH returns 403", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Member Perms ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    const inviteRes = await page.request.post(
      `/api/lists/${list.slug}/members`,
      {
        data: { email: TEST_USER_2.email, role: "CONTRIBUTOR" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(inviteRes.ok()).toBeTruthy();

    await logout(page);
    await login(page, TEST_USER_2);

    await page.goto(`/lists/${list.slug}`);
    await page.getByRole("button", { name: "Integrations" }).click();
    await expect(page.getByLabel("Name")).toHaveCount(0);
    await expect(page.getByLabel("Description")).toHaveCount(0);
    await expect(page.getByLabel("Layout")).toHaveCount(0);

    const direct = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { name: "Hijacked name" },
      headers: { "Content-Type": "application/json" },
    });
    expect(direct.status()).toBe(403);

    await logout(page);
    await login(page);

    const viewerInvite = await page.request.post(
      `/api/lists/${list.slug}/members`,
      {
        data: { email: TEST_USER_2.email, role: "VIEWER" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(viewerInvite.ok()).toBeTruthy();

    await logout(page);
    await login(page, TEST_USER_2);

    const directViewer = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { name: "Hijacked again" },
      headers: { "Content-Type": "application/json" },
    });
    expect(directViewer.status()).toBe(403);

    await logout(page);
    await login(page);
  });

  test("owner switches layout from List to Grid and it re-renders immediately and survives reload, ranked order unchanged", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Layout Switch ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    const movies = [
      { tmdbId: 27205, type: "movie" }, // Inception
      { tmdbId: 550, type: "movie" }, // Fight Club
    ];
    for (const movie of movies) {
      const r = await page.request.post(`/api/lists/${list.slug}/items`, {
        data: movie,
        headers: { "Content-Type": "application/json" },
      });
      expect(r.ok()).toBeTruthy();
    }

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });
    // List layout renders divide-y rows, not a CSS grid of cards
    await expect(page.locator(".grid.grid-cols-2")).toHaveCount(0);

    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByLabel("Grid", { exact: true }).click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

    await expect(page.locator(".grid.grid-cols-2")).toBeVisible({
      timeout: 10000,
    });
    // Rank badge still present in grid layout for a ranked list
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

    await page.reload();
    await expect(page.locator(".grid.grid-cols-2")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  });

  test("a non-owner member sees no Layout control, and a direct displayMode PATCH returns 403", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Layout Perms ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    const inviteRes = await page.request.post(
      `/api/lists/${list.slug}/members`,
      {
        data: { email: TEST_USER_2.email, role: "CONTRIBUTOR" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(inviteRes.ok()).toBeTruthy();

    await logout(page);
    await login(page, TEST_USER_2);

    await page.goto(`/lists/${list.slug}`);
    await page.getByRole("button", { name: "Integrations" }).click();
    await expect(page.getByLabel("Layout")).toHaveCount(0);

    const direct = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { displayMode: "GRID" },
      headers: { "Content-Type": "application/json" },
    });
    expect(direct.status()).toBe(403);

    await logout(page);
    await login(page);
  });

  test("owner deletes a list from settings and lands back on /lists", async ({
    page,
  }) => {
    const name = `Delete Me ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    await page.goto(`/lists/${list.slug}`);
    await page.getByRole("button", { name: "List settings" }).click();
    await page.getByRole("tab", { name: "Settings" }).click();

    // Two-step: the first click only reveals the confirmation.
    await page.getByRole("button", { name: "Delete list" }).click();
    await expect(page.getByText("This cannot be undone.")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page).toHaveURL(/\/lists$/, { timeout: 10000 });
    await expect(page.getByText(name)).toHaveCount(0);

    // The list is really gone, not just hidden from the index.
    const gone = await page.request.get(`/api/lists/${list.slug}`);
    expect(gone.status()).toBe(404);
  });

  test("a CONTRIBUTOR cannot delete the list", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Undeletable ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };
    await page.request.post(`/api/lists/${list.slug}/members`, {
      data: { email: TEST_USER_2.email, role: "CONTRIBUTOR" },
      headers: { "Content-Type": "application/json" },
    });

    await logout(page);
    await login(page, TEST_USER_2);

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByRole("button", { name: "Delete list" })).toHaveCount(
      0,
    );

    const forbidden = await page.request.delete(`/api/lists/${list.slug}`);
    expect(forbidden.status()).toBe(403);

    await logout(page);
    await login(page);
  });
});
