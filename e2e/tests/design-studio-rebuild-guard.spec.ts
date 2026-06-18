import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("design studio rebuild guard", () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("className-only inspector edits do not call /api/studio/build", async ({
    page,
  }) => {
    const buildRequests: string[] = [];
    const utilityRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/studio/build")) {
        buildRequests.push(url);
      }
      if (url.includes("/api/studio/preview-utilities")) {
        utilityRequests.push(url);
      }
    });

    await gotoProject(page, "design/ui-components");
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("studio-mode-inspect")).toBeEnabled({
      timeout: 60_000,
    });

    const preview = page.frameLocator('iframe[title="Design preview"]');
    await expect(preview.locator("[data-studio-id]").first()).toBeVisible({
      timeout: 60_000,
    });

    await preview.locator("button").first().click();
    await expect(page.getByRole("textbox", { name: "Background" })).toBeVisible({
      timeout: 10_000,
    });

    const buildBeforeEdit = buildRequests.length;

    const backgroundField = page.getByRole("textbox", { name: "Background" });
    await backgroundField.clear();
    await backgroundField.fill("blue-600");
    await page.waitForTimeout(800);

    expect(buildRequests.length).toBe(buildBeforeEdit);

    expect(utilityRequests.length).toBeGreaterThan(0);
  });
});
