import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";
import { getSmokePageIdBySlug } from "../helpers/pages-seed";

test.describe("Initiative lifecycle", () => {
  test("smoke initiative overview and PRD editing", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    const prdPageId = await getSmokePageIdBySlug("tpl/initiative/planning/prd");
    await loginAsSmoke(page);
    await gotoProject(page, `n/${initiativeId}`);

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: "Initiative", exact: true }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: "Release", exact: true }),
    ).toBeVisible();

    await gotoProject(page, `n/${initiativeId}/p/${prdPageId}`);
    await expect(page.getByRole("main").getByRole("heading", { name: "PRD" })).toBeVisible();
    const content = page.getByRole("main").getByRole("textbox");
    await expect(content).toBeVisible();
    await content.click();
    await page.keyboard.type("E2E initiative lifecycle update.");
    await expect(content).toContainText("E2E initiative lifecycle update.");
  });

  test("planning features lists seeded feature", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    const featuresPageId = await getSmokePageIdBySlug(
      "tpl/initiative/planning/features",
    );
    await loginAsSmoke(page);
    await gotoProject(page, `n/${initiativeId}/p/${featuresPageId}`);

    await expect(page.getByRole("cell", { name: "Smoke feature" })).toBeVisible();
  });
});
