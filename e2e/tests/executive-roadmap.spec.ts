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

    const year = new Date().getFullYear();
    await expect(page.getByTestId("planning-year-select")).toContainText(String(year));

    await expect(page.getByTestId("planning-roadmap-card-annual")).toBeVisible();
    await expect(page.getByTestId("planning-roadmap-card-q1")).toBeVisible();
    await expect(page.getByTestId("planning-roadmap-card-q4")).toBeVisible();

    const createAnnual = page.getByTestId("planning-roadmap-create-annual");

    if (await createAnnual.isVisible()) {
      await createAnnual.click();
      await expect(createAnnual).not.toBeVisible({ timeout: 10_000 });
    }

    const createQuarter = page.getByTestId("planning-roadmap-create-q1");
    if (await createQuarter.isVisible()) {
      await createQuarter.click();
      await expect(createQuarter).not.toBeVisible({ timeout: 10_000 });
    }

    await expect(
      page.getByTestId("planning-roadmap-card-q1"),
    ).toContainText(/Q1/);
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

    const createButton = page.getByTestId("planning-roadmap-create-q3");
    if (!(await createButton.isVisible())) {
      test.skip(true, "Q3 roadmap already exists in seed data");
    }

    await createButton.click();

    await expect(createButton).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("planning-roadmap-card-q3")).toContainText(/Q3/);
  });

  test("collapses and expands planning roadmap accordions from header", async ({
    page,
  }) => {
    const q1Trigger = page.getByRole("button", {
      name: /2026 Q1 분기 로드맵|Q1 quarter roadmap/i,
    });

    await expect(q1Trigger).toHaveAttribute("aria-expanded", "false");

    await q1Trigger.click();
    await expect(q1Trigger).toHaveAttribute("aria-expanded", "true");

    await q1Trigger.click();
    await expect(q1Trigger).toHaveAttribute("aria-expanded", "false");
  });
});
