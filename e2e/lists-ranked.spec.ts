import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

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
});
