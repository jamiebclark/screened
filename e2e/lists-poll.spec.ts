import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Lists - Poll", () => {
  test("poll list shows vote controls, disabling voting removes them", async ({
    page,
  }) => {
    // Create a poll list (voting enabled)
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Poll ${Date.now()}`,
        isPublic: true,
        votingEnabled: true,
        displayMode: "LIST",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const list = (await res.json()) as { slug: string; votingEnabled: boolean };
    expect(list.votingEnabled).toBe(true);

    // Add a movie
    const add = await page.request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });
    expect(add.ok()).toBeTruthy();

    // Visit the list page — vote controls and Votes sort should be present
    await page.goto(`/lists/${list.slug}`);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    // Vote sort option should be visible
    await expect(page.getByRole("button", { name: "Votes" })).toBeVisible();

    // Disable voting via settings API
    const patch = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { votingEnabled: false },
      headers: { "Content-Type": "application/json" },
    });
    expect(patch.ok()).toBeTruthy();
    const updated = (await patch.json()) as { votingEnabled: boolean };
    expect(updated.votingEnabled).toBe(false);

    // Reload and verify vote controls and Votes sort are gone
    await page.reload();
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10000 });

    // Votes sort button should be hidden
    await expect(page.getByRole("button", { name: "Votes" })).not.toBeVisible();
  });

  test("poll list creation rejects rankingEnabled + votingEnabled together", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Invalid ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
        votingEnabled: true,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/cannot both be true/i);
  });

  test("enabling voting on an existing list clears rankingEnabled", async ({
    page,
  }) => {
    // Start with a ranked list
    const res = await page.request.post("/api/lists", {
      data: {
        name: `Swap ${Date.now()}`,
        isPublic: true,
        rankingEnabled: true,
      },
      headers: { "Content-Type": "application/json" },
    });
    const list = (await res.json()) as {
      slug: string;
      rankingEnabled: boolean;
    };
    expect(list.rankingEnabled).toBe(true);

    // Switch to voting-enabled
    const patch = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { votingEnabled: true },
      headers: { "Content-Type": "application/json" },
    });
    expect(patch.ok()).toBeTruthy();
    const updated = (await patch.json()) as {
      votingEnabled: boolean;
      rankingEnabled: boolean;
    };
    expect(updated.votingEnabled).toBe(true);
    expect(updated.rankingEnabled).toBe(false);
  });
});
