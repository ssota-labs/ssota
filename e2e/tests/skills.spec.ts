import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

const CUSTOM_KEY = `e2e-skill-${Date.now()}`;

test.describe("Skills", () => {
  test("sidebar nav link reaches skills page", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");

    await page.getByRole("link", { name: /^Skills$|^스킬$/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/skills$`),
    );
    await expect(
      page.getByRole("heading", { name: "Skills", exact: true }),
    ).toBeVisible();
  });

  test("lists platform builtins and creates custom skill", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "skills");

    const main = page.getByRole("main");
    await expect(main.getByTestId("skills-workspace")).toBeVisible();
    await expect(main.getByTestId("skill-catalog-item-supabase")).toBeVisible({
      timeout: 15_000,
    });

    await main.getByTestId("skills-create-button").click();
    const dialog = page.getByTestId("skill-create-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByTestId("skill-create-key").fill(CUSTOM_KEY);
    await dialog.getByTestId("skill-create-name").fill("E2E Custom Skill");
    await dialog
      .getByTestId("skill-create-description")
      .fill("Playwright created skill");
    await dialog
      .getByTestId("skill-create-body")
      .fill("# E2E skill\n\nFollow these steps in tests.");

    await dialog.getByTestId("skill-create-submit").click();

    const sheet = page.getByTestId("skill-detail-sheet");
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(
      sheet.getByTestId("skill-detail-body").getByText("Follow these steps in tests."),
    ).toBeVisible();

    await expect(
      page.getByTestId(`skill-catalog-item-${CUSTOM_KEY}`),
    ).toBeVisible({ timeout: 10_000 });

    await sheet.getByTestId("skill-delete-button").click();
    await expect(main.getByTestId(`skill-catalog-item-${CUSTOM_KEY}`)).toHaveCount(
      0,
      { timeout: 10_000 },
    );
  });
});
