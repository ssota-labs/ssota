import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

/**
 * Legacy HypothesesWorkspace UI (table + "New hypothesis" + "Create initiative")
 * was replaced by catalog DocumentSheetList on the research/hypotheses page.
 * Initiative-from-hypothesis flow will be reintroduced via page actions in a follow-up.
 */
test.describe.skip("Research hypotheses — legacy initiative spawn", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "research/hypotheses");
  });

  test("creates hypothesis and spawns initiative to PRD", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New hypothesis" })).toBeVisible();

    await page.getByRole("button", { name: "New hypothesis" }).click();
    const row = page.getByRole("row").filter({ hasText: /Hypothesis / }).last();
    await expect(row).toBeVisible({ timeout: 10_000 });

    await row.getByRole("button", { name: "Create initiative" }).click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/initiatives/[^/]+/planning/prd$`),
      { timeout: 15_000 },
    );
    await expect(page.getByRole("textbox", { name: "Content" })).toBeVisible();
  });
});
