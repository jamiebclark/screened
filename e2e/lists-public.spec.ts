import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  ensureLoggedIn,
  ensureTestUsersExist,
  login,
  TEST_USER_2,
} from "./helpers";

type Visibility = "PUBLIC" | "MEMBERS" | "PRIVATE";

async function createList(
  request: APIRequestContext,
  visibility: Visibility,
  withItem = true,
) {
  const res = await request.post("/api/lists", {
    data: {
      name: `Anon ${visibility.toLowerCase()} ${Date.now()}`,
      visibility,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();
  const list = (await res.json()) as {
    slug: string;
    name: string;
    visibility: Visibility;
  };
  expect(list.visibility).toBe(visibility);
  if (withItem) {
    const add = await request.post(`/api/lists/${list.slug}/items`, {
      data: { tmdbId: 27205, type: "movie" },
      headers: { "Content-Type": "application/json" },
    });
    expect(add.ok()).toBeTruthy();
  }
  return list;
}

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Lists - Public visibility", () => {
  test("logged-out visitors get a read-only view of a public list", async ({
    page,
    browser,
  }) => {
    const list = await createList(page.request, "PUBLIC");

    const anon = await browser.newContext();
    try {
      const anonPage = await anon.newPage();
      await anonPage.goto(`/lists/${list.slug}`);

      // Stays on the list — no login interstitial.
      await expect(anonPage).toHaveURL(new RegExp(`/lists/${list.slug}$`));
      await expect(anonPage).toHaveTitle(`${list.name} | Screened`);

      const main = anonPage.getByRole("main");
      await expect(
        main.getByRole("heading", { level: 1, name: list.name }),
      ).toBeVisible();
      await expect(main.getByText("Public list")).toBeVisible();
      await expect(main.getByText("Inception").first()).toBeVisible();

      // One sign-in prompt that returns to this list.
      const prompt = main.getByTestId("anonymous-list-prompt");
      await expect(prompt).toHaveCount(1);
      await expect(
        prompt.getByRole("link", { name: /sign in to vote and comment/i }),
      ).toHaveAttribute(
        "href",
        `/login?callbackUrl=${encodeURIComponent(`/lists/${list.slug}`)}`,
      );

      // Nothing about people, and nothing that mutates the list.
      await expect(main.getByText(/\d+ members?/)).toHaveCount(0);
      await expect(
        anonPage.getByRole("button", { name: "Add item to list" }),
      ).toHaveCount(0);
      await expect(
        anonPage.getByRole("button", { name: /list settings|integrations/i }),
      ).toHaveCount(0);
      await expect(
        anonPage.getByRole("link", { name: "Challenge history" }),
      ).toHaveCount(0);
      await expect(
        anonPage.getByRole("button", { name: "Hide hidden items" }),
      ).toHaveCount(0);

      // The item modal opens read-only with the same prompt in place of comments.
      await main.getByText("Inception").first().click();
      const dialog = anonPage.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId("anonymous-list-prompt")).toBeVisible();
      await expect(dialog.getByText(/added by/i)).toHaveCount(0);
      await expect(
        dialog.getByRole("button", { name: /remove|delete/i }),
      ).toHaveCount(0);

      // Following the prompt lands on the login page with the list as callback.
      await anonPage.keyboard.press("Escape");
      await prompt
        .getByRole("link", { name: /sign in to vote and comment/i })
        .click();
      await expect(anonPage).toHaveURL(
        new RegExp(
          `/login\\?callbackUrl=${encodeURIComponent(`/lists/${list.slug}`)}`,
        ),
      );
    } finally {
      await anon.close();
    }
  });

  test("logged-out visitors are sent to sign in for site-members and private lists", async ({
    page,
    browser,
  }) => {
    const members = await createList(page.request, "MEMBERS", false);
    const priv = await createList(page.request, "PRIVATE", false);

    const anon = await browser.newContext();
    try {
      const anonPage = await anon.newPage();
      for (const list of [members, priv]) {
        await anonPage.goto(`/lists/${list.slug}`);
        await expect(anonPage).toHaveURL(
          new RegExp(
            `/login\\?callbackUrl=${encodeURIComponent(`/lists/${list.slug}`)}`,
          ),
        );
        // The name of a non-public list never reaches an anonymous fetch —
        // neither in <title> nor in the streamed body (Next delivers the
        // redirect inside a 200 stream when a loading boundary exists).
        const html = await anon.request.get(`/lists/${list.slug}`, {
          maxRedirects: 0,
        });
        const body = await html.text();
        expect(body).not.toContain(list.name);
        expect(body).toContain("/login?callbackUrl=");
      }
    } finally {
      await anon.close();
    }
  });

  test("list API enforces the visibility matrix", async ({ page, browser }) => {
    const pub = await createList(page.request, "PUBLIC");
    const members = await createList(page.request, "MEMBERS", false);
    const priv = await createList(page.request, "PRIVATE", false);

    // Anonymous
    const anon = await browser.newContext();
    try {
      const pubRes = await anon.request.get(`/api/lists/${pub.slug}`);
      expect(pubRes.status()).toBe(200);
      const body = (await pubRes.json()) as Record<string, unknown> & {
        items: Array<{ addedBy: unknown }>;
      };
      expect(body.visibility).toBe("PUBLIC");
      expect(body.members).toEqual([]);
      expect(body.owner).toBeNull();
      expect(body).not.toHaveProperty("radarrToken");
      expect(body).not.toHaveProperty("discordWebhookUrl");
      expect(body).not.toHaveProperty("discordWebhookId");
      expect(body.items.length).toBeGreaterThan(0);
      for (const item of body.items) expect(item.addedBy).toBeNull();

      expect(
        (await anon.request.get(`/api/lists/${members.slug}`)).status(),
      ).toBe(401);
      expect((await anon.request.get(`/api/lists/${priv.slug}`)).status()).toBe(
        401,
      );

      // Radarr feed: PUBLIC only is token-less.
      expect(
        (await anon.request.get(`/api/lists/${pub.slug}/radarr`)).status(),
      ).toBe(200);
      expect(
        (await anon.request.get(`/api/lists/${members.slug}/radarr`)).status(),
      ).toBe(401);
    } finally {
      await anon.close();
    }

    // Signed-in non-member
    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      await login(otherPage, TEST_USER_2);
      expect(
        (await otherPage.request.get(`/api/lists/${pub.slug}`)).status(),
      ).toBe(200);
      const membersRes = await otherPage.request.get(
        `/api/lists/${members.slug}`,
      );
      expect(membersRes.status()).toBe(200);
      // Signed-in readers still get the full shape.
      const membersBody = (await membersRes.json()) as { owner: unknown };
      expect(membersBody.owner).not.toBeNull();
      expect(
        (await otherPage.request.get(`/api/lists/${priv.slug}`)).status(),
      ).toBe(403);
    } finally {
      await other.close();
    }

    // Owner
    expect((await page.request.get(`/api/lists/${priv.slug}`)).status()).toBe(
      200,
    );
  });

  test("visibility input is validated", async ({ page }) => {
    const bad = await page.request.post("/api/lists", {
      data: { name: `Bad visibility ${Date.now()}`, visibility: "public" },
      headers: { "Content-Type": "application/json" },
    });
    expect(bad.status()).toBe(400);

    const list = await createList(page.request, "MEMBERS", false);
    const patch = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { visibility: true },
      headers: { "Content-Type": "application/json" },
    });
    expect(patch.status()).toBe(400);

    const ok = await page.request.patch(`/api/lists/${list.slug}`, {
      data: { visibility: "PUBLIC" },
      headers: { "Content-Type": "application/json" },
    });
    expect(ok.ok()).toBeTruthy();
    expect(((await ok.json()) as { visibility: string }).visibility).toBe(
      "PUBLIC",
    );
  });

  test("new lists default to site members and offer all three tiers", async ({
    page,
  }) => {
    await page.goto("/lists/new");
    const form = page.getByRole("main");
    await expect(form.getByText("Site members", { exact: true })).toBeVisible();
    await expect(form.getByText("Public", { exact: true })).toBeVisible();
    await expect(form.getByText("Private", { exact: true })).toBeVisible();
    await expect(
      form.getByText("Anyone on the internet, even without an account"),
    ).toBeVisible();
    await expect(
      page.locator('input[name="visibility"][value="MEMBERS"]'),
    ).toBeChecked();

    const res = await page.request.post("/api/lists", {
      data: { name: `Default tier ${Date.now()}` },
      headers: { "Content-Type": "application/json" },
    });
    expect(((await res.json()) as { visibility: string }).visibility).toBe(
      "MEMBERS",
    );
  });
});
