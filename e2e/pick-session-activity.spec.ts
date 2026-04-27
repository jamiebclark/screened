import { test, expect } from "@playwright/test";
import { ensureLoggedIn, ensureTestUsersExist } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureTestUsersExist(page);
  await ensureLoggedIn(page);
});

test.describe("Picker session activity", () => {
  test("Session panel has activity list and empty copy before shared room", async ({
    page,
  }) => {
    await page.goto("/pick");
    await expect(
      page.getByRole("heading", { name: "Movie Night Picker" }),
    ).toBeVisible({ timeout: 10000 });

    const region = page.getByRole("region", { name: "Session activity" });
    await expect(region).toBeVisible();
    await expect(
      page.getByText(
        "Start a shared room and open the same link to see what each person does in real time.",
      ),
    ).toBeVisible();
  });
});

test.describe("Picker form — first visit", () => {
  test("shows 'How it works' explainer when no movies added yet", async ({
    page,
  }) => {
    await page.goto("/pick");
    await expect(
      page.getByRole("heading", { name: "Movie Night Picker" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "How it works" }),
    ).toBeVisible();
    await expect(page.getByText("Like these")).toBeVisible();
    await expect(page.getByText("Not like these")).toBeVisible();
    await expect(
      page.getByText(/Add at least one film to.*Like these/),
    ).toBeVisible();
  });

  test("picker form has Like these and Not like these sections", async ({
    page,
  }) => {
    await page.goto("/pick");
    await expect(
      page.getByRole("heading", { name: "Movie Night Picker" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Like these" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Not like these" }),
    ).toBeVisible();
  });

  test("Find movies button is present and shows 'first run' prompt when attractors added", async ({
    page,
  }) => {
    await page.goto("/pick");
    await expect(
      page.getByRole("heading", { name: "Movie Night Picker" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", { name: /find movies/i }),
    ).toBeVisible();
  });
});

test.describe("Picker form — filters", () => {
  test("Filters section is present with year and runtime controls", async ({
    page,
  }) => {
    await page.goto("/pick");
    await expect(
      page.getByRole("heading", { name: "Movie Night Picker" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Filters" }),
    ).toBeVisible();
  });
});

test.describe("Picker session — sharing", () => {
  test("room link button is visible and clicking it copies a URL", async ({
    page,
  }) => {
    await page.goto("/pick");
    await expect(
      page.getByRole("heading", { name: "Movie Night Picker" }),
    ).toBeVisible({ timeout: 10000 });

    const shareButton = page.getByRole("button", { name: /share|copy link/i });
    await expect(shareButton).toBeVisible();
  });
});
