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

export async function register(page: Page, user = TEST_USER) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign up|register|create/i }).click();
  await page.waitForURL("/");
}

export async function login(page: Page, user = TEST_USER) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL("/");
}

export async function ensureLoggedIn(page: Page, user = TEST_USER) {
  await page.goto("/");
  const url = page.url();
  if (url.includes("/login") || url.includes("/register")) {
    await login(page, user);
  }
}

export async function logout(page: Page) {
  // Try nav dropdown or direct navigation
  await page.goto("/api/auth/signout");
}
