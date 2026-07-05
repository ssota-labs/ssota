import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { resetCommunityExploreSkills } from "../helpers/skills-library";

const CUSTOM_KEY = `e2e-skill-${Date.now()}`;

test.describe("Skills", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await resetCommunityExploreSkills(page);
  });

  test("sidebar nav link reaches skills page", async ({ page }) => {
    await gotoProject(page, "overview");

    await page.getByRole("link", { name: /^Agents$|^에이전트$/i }).click();
    await page.getByRole("link", { name: /^Skills$|^스킬$/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/skills$`),
    );
    await expect(
      page.getByRole("heading", { name: "Skills", exact: true }),
    ).toBeVisible();
  });

  test("explore and library tabs hide platform builtins", async ({ page }) => {
    await gotoProject(page, "skills");

    const main = page.getByRole("main");
    await expect(main.getByTestId("skills-workspace")).toBeVisible();
    await expect(main.getByTestId("skills-tab-explore")).toBeVisible();
    await expect(main.getByTestId("skills-tab-library")).toBeVisible();

    await main.getByTestId("skills-tab-explore").click();
    await expect(
      main.getByTestId("skill-catalog-item-supabase"),
    ).toHaveCount(0);
    await expect(
      main.getByTestId("skill-catalog-item-frontend-design"),
    ).toBeVisible({ timeout: 15_000 });

    await main.getByTestId("skills-tab-library").click();
    await expect(
      main.getByTestId("skill-library-item-supabase"),
    ).toHaveCount(0);
  });

  test("creates custom skill in library", async ({ page }) => {
    await gotoProject(page, "skills");

    const main = page.getByRole("main");
    await main.getByTestId("skills-tab-library").click();
    await main.getByTestId("skills-add-button").click();
    await page.getByTestId("skills-add-custom").click();

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
      main.getByTestId(`skill-library-item-${CUSTOM_KEY}`),
    ).toBeVisible({ timeout: 10_000 });

    await sheet.getByTestId("skill-remove-from-library").click();
    await expect(main.getByTestId(`skill-library-item-${CUSTOM_KEY}`)).toHaveCount(
      0,
      { timeout: 10_000 },
    );
  });

  test("saves explore skill to library", async ({ page }) => {
    await gotoProject(page, "skills");

    const main = page.getByRole("main");
    await main.getByTestId("skills-tab-explore").click();
    const saveButton = main.getByTestId("skill-save-frontend-design");
    await expect(saveButton).toBeVisible({ timeout: 15_000 });
    await saveButton.click();

    await expect(
      main.getByTestId("skill-library-item-frontend-design"),
    ).toBeVisible({ timeout: 10_000 });

    const sheet = page.getByTestId("skill-detail-sheet");
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await sheet.getByTestId("skill-remove-from-library").click();
    await expect(
      main.getByTestId("skill-library-item-frontend-design"),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
