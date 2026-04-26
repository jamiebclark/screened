import { Page, expect } from "@playwright/test";

export const TEST_USER = {
  name: "E2E Tester",
  email: "e2e@test.local",
  password: "testpassword123",
};

export const TEST_USER_2 = {
  name: "E2E Friend",
  email: "e2efriend@test.local",
  password: "testpassword123",
};

export async function ensureTestUsersExist(page: Page) {
  // Register TEST_USER if not exists (ignore error if already registered)
  await page.request.post("/api/auth/register", {
    data: TEST_USER,
    headers: { "Content-Type": "application/json" },
  });
  // Register TEST_USER_2 if not exists
  await page.request.post("/api/auth/register", {
    data: TEST_USER_2,
    headers: { "Content-Type": "application/json" },
  });
}

export async function login(page: Page, user = TEST_USER) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("/", { timeout: 10000 });
}

export async function logout(page: Page) {
  // Clear all auth-related cookies so the next navigation starts fresh
  const cookies = await page.context().cookies();
  const authCookieNames = cookies
    .filter((c) => c.name.includes("next-auth") || c.name.includes("authjs") || c.name.startsWith("__Secure"))
    .map((c) => ({ name: c.name, domain: c.domain, path: c.path }));
  if (authCookieNames.length > 0) {
    await page.context().clearCookies();
  }
}

export async function ensureLoggedIn(page: Page, user = TEST_USER) {
  // Try to visit home; if redirected to login, log in
  const response = await page.goto("/");
  if (page.url().includes("/login") || page.url().includes("/register")) {
    await login(page, user);
  }
}

/**
 * Opens the user avatar menu (the second header action; the first is Notifications).
 * Do not use the first round header button — that opens the notification dropdown.
 */
export async function openUserMenuFromHeader(page: Page) {
  const headerRight = page.locator("header .max-w-7xl > div").last();
  await headerRight.getByRole("button").last().click();
}

/** Current user’s profile user id (from the URL after opening Profile from the header menu). */
export async function getProfileUserIdFromNav(page: Page): Promise<string> {
  await page.goto("/");
  await openUserMenuFromHeader(page);
  await page.getByRole("menuitem", { name: /profile/i }).click();
  await page.waitForURL(/\/profile\//, { timeout: 8000 });
  const m = page.url().match(/\/profile\/([^/?#]+)/);
  if (!m?.[1]) {
    throw new Error(`Could not parse profile id from URL: ${page.url()}`);
  }
  return m[1];
}

type FriendsApiList = {
  friends: { id: string }[];
  outgoing: { id: string; toUser: { id: string } }[];
  incoming: { id: string; fromUser: { id: string } }[];
};

/**
 * Best-effort cleanup so two test users are not friends and have no pending friend requests
 * in either direction. Improves isolation when the same DB is reused between runs.
 */
type TestCreds = { email: string; name: string; password: string };

export async function clearFriendshipStateBetween(
  page: Page,
  id1: string,
  id2: string,
  user1: TestCreds = TEST_USER,
  user2: TestCreds = TEST_USER_2,
) {
  const clearAs = async (user: TestCreds, selfId: string) => {
    await logout(page);
    await login(page, user);
    const res = await page.request.get("/api/friends");
    if (!res.ok) return;
    const data = (await res.json()) as FriendsApiList;
    const peerId = selfId === id1 ? id2 : id1;
    for (const f of data.friends) {
      if (f.id === peerId) {
        await page.request.delete(`/api/friends/${encodeURIComponent(peerId)}`);
      }
    }
    for (const o of data.outgoing) {
      if (o.toUser.id === peerId) {
        await page.request.delete(`/api/friends/requests/${encodeURIComponent(o.id)}`);
      }
    }
    for (const i of data.incoming) {
      if (i.fromUser.id === peerId) {
        await page.request.delete(`/api/friends/requests/${encodeURIComponent(i.id)}`);
      }
    }
  };

  await clearAs(user1, id1);
  await clearAs(user2, id2);
  await logout(page);
}
