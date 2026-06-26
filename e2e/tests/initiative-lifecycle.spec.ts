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

    await expect(page.getByRole("main").getByText("Smoke initiative")).toBeVisible();
    await expect(page.getByText("Release", { exact: true })).toBeVisible();
    await expect(page.getByText("v0.0.0-smoke")).toBeVisible();

    await gotoProject(page, `n/${initiativeId}/p/${prdPageId}`);
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
    const featuresPageId = await getSmokePageIdBySlug(
      "tpl/initiative/planning/features",
    );
    await loginAsSmoke(page);
    await gotoProject(page, `n/${initiativeId}/p/${featuresPageId}`);

    await expect(page.getByRole("cell", { name: "Smoke feature" })).toBeVisible();
  });
});
