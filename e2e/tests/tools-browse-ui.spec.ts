import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

test.describe("tools-browse-ui", () => {
  test("tools page shows browse template cards", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tools");

    const workspace = page.getByTestId("templates-workspace");
    await expect(workspace).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();

    const softwareDevCard = page.getByTestId("template-card-software-development");
    await expect(softwareDevCard).toBeVisible();
    await expect(softwareDevCard.getByText("Software Development")).toBeVisible();
    await expect(softwareDevCard.getByText("Full SDLC workspace")).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/tools-browse-cards.png`,
      fullPage: true,
    });
  });
});
