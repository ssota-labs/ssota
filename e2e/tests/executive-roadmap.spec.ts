import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Executive roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/roadmap");
  });

  test("shows product roadmap and creates planning roadmaps from preview", async ({
    page,
  }) => {
    await expect(page.getByTestId("product-roadmap-card")).toBeVisible();
    await expect(page.getByTestId("planning-roadmaps-section")).toBeVisible();
    await expect(page.getByTestId("planning-roadmap-detail")).toBeVisible();

    const year = new Date().getFullYear();
    await expect(page.getByTestId("planning-year-select")).toContainText(String(year));

    const createAnnual = page.getByTestId("planning-roadmap-create");

    if (await createAnnual.isVisible()) {
      await createAnnual.click();
      await expect(createAnnual).not.toBeVisible({ timeout: 10_000 });
    }

    await page.getByTestId("planning-period-select").click();
    await page.getByRole("option", { name: "Q1" }).click();

    const createQuarter = page.getByTestId("planning-roadmap-create");
    if (await createQuarter.isVisible()) {
      await createQuarter.click();
      await expect(createQuarter).not.toBeVisible({ timeout: 10_000 });
    }

    await expect(page.getByTestId("planning-roadmap-detail")).toContainText(/Q1/);
  });

  test("opens product roadmap full view sheet", async ({ page }) => {
    const startTemplate = page.getByRole("button", {
      name: /Notion template|Notion 양식/,
    });

    if (await startTemplate.isVisible()) {
      await startTemplate.click();
      await expect(page.getByTestId("product-roadmap-card")).not.toContainText(
        /Notion template|Notion 양식/,
        { timeout: 10_000 },
      );
    }

    await page.getByTestId("product-roadmap-view-full").click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/문서 정보/);
  });

  test("creates quarter roadmap from empty preview", async ({ page }) => {
    test.slow();

    await page.getByTestId("planning-period-select").click();
    await page.getByRole("option", { name: "Q3" }).click();

    const createButton = page.getByTestId("planning-roadmap-create");
    if (!(await createButton.isVisible())) {
      test.skip(true, "Q3 roadmap already exists in seed data");
    }

    await createButton.click();

    await expect(createButton).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("planning-roadmap-detail")).toContainText(/Q3/);
  });
});
