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

  test("expands product roadmap inline editor from chevron", async ({ page }) => {
    const startTemplate = page.getByRole("button", {
      name: /Start from template|양식으로 시작/,
    });

    if (await startTemplate.isVisible()) {
      await startTemplate.click();
      await expect(page.getByTestId("product-roadmap-card")).not.toContainText(
        /Start from template|양식으로 시작/,
        { timeout: 10_000 },
      );
    }

    await page.getByTestId("product-roadmap-expand").click();
    await expect(page.getByTestId("roadmap-document-editor")).toBeVisible();
    await expect(page.getByTestId("ssota-editor-surface")).toBeVisible();

    await page.getByTestId("product-roadmap-expand-collapse").click();
    await expect(page.getByTestId("roadmap-document-editor")).not.toBeVisible();
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
    const q1Card = page.getByTestId("planning-roadmap-card-q1");
    await expect(q1Card).toBeVisible();

    const q1Header = q1Card.locator("header");
    const q1Body = q1Card
      .getByTestId("planning-roadmap-empty-q1")
      .or(q1Card.getByTestId("roadmap-document-panel"));

    await expect(q1Body.first()).not.toBeVisible();

    await q1Header.click();
    await expect(q1Body.first()).toBeVisible();

    await q1Header.click();
    await expect(q1Body.first()).not.toBeVisible();
  });

  test("enters inline edit mode for product roadmap", async ({ page }) => {
    const startTemplate = page.getByRole("button", {
      name: /Start from template|양식으로 시작/,
    });

    if (await startTemplate.isVisible()) {
      await startTemplate.click();
      await expect(page.getByTestId("product-roadmap-card")).not.toContainText(
        /Start from template|양식으로 시작/,
        { timeout: 10_000 },
      );
    }

    await page
      .getByTestId("product-roadmap-card")
      .getByTestId("roadmap-edit")
      .click();
    await expect(
      page.getByTestId("product-roadmap-card").getByTestId("roadmap-document-editor"),
    ).toBeVisible();
    await expect(
      page.getByTestId("product-roadmap-card").getByTestId("roadmap-edit-save"),
    ).toBeVisible();
    await expect(
      page.getByTestId("product-roadmap-card").getByTestId("roadmap-edit-cancel"),
    ).toBeVisible();
  });
});
