import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  ensureLoggedIn,
  ensureTestUsersExist,
  login,
  logout,
  TEST_USER,
  TEST_USER_2,
} from "./helpers";

type Visibility = "PUBLIC" | "MEMBERS" | "PRIVATE";

async function createList(request: APIRequestContext, visibility: Visibility) {
  const res = await request.post("/api/lists", {
    data: {
      name: `Timeline ${visibility.toLowerCase()} ${Date.now()}`,
      visibility,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { slug: string; name: string };
}

async function addMovie(
  request: APIRequestContext,
  slug: string,
  tmdbId: number,
) {
  const r = await request.post(`/api/lists/${slug}/items`, {
    data: { tmdbId, type: "movie" },
    headers: { "Content-Type": "application/json" },
  });
  expect(r.ok()).toBeTruthy();
}

async function logWatch(request: APIRequestContext, tmdbId: number) {
  const r = await request.post("/api/media/status", {
    data: { tmdbId, type: "movie", status: "WATCHED" },
    headers: { "Content-Type": "application/json" },
  });
  expect(r.ok()).toBeTruthy();
}

/** Removes every watch and status the signed-in user has for a title. */
async function clearWatches(request: APIRequestContext, tmdbId: number) {
  const r = await request.post("/api/media/status", {
    data: { tmdbId, type: "movie", status: null },
    headers: { "Content-Type": "application/json" },
  });
  expect(r.ok()).toBeTruthy();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Waits for the timeline page's server-rendered heading before asserting. */
async function gotoTimeline(
  page: import("@playwright/test").Page,
  slug: string,
) {
  await page.goto(`/lists/${slug}/timeline`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Timeline" }),
  ).toBeVisible({ timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Lists - Watch timeline", () => {
  test("members see watched titles on the timeline with watcher names and the rest under Not watched yet (US1, US2, US3, US4)", async ({
    page,
  }) => {
    const list = await createList(page.request, "MEMBERS");
    await addMovie(page.request, list.slug, 27205); // Inception
    await addMovie(page.request, list.slug, 155); // The Dark Knight
    // Watch state is per user, not per list: make sure only Inception counts.
    await clearWatches(page.request, 155);
    await logWatch(page.request, 27205);

    // Entry point from the list header.
    await page.goto(`/lists/${list.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: list.name }),
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "Timeline" }).click();
    await expect(page).toHaveURL(new RegExp(`/lists/${list.slug}/timeline$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Timeline" }),
    ).toBeVisible();

    const entries = page.getByTestId("timeline-entry");
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText("Inception");
    await expect(entries.first()).toContainText(TEST_USER.name);

    const unwatched = page.getByTestId("timeline-unwatched");
    await expect(unwatched).toContainText("Not watched yet");
    await expect(unwatched).toContainText("1");
    await expect(unwatched).toContainText("The Dark Knight");

    // A window entirely in the past excludes today's watch.
    await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: "2020-01-01", challengeEndsAt: "2020-01-31" },
      headers: { "Content-Type": "application/json" },
    });
    await gotoTimeline(page, list.slug);
    await expect(
      page.getByText("Nothing watched in this window yet."),
    ).toBeVisible();
    await expect(page.getByTestId("timeline-entry")).toHaveCount(0);
    await expect(page.getByTestId("timeline-unwatched")).toContainText("2");

    // Widening the window to include today brings the watch back, with a
    // Today marker on the axis.
    await page.request.patch(`/api/lists/${list.slug}`, {
      data: { challengeStartsAt: todayIso(), challengeEndsAt: null },
      headers: { "Content-Type": "application/json" },
    });
    await gotoTimeline(page, list.slug);
    await expect(page.getByTestId("timeline-entry")).toHaveCount(1);
    await expect(page.getByTestId("timeline-entry")).toContainText("Inception");
    await expect(page.getByText("Today", { exact: true })).toBeVisible();

    // Back link returns to the list.
    await page.getByRole("link", { name: list.name }).click();
    await expect(page).toHaveURL(new RegExp(`/lists/${list.slug}$`));
  });

  test("a public list's timeline is anonymised for logged-out visitors (US5)", async ({
    page,
    browser,
  }) => {
    const list = await createList(page.request, "PUBLIC");
    await addMovie(page.request, list.slug, 27205);
    await logWatch(page.request, 27205);

    const anon = await browser.newContext();
    try {
      const anonPage = await anon.newPage();

      // The list page offers the link to everyone who can see the list.
      await anonPage.goto(`/lists/${list.slug}`);
      await expect(
        anonPage.getByRole("link", { name: "Timeline" }),
      ).toHaveAttribute("href", `/lists/${list.slug}/timeline`);

      await anonPage.goto(`/lists/${list.slug}/timeline`);
      await expect(anonPage).toHaveURL(
        new RegExp(`/lists/${list.slug}/timeline$`),
      );
      await expect(anonPage).toHaveTitle(`${list.name} · Timeline | Screened`);
      const entry = anonPage.getByTestId("timeline-entry");
      await expect(entry).toHaveCount(1);
      await expect(entry).toContainText("Inception");
      await expect(entry).toContainText("Watched once");
      await expect(entry).not.toContainText(TEST_USER.name);

      // The identity is absent from the payload, not just hidden.
      const html = await anon.request.get(`/lists/${list.slug}/timeline`);
      expect(await html.text()).not.toContain(TEST_USER.name);
    } finally {
      await anon.close();
    }
  });

  test("site-members and private timelines follow the list page's access rules (US5)", async ({
    page,
    browser,
  }) => {
    const members = await createList(page.request, "MEMBERS");
    const priv = await createList(page.request, "PRIVATE");

    const anon = await browser.newContext();
    try {
      const anonPage = await anon.newPage();
      for (const list of [members, priv]) {
        await anonPage.goto(`/lists/${list.slug}/timeline`);
        await expect(anonPage).toHaveURL(
          new RegExp(
            `/login\\?callbackUrl=${encodeURIComponent(
              `/lists/${list.slug}/timeline`,
            )}`,
          ),
        );
      }
    } finally {
      await anon.close();
    }

    // A signed-in non-member is bounced to the list page for a private list.
    await logout(page);
    await login(page, TEST_USER_2);
    await page.goto(`/lists/${priv.slug}/timeline`);
    await expect(page).toHaveURL(new RegExp(`/lists/${priv.slug}$`));
  });
});
