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

/**
 * Privacy: when both profile sections are "friends" only, another user does not see titles or tabs.
 * Friends: a signed-in user can create a friend request via POST /api/friends.
 *
 * Expects a running app (e.g. `yarn dev`); same as other e2e specs.
 */
test.describe("Friends and profile privacy", () => {
  test("non-friend sees a lock on friends-only profile; can send a friend request", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await ensureTestUsersExist(page);

    await login(page, TEST_USER);
    const user1Id = await getProfileUserIdFromNav(page);
    await logout(page);
    await login(page, TEST_USER_2);
    const user2Id = await getProfileUserIdFromNav(page);

    await clearFriendshipStateBetween(page, user1Id, user2Id);

    await login(page, TEST_USER);
    const pr = await page.request.patch("/api/user/privacy", {
      headers: { "Content-Type": "application/json" },
      data: {
        watchlistVisibility: "FRIENDS",
        watchHistoryVisibility: "FRIENDS",
      },
    });
    expect(pr.status()).toBe(200);

    const statusRes = await page.request.post("/api/media/status", {
      data: { tmdbId: 27205, type: "movie", status: "WATCHED" },
      headers: { "Content-Type": "application/json" },
    });
    expect(statusRes.status()).toBe(200);

    await logout(page);
    await login(page, TEST_USER_2);
    await page.goto(`/profile/${user1Id}`);
    await expect(page.getByText(/not visible to you/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("tab", { name: /Watched/i })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Watchlist/i })).toHaveCount(0);

    const addFr = await page.request.post("/api/friends", {
      headers: { "Content-Type": "application/json" },
      data: { toUserId: user1Id },
    });
    expect(addFr.status()).toBe(201);
    const addJson = (await addFr.json()) as { status: string; requestId?: string };
    expect(addJson.status).toBe("pending");
    expect(addJson.requestId).toBeTruthy();

    await logout(page);
    await login(page, TEST_USER);
    const reset = await page.request.patch("/api/user/privacy", {
      headers: { "Content-Type": "application/json" },
      data: {
        watchlistVisibility: "PUBLIC",
        watchHistoryVisibility: "PUBLIC",
      },
    });
    expect(reset.status()).toBe(200);
    await logout(page);
  });
});
