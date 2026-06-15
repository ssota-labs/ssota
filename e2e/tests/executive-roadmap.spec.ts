import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Executive roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/roadmap");
  });

  test("shows product roadmap card and creates annual roadmap with Q1 chip", async ({
    page,
  }) => {
    await expect(page.getByTestId("product-roadmap-card")).toBeVisible();
    await expect(page.getByTestId("planning-roadmaps-section")).toBeVisible();
    await expect(page.getByTestId("planning-year-card")).toBeVisible();

    const year = new Date().getFullYear();
    const yearCard = page.getByTestId("planning-year-card");
    const annualCard = yearCard.getByTestId("annual-roadmap-card");
    const createAnnualInCard = annualCard.getByRole("button", {
      name: /Annual roadmap|연간 로드맵/,
    });

    if (await createAnnualInCard.isVisible()) {
      await createAnnualInCard.click();
      await expect(annualCard).toContainText(String(year), { timeout: 10_000 });
    } else {
      await expect(annualCard).toContainText(String(year));
    }

    const q1Chip = page.getByTestId("quarter-chip-q1");
    await q1Chip.click();

    await expect(page.getByTestId("planning-roadmap-detail")).toBeVisible({
      timeout: 10_000,
    });
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

  test("quarter create chip creates roadmap and opens detail panel", async ({
    page,
  }) => {
    test.slow();

    await expect(page.getByTestId("planning-year-card")).toBeVisible();

    const quarterChip = page.getByTestId("quarter-chip-q3");
    const createLabel = quarterChip.getByText(/Create|생성/);

    if (!(await createLabel.isVisible())) {
      test.skip(true, "Q3 roadmap already exists in seed data");
    }

    await page.waitForTimeout(800);
    await quarterChip.click();

    await expect(page.getByTestId("planning-roadmap-detail")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("planning-roadmap-detail")).toContainText(/Q3/);
    await expect(quarterChip).not.toContainText(/Create|생성/);
    await page.waitForTimeout(1200);
  });
});
