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

test.describe("Lists - Ranked", () => {
  test("create ranked list, reorder items, positions persist on reload", async ({
    page,
  }) => {
    // Create a ranked list
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Ranked ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const list = (await res.json()) as { slug: string };

    // Add 3 movies
    const movies = [
      { tmdbId: 27205, type: "movie" }, // Inception
      { tmdbId: 550, type: "movie" }, // Fight Club
      { tmdbId: 13, type: "movie" }, // Forrest Gump
    ];
    const itemIds: string[] = [];
    for (const movie of movies) {
      const r = await page.request.post(`/api/lists/${list.slug}/items`, {
        data: movie,
        headers: { "Content-Type": "application/json" },
      });
      expect(r.ok()).toBeTruthy();
      const item = (await r.json()) as { id: string };
      itemIds.push(item.id);
    }

    // Verify the list page shows position numbers
    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });
    // Ranked list should show position numbers 1, 2, 3
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

    // Reorder via API: reverse the order
    const positions = itemIds.map((id, idx) => ({
      id,
      position: itemIds.length - idx,
    }));
    const reorder = await page.request.patch(
      `/api/lists/${list.slug}/items/reorder`,
      {
        data: { positions },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(reorder.ok()).toBeTruthy();

    // Reload and verify positions persisted — Forrest Gump should now be #1
    await page.reload();
    await expect(page.getByText("Forrest Gump")).toBeVisible({
      timeout: 10000,
    });

    // Verify the reorder API correctly stored positions by fetching items
    const itemsRes = await page.request.get(`/api/lists/${list.slug}`);
    if (itemsRes.ok()) {
      const data = (await itemsRes.json()) as {
        items: { id: string; position: number }[];
      };
      const forrestItem = data.items.find((i) => i.id === itemIds[2]);
      expect(forrestItem?.position).toBe(1);
      const inceptionItem = data.items.find((i) => i.id === itemIds[0]);
      expect(inceptionItem?.position).toBe(3);
    }

    // Ranked list should not show sort controls (ranking replaces sorting)
    await expect(page.getByText("Sort:")).not.toBeVisible();
  });

  test("ranked list displays position numbers in list view", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Ranked Positions ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    // Add 2 items
    await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });
    await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 550, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    // Both items should have rank numbers visible
    const rows = page.locator('[class*="tabular-nums"]');
    await expect(rows.first()).toBeVisible();
  });

  test("dragging the last row above the first persists across reload", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Ranked Drag ${Date.now()}`,
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
      { tmdbId: 13, type: "movie" }, // Forrest Gump
    ];
    for (const movie of movies) {
      const r = await page.request.post(`/api/lists/${list.slug}/items`, {
        data: movie,
        headers: { "Content-Type": "application/json" },
      });
      expect(r.ok()).toBeTruthy();
    }

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Forrest Gump")).toBeVisible({
      timeout: 10000,
    });

    const handles = page.getByLabel("Drag to reorder");
    await expect(handles).toHaveCount(3);

    const lastHandleBox = await handles.nth(2).boundingBox();
    const firstHandleBox = await handles.nth(0).boundingBox();
    if (!lastHandleBox || !firstHandleBox) {
      throw new Error("Could not locate drag handles");
    }

    await page.mouse.move(
      lastHandleBox.x + lastHandleBox.width / 2,
      lastHandleBox.y + lastHandleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      firstHandleBox.x + firstHandleBox.width / 2,
      firstHandleBox.y + firstHandleBox.height / 2 - 5,
      { steps: 10 },
    );
    await page.mouse.up();

    await expect(page.locator("text=Forrest Gump").first()).toBeVisible();

    await page.reload();
    const itemsRes = await page.request.get(`/api/lists/${list.slug}`);
    const data = (await itemsRes.json()) as {
      items: { mediaItem: { title: string }; position: number }[];
    };
    const forrestItem = data.items.find(
      (i) => i.mediaItem.title === "Forrest Gump",
    );
    expect(forrestItem?.position).toBe(1);
  });

  test("ranked order with mixed movie/TV and a watched item survives reload", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Ranked Mixed ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    const movieRes = await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" }, // Inception
      headers: { "Content-Type": "application/json" },
    });
    const movieItem = (await movieRes.json()) as { id: string };
    const tvRes = await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 1396, type: "tv" }, // Breaking Bad
      headers: { "Content-Type": "application/json" },
    });
    const tvItem = (await tvRes.json()) as { id: string };

    // Mark the movie WATCHED for the viewer
    await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });

    // Reorder so the TV show (unwatched) is first, movie (watched) second
    const reorder = await page.request.patch(
      `/api/lists/${list.slug}/items/reorder`,
      {
        data: {
          positions: [
            { id: tvItem.id, position: 1 },
            { id: movieItem.id, position: 2 },
          ],
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(reorder.ok()).toBeTruthy();

    await page.reload();
    const itemsRes = await page.request.get(`/api/lists/${list.slug}`);
    const data = (await itemsRes.json()) as {
      items: { id: string; position: number }[];
    };
    const tvStored = data.items.find((i) => i.id === tvItem.id);
    const movieStored = data.items.find((i) => i.id === movieItem.id);
    expect(tvStored?.position).toBe(1);
    expect(movieStored?.position).toBe(2);
  });

  test("a partial positions payload is rejected with 400", async ({ page }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Ranked Partial ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    const itemIds: string[] = [];
    for (const movie of [
      { tmdbId: 27205, type: "movie" },
      { tmdbId: 550, type: "movie" },
    ]) {
      const r = await page.request.post(`/api/lists/${list.slug}/items`, {
        data: movie,
        headers: { "Content-Type": "application/json" },
      });
      const item = (await r.json()) as { id: string };
      itemIds.push(item.id);
    }

    // Submit only one of the two items
    const partial = await page.request.patch(
      `/api/lists/${list.slug}/items/reorder`,
      {
        data: { positions: [{ id: itemIds[0], position: 1 }] },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(partial.status()).toBe(400);
  });

  test("a VIEWER sees no drag handle and their direct PATCH returns 403", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Ranked Viewer ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as { slug: string };

    for (const movie of [
      { tmdbId: 27205, type: "movie" },
      { tmdbId: 550, type: "movie" },
    ]) {
      await page.request.post(`/api/lists/${list.slug}/items`, {
        data: movie,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inviteRes = await page.request.post(
      `/api/lists/${list.slug}/members`,
      {
        data: { email: TEST_USER_2.email, role: "VIEWER" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(inviteRes.ok()).toBeTruthy();

    await logout(page);
    await login(page, TEST_USER_2);

    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Drag to reorder")).toHaveCount(0);

    const itemsRes = await page.request.get(`/api/lists/${list.slug}`);
    const data = (await itemsRes.json()) as { items: { id: string }[] };
    const direct = await page.request.patch(
      `/api/lists/${list.slug}/items/reorder`,
      {
        data: {
          positions: data.items.map((i, idx) => ({
            id: i.id,
            position: idx + 1,
          })),
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(direct.status()).toBe(403);

    await logout(page);
    await login(page);
  });
});
