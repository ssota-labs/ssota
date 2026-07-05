import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

test.describe("workers-ui", () => {
  test("workers page shows sync create sheet and detail", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "workers");

    const workspace = page.getByTestId("workers-workspace");
    await expect(workspace).toBeVisible();
    await expect(page.getByRole("heading", { name: "Workers", exact: true })).toBeVisible();

    await page.getByTestId("workers-create-sync").click();
    await expect(page.getByTestId("workers-create-sheet")).toBeVisible();
    await expect(page.getByTestId("workers-create-form")).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/workers-browse-empty.png`,
      fullPage: true,
    });

    const key = `e2e-sync-${Date.now()}`;
    await page.getByTestId("worker-create-key").fill(key);
    await page.getByTestId("worker-create-name").fill("E2E Sync");
    await page.getByTestId("worker-create-submit").click();

    const card = page.getByTestId(`worker-card-${key}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId(`worker-detail-${key}`)).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/workers-detail-sync.png`,
      fullPage: true,
    });
  });

  test("legacy /tools URL redirects to workers", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tools");
    await expect(page.getByTestId("workers-workspace")).toBeVisible();
  });
});
