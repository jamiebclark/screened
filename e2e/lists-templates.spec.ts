import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

const LIST_SLUG_PATTERN = /\/lists\/[a-z0-9-]+/;

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Lists - templates", () => {
  test("Hooptober 2026 template prefills the form and declares its categories", async ({
    page,
  }) => {
    await page.goto("/lists/new");

    await page.getByText("Hooptober 2026", { exact: true }).click();
    await expect(page.getByLabel("List name")).toHaveValue("Hooptober 2026");
    await expect(
      page.getByText(/23 categories declared as tags/),
    ).toBeVisible();

    // The template owns the list type: ranked, list layout.
    const uniqueName = `Hooptober Template ${Date.now()}`;
    await page.getByLabel("List name").fill(uniqueName);
    await page.getByRole("button", { name: "Create list" }).click();
    await page.waitForURL(LIST_SLUG_PATTERN, { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 15000,
    });

    await page.getByLabel("Manage list tags").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Sequel", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Lowest rated from 1980s you have not seen", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(dialog.getByText("No tags declared yet.")).toBeHidden();
  });

  test("creating from a template server-side sets flags, window, and tags", async ({
    page,
  }) => {
    // Only name + template: the flags, window and categories all come from the
    // server-side template definition, not from the client.
    const res = await page.request.post("/api/lists", {
      data: { name: `Hooptober API ${Date.now()}`, template: "hooptober-2026" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();

    const list = (await res.json()) as {
      displayMode: string;
      rankingEnabled: boolean;
      votingEnabled: boolean;
      challengeStartsAt: string;
      challengeEndsAt: string;
      _count: { tags: number };
    };

    expect(list.displayMode).toBe("LIST");
    expect(list.rankingEnabled).toBe(true);
    expect(list.votingEnabled).toBe(false);
    expect(list._count.tags).toBe(23);
    expect(list.challengeStartsAt).toBe("2026-09-01T00:00:00.000Z");
    expect(list.challengeEndsAt).toBe("2026-10-31T00:00:00.000Z");
  });

  test("an unknown template id is ignored rather than failing the create", async ({
    page,
  }) => {
    const res = await page.request.post("/api/lists", {
      data: { name: `No Template ${Date.now()}`, template: "hooptober-1999" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();

    const list = (await res.json()) as {
      challengeStartsAt: string | null;
      _count: { tags: number };
    };
    expect(list._count.tags).toBe(0);
    expect(list.challengeStartsAt).toBeNull();
  });
});
