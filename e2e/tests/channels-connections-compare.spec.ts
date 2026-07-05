import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

test.describe("channels-connections-compare", () => {
  test.setTimeout(60_000);

  test("connections: notion scope + detail sheets", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "connections");

    const notion = page.getByTestId("connector-notion");
    await expect(notion).toBeVisible();
    await notion.click();

    await expect(page.getByTestId("scope-user")).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/connections-notion-sheet-scope.png`,
      fullPage: true,
    });

    await page.getByTestId("scope-user").click();
    await expect(page.getByTestId("connection-row").first()).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/connections-notion-sheet-detail.png`,
      fullPage: true,
    });
  });

  test("connections: slack org scope detail", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "connections");

    await page.getByTestId("connector-slack").click();
    await page.getByTestId("scope-org").click();
    await expect(page.getByTestId("connection-row").first()).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/connections-slack-sheet-detail.png`,
      fullPage: true,
    });
  });
});
