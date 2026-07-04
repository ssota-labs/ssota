import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("page-loading", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("market research loading shows sibling nav and section chrome", async ({
    page,
  }) => {
    let delayActive = false;
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (delayActive && url.includes("_rsc=")) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      await route.continue();
    });

    await gotoProject(page, "tasks");
    delayActive = true;
    await gotoProject(page, "research/market");

    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`), {
      timeout: 15_000,
    });

    const siblingNav = page.getByTestId("page-sibling-nav");
    await expect(siblingNav).toBeVisible({ timeout: 10_000 });
    await expect(
      siblingNav.getByRole("link", { name: "Market research", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      siblingNav.getByRole("link", { name: "User research", exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Market research", exact: true }),
    ).toBeVisible();

    await expect(
      page
        .getByTestId("content-loading-page")
        .or(page.getByTestId("document-sheet-list")),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("document-sheet-list")).toBeVisible({
      timeout: 20_000,
    });
  });

  test("sibling tab switch keeps segmented list layout", async ({ page }) => {
    await gotoProject(page, "research/market");

    const siblingNav = page.getByTestId("page-sibling-nav");
    await expect(siblingNav).toBeVisible({ timeout: 15_000 });
    await siblingNav.getByRole("link", { name: "User research", exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`));
    await expect(
      page.getByRole("heading", { name: "User research", exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("document-sheet-list")).toBeVisible({
      timeout: 15_000,
    });
  });
});
