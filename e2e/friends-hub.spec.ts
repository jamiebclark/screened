import { test, expect } from "@playwright/test";
import {
  clearFriendshipStateBetween,
  ensureTestUsersExist,
  getProfileUserIdFromNav,
  login,
  logout,
  TEST_USER,
  TEST_USER_2,
} from "./helpers";

test.describe("Friends Hub", () => {
  test("US1: Friends link appears in main nav and /friends page renders", async ({
    page,
  }) => {
    await ensureTestUsersExist(page);
    await login(page, TEST_USER);

    await expect(
      page.getByRole("link", { name: "Friends" }).first(),
    ).toBeVisible();

    await page.goto("/friends");
    await expect(page).toHaveURL("/friends");
    await expect(page.getByRole("heading", { name: /friends/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /activity feed/i }),
    ).toBeVisible();
  });

  test("US1: empty state shown when user has no friends or requests", async ({
    page,
  }) => {
    await ensureTestUsersExist(page);
    const user1Id = await (async () => {
      await login(page, TEST_USER);
      return getProfileUserIdFromNav(page);
    })();
    await logout(page);
    await login(page, TEST_USER_2);
    const user2Id = await getProfileUserIdFromNav(page);
    await clearFriendshipStateBetween(page, user1Id, user2Id);

    await login(page, TEST_USER);
    await page.goto("/friends");
    await expect(page.getByText(/haven't added any friends/i)).toBeVisible({
      timeout: 8000,
    });
  });

  test("US2: incoming friend request shows accept and decline buttons", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await ensureTestUsersExist(page);

    await login(page, TEST_USER);
    const user1Id = await getProfileUserIdFromNav(page);
    await logout(page);
    await login(page, TEST_USER_2);
    const user2Id = await getProfileUserIdFromNav(page);
    await clearFriendshipStateBetween(page, user1Id, user2Id);

    // user2 sends a request to user1
    await login(page, TEST_USER_2);
    const res = await page.request.post("/api/friends", {
      headers: { "Content-Type": "application/json" },
      data: { toUserId: user1Id },
    });
    expect(res.status()).toBe(201);
    await logout(page);

    // user1 sees it on the hub
    await login(page, TEST_USER);
    await page.goto("/friends");
    await expect(page.getByText("Requests for you")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
  });

  test("US2: accepting a friend request moves sender to friends list", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await ensureTestUsersExist(page);

    await login(page, TEST_USER);
    const user1Id = await getProfileUserIdFromNav(page);
    await logout(page);
    await login(page, TEST_USER_2);
    const user2Id = await getProfileUserIdFromNav(page);
    await clearFriendshipStateBetween(page, user1Id, user2Id);

    // user2 sends request
    await login(page, TEST_USER_2);
    const res = await page.request.post("/api/friends", {
      headers: { "Content-Type": "application/json" },
      data: { toUserId: user1Id },
    });
    expect(res.status()).toBe(201);
    await logout(page);

    // user1 accepts
    await login(page, TEST_USER);
    await page.goto("/friends");
    await page.getByRole("button", { name: "Accept" }).click();

    // sender now appears in friends list
    await expect(page.getByText(TEST_USER_2.name)).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText("Requests for you")).toHaveCount(0);

    await clearFriendshipStateBetween(page, user1Id, user2Id);
  });

  test("US3: find friends search box is visible and filters results", async ({
    page,
  }) => {
    await ensureTestUsersExist(page);
    await login(page, TEST_USER);
    await page.goto("/friends");

    const searchInput = page.getByPlaceholder(/find friends by name/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("E2E");
    await expect(page.getByText(TEST_USER_2.name)).toBeVisible({
      timeout: 8000,
    });
  });

  test("US4: /settings/friends redirects to /friends", async ({ page }) => {
    await ensureTestUsersExist(page);
    await login(page, TEST_USER);
    await page.goto("/settings/friends");
    await expect(page).toHaveURL("/friends", { timeout: 8000 });
  });

  test("US4: Friends entry is not in Settings nav", async ({ page }) => {
    await ensureTestUsersExist(page);
    await login(page, TEST_USER);
    await page.goto("/settings");
    await expect(
      page.getByRole("link", { name: "Friends", exact: true }),
    ).toHaveCount(0);
  });
});
