import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Evergreen documents", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "development/data-model");
  });

  test("edits and saves data model document", async ({ page }) => {
    const content = page.getByRole("textbox", { name: "Content" });
    await expect(content).toBeVisible();

    await content.fill("# E2E data model\n\nUpdated by evergreen-doc spec.");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(content).toHaveValue(/Updated by evergreen-doc spec\./, {
      timeout: 10_000,
    });
  });
});
