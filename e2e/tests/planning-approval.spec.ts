import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";
import { getSmokePageIdBySlug } from "../helpers/pages-seed";

test.describe("Planning ApprovalInbox", () => {
  test("PRD approval tab approves smoke PRD", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    const prdPageId = await getSmokePageIdBySlug("tpl/initiative/planning/prd");
    await loginAsSmoke(page);
    await gotoProject(page, `n/${initiativeId}/p/${prdPageId}`);

    await page.getByRole("tab", { name: "Approval" }).click();
    const main = page.getByRole("main");
    await expect(main.getByText("Smoke PRD")).toBeVisible();
    await main.getByRole("button", { name: "승인" }).click();
    await expect(main.getByText("모두 처리됨")).toBeVisible({ timeout: 15_000 });
  });

  test("features approval tab approves smoke feature", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    const featuresPageId = await getSmokePageIdBySlug(
      "tpl/initiative/planning/features",
    );
    await loginAsSmoke(page);
    await gotoProject(page, `n/${initiativeId}/p/${featuresPageId}`);

    await page.getByRole("tab", { name: "Approval" }).click();
    const main = page.getByRole("main");
    await expect(main.getByText("Smoke feature")).toBeVisible();
    await main.getByRole("button", { name: "승인" }).click();
    await expect(main.getByText("모두 처리됨")).toBeVisible({ timeout: 15_000 });
  });
});
