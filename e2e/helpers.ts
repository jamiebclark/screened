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
