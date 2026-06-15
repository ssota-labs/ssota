import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("Workflow map", () => {
  test("shows phases and opens type sheet with seeded nodes", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "workflow/map");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Workflow Map", exact: true }),
    ).toBeVisible();
    await expect(main.getByText("Execution", { exact: true })).toBeVisible();
    await expect(main.getByText("Research", { exact: true })).toBeVisible();

    await main.getByRole("button", { name: /Product initiatives|이니셔티브/i }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Smoke initiative")).toBeVisible({ timeout: 10_000 });

    await sheet.getByRole("button", { name: "Open table" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/product/initiatives$`),
    );
  });

  test("node sheet links to initiative route", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await loginAsSmoke(page);
    await gotoProject(page, "workflow/map");

    const main = page.getByRole("main");
    await main.getByRole("button", { name: /Product initiatives|이니셔티브/i }).click();

    const sheet = page.getByRole("dialog");
    await sheet
      .locator("div")
      .filter({ hasText: "Smoke initiative" })
      .getByRole("button", { name: "Open document" })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/product/initiatives/${initiativeId}$`),
    );
  });
});
