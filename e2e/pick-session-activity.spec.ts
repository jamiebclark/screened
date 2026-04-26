import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Picker session activity", () => {
  test("Session panel has activity list and empty copy before shared room", async ({ page }) => {
    await page.goto("/pick");
    await expect(page.getByRole("heading", { name: "Movie Night Picker" })).toBeVisible({ timeout: 10000 });

    const region = page.getByRole("region", { name: "Session activity" });
    await expect(region).toBeVisible();
    await expect(
      page.getByText("Start a shared room and open the same link to see what each person does in real time.")
    ).toBeVisible();
  });
});
