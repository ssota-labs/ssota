import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { resetSmokeApprovalFixtures } from "../helpers/graph-seed";
import { getSmokePageIdBySlug } from "../helpers/pages-seed";

test.describe("Manager approvals inbox", () => {
  test.beforeAll(async () => {
    await resetSmokeApprovalFixtures();
  });

  test("teamspace approvals page shows pending smoke PRD", async ({ page }) => {
    const pageId = await getSmokePageIdBySlug("manager/approvals");
    await loginAsSmoke(page);
    await gotoProject(page, `p/${pageId}`);

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/p/${pageId}$`),
    );
    await expect(page.getByRole("tab", { name: "PRD" })).toBeVisible();
    await expect(page.getByText("Smoke PRD")).toBeVisible();
  });
});
