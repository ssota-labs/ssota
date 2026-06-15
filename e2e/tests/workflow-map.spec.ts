import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("Workflow map", () => {
  test("shows phases and opens type sheet with seeded nodes", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "workflow/map");

    await expect(
      page.getByRole("heading", { name: "Workflow Map", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Execution", { exact: true })).toBeVisible();
    await expect(page.getByText("Research", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Initiatives|이니셔티브/i }).first().click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Smoke initiative")).toBeVisible({ timeout: 10_000 });

    await sheet.getByRole("link", { name: "Open table" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/product/initiatives$`),
    );
  });

  test("node sheet links to initiative route", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await loginAsSmoke(page);
    await gotoProject(page, "workflow/map");

    await page.getByRole("button", { name: /Initiatives|이니셔티브/i }).first().click();
    await page.getByRole("link", { name: "Open document" }).first().click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/product/initiatives/${initiativeId}$`),
    );
  });
});
