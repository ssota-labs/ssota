import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("Initiative lifecycle", () => {
  test("smoke initiative hub and PRD editing", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await loginAsSmoke(page);
    await gotoProject(page, `product/initiatives/${initiativeId}`);

    await expect(page.getByRole("main").getByText("Smoke initiative")).toBeVisible();
    await expect(page.getByText("Scoped nodes")).toBeVisible();

    await gotoProject(page, `product/initiatives/${initiativeId}/planning/prd`);
    const content = page.getByRole("textbox", { name: "Content" });
    await expect(content).toBeVisible();

    await content.fill("# Smoke PRD\n\nE2E initiative lifecycle update.");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(content).toHaveValue(/E2E initiative lifecycle update\./, {
      timeout: 10_000,
    });
  });

  test("planning features lists seeded feature", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await loginAsSmoke(page);
    await gotoProject(page, `product/initiatives/${initiativeId}/planning/features`);

    await expect(page.getByRole("cell", { name: "Smoke feature" })).toBeVisible();
  });
});
