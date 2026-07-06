import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { toSkillKey } from "@ssota/core";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { resetCommunityExploreSkills } from "../helpers/skills-library";

const IMPORT_SKILL_KEY = "e2e-import-test";
const FOLDER_SKILL_PACK = join(process.cwd(), "fixtures/skill-import-pack");

const CUSTOM_TITLE = `E2E Custom Skill ${Date.now()}`;
const CUSTOM_KEY = toSkillKey(CUSTOM_TITLE);

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
    await expect(dialog.getByTestId("skill-create-key")).toHaveCount(0);

    await dialog.getByTestId("skill-create-title").fill(CUSTOM_TITLE);
    await dialog
      .getByTestId("skill-create-description")
      .fill("Playwright created skill");
    const bodyEditor = dialog
      .getByTestId("skill-create-body")
      .locator(".bn-editor");
    await expect(bodyEditor).toBeVisible({ timeout: 15_000 });
    await bodyEditor.click();
    await page.keyboard.type("Follow these steps in tests.", { delay: 20 });

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
    await expect(
      main.getByTestId(`skill-library-item-${CUSTOM_KEY}`),
    ).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test("imports skills from GitHub discover checklist", async ({ page }) => {
    await gotoProject(page, "skills");

    const main = page.getByRole("main");
    await main.getByTestId("skills-tab-library").click();

    await page.route("**/api/skills/discover/github*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          skills: [
            {
              skillPath: "skills/e2e-github-mock/SKILL.md",
              frontmatterName: "e2e-github-mock",
              description: "Mock discovered GitHub skill",
              suggestedKey: "e2e-github-mock",
              displayName: "E2e Github Mock",
              libraryStatus: "new",
              resolvedKey: "e2e-github-mock",
            },
          ],
          skippedCount: 0,
        }),
      });
    });

    await page.route("**/api/skills/import", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              ok: true,
              skillPath: "skills/e2e-github-mock/SKILL.md",
              skill: {
                id: "00000000-0000-4000-8000-000000000101",
                organizationId: "00000000-0000-4000-8000-000000000001",
                key: "e2e-github-mock",
                name: "E2e Github Mock",
                description: "Mock discovered GitHub skill",
                source: "custom",
                externalId: null,
                contentHash: "abc",
                metadata: { kind: "custom" },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
          ],
        }),
      });
    });

    await main.getByTestId("skills-add-button").click();
    await page.getByTestId("skills-add-github").click();

    const dialog = page.getByTestId("skill-import-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("skill-import-tab-github")).toBeVisible();

    await dialog.getByTestId("skill-import-repo").fill("owner/mock-repo");
    await dialog.getByTestId("skill-import-discover-github").click();

    await expect(dialog.getByTestId("skill-import-results")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      dialog.getByTestId("skill-import-row-e2e-github-mock"),
    ).toBeVisible();

    await dialog.getByTestId("skill-import-submit").click();

    await expect(
      main.getByTestId("skill-library-item-e2e-github-mock"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("imports skill from folder discover checklist", async ({ page }) => {
    await gotoProject(page, "skills");

    const main = page.getByRole("main");
    await main.getByTestId("skills-tab-library").click();
    await main.getByTestId("skills-add-button").click();
    await page.getByTestId("skills-add-folder").click();

    const dialog = page.getByTestId("skill-import-dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByTestId("skill-import-tab-folder").click();

    await dialog
      .getByTestId("skill-import-folder-input")
      .setInputFiles(FOLDER_SKILL_PACK);

    await expect(dialog.getByTestId("skill-import-results")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      dialog.getByTestId(`skill-import-row-${IMPORT_SKILL_KEY}`),
    ).toBeVisible();

    await dialog.getByTestId("skill-import-submit").click();

    const sheet = page.getByTestId("skill-detail-sheet");
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    await expect(
      main.getByTestId(`skill-library-item-${IMPORT_SKILL_KEY}`),
    ).toBeVisible({ timeout: 10_000 });

    await sheet.getByTestId("skill-remove-from-library").click();
    await expect(
      main.getByTestId(`skill-library-item-${IMPORT_SKILL_KEY}`),
    ).toHaveCount(0, { timeout: 10_000 });
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
