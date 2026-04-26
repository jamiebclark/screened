import { test, expect } from "@playwright/test";
import { TEST_USER, login } from "./helpers";

const UNIQUE_EMAIL = `e2e_${Date.now()}@test.local`;

// Ensure TEST_USER exists before auth tests so the duplicate-email test always works
test.beforeAll(async ({ request }) => {
  await request.post("/api/auth/register", {
    data: TEST_USER,
    headers: { "Content-Type": "application/json" },
  });
});

test.describe("Authentication", () => {
  test("register new user and land on dashboard", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(UNIQUE_EMAIL);
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("/", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("shows error with wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error with unknown email", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@nowhere.test");
    await page.getByLabel("Password").fill("somepassword123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 5000 });
  });

  test("shows error when registering with existing email", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Dupe");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Email already in use")).toBeVisible({ timeout: 5000 });
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 5000 });
  });

  test("logout via nav dropdown", async ({ page }) => {
    await login(page);
    // Click avatar dropdown
    await page.getByRole("button").filter({ has: page.locator(".rounded-full") }).first().click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
