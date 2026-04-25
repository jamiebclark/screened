import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist, TEST_USER_2 } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Lists - Advanced", () => {
  test("private list is inaccessible to non-members without slug", async ({ page }) => {
    // Create a private list as main user
    const res = await page.request.post("/api/lists", {
      data: { name: `Private ${Date.now()}`, isPublic: false },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string };

    // Clear session so middleware doesn't redirect away from /login
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER_2.email);
    await page.getByLabel("Password").fill(TEST_USER_2.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("/", { timeout: 10000 });

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 });
  });

  test("delete a list", async ({ page }) => {
    const name = `Delete Me ${Date.now()}`;
    const res = await page.request.post("/api/lists", {
      data: { name, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string };

    // Delete via API
    const del = await page.request.delete(`/api/lists/${list.slug}`);
    expect(del.ok()).toBeTruthy();

    // List page should 404
    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 });
  });

  test("edit list name via PATCH", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Edit Me ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string; name: string };

    const newName = `Edited Name ${Date.now()}`;
    const patch = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { name: newName },
      headers: { "Content-Type": "application/json" },
    });
    expect(patch.ok()).toBeTruthy();
    const updated = await patch.json() as { name: string };
    expect(updated.name).toBe(newName);
  });

  test("radarr endpoint returns movie list JSON", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Radarr ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string };

    // Add a movie
    await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });

    // Fetch radarr endpoint (public list - no token needed)
    const radarr = await page.request.get(`/api/lists/${list.slug}/radarr`);
    expect(radarr.ok()).toBeTruthy();
    const data = await radarr.json() as Array<{ tmdbId: number; title: string }>;
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].tmdbId).toBe(27205);
    expect(data[0].title).toBe("Inception");
  });

  test("radarr endpoint rejects private list without token", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Private Radarr ${Date.now()}`, isPublic: false },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string };

    const radarr = await page.request.get(`/api/lists/${list.slug}/radarr`);
    expect(radarr.status()).toBe(401);
  });

  test("radarr endpoint works for private list with correct token", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `Private Radarr Token ${Date.now()}`, isPublic: false },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string; radarrToken: string };

    await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });

    const radarr = await page.request.get(`/api/lists/${list.slug}/radarr?token=${list.radarrToken}`);
    expect(radarr.ok()).toBeTruthy();
    const data = await radarr.json() as Array<{ tmdbId: number }>;
    expect(data.length).toBeGreaterThan(0);
  });

  test("non-owner cannot delete list", async ({ page }) => {
    // Create list as user 1
    const res = await page.request.post("/api/lists", {
      data: { name: `No Delete ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string };

    // Clear session so middleware doesn't redirect away from /login
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER_2.email);
    await page.getByLabel("Password").fill(TEST_USER_2.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("/", { timeout: 10000 });

    // Try to delete
    const del = await page.request.delete(`/api/lists/${list.slug}`);
    expect(del.status()).toBe(403);
  });

  test("add TV show to list", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `TV List ${Date.now()}`, isPublic: true },
      headers: { "Content-Type": "application/json" },
    });
    const list = await res.json() as { slug: string };

    // Add Breaking Bad (1396) as TV
    const add = await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 1396, type: "tv" },
      headers: { "Content-Type": "application/json" },
    });
    expect(add.ok()).toBeTruthy();

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Breaking Bad")).toBeVisible({ timeout: 10000 });
    // TV shows section should appear
    await expect(page.getByText(/TV Shows/i)).toBeVisible();
  });

  test("user search returns matching users", async ({ page }) => {
    const res = await page.request.get("/api/users/search?q=E2E");
    expect(res.ok()).toBeTruthy();
    const users = await res.json() as Array<{ name: string; email: string }>;
    expect(Array.isArray(users)).toBeTruthy();
    // Should find at least one E2E user
    expect(users.length).toBeGreaterThan(0);
  });

  test("user search with short query returns empty", async ({ page }) => {
    const res = await page.request.get("/api/users/search?q=x");
    expect(res.ok()).toBeTruthy();
    const users = await res.json() as unknown[];
    expect(users).toHaveLength(0);
  });

  test("user search excludes current user", async ({ page }) => {
    // Search for "E2E Tester" - the current user should NOT appear in results
    const res = await page.request.get("/api/users/search?q=E2E%20Tester");
    const users = await res.json() as Array<{ email: string }>;
    // Current user's email should not be in results
    const currentUserEmail = users.find((u) => u.email === "e2e@test.local");
    // The current user (logged in) should be excluded
    expect(currentUserEmail).toBeUndefined();
  });
});
