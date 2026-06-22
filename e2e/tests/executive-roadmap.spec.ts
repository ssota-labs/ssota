import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Executive roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/roadmap");
  });

  test("shows product and planning roadmap sections", async ({ page }) => {
    await expect(page.getByTestId("dynamic-page-renderer")).toBeVisible();
    await expect(page.getByTestId("roadmap-sheet-workspace")).toBeVisible();
    await expect(page.getByTestId("product-roadmap-section")).toBeVisible();
    await expect(page.getByTestId("planning-roadmaps-section")).toBeVisible();
    await expect(page.getByTestId("product-roadmap-card")).toBeVisible();
    await expect(page.getByTestId("planning-roadmap-card-group")).toBeVisible();
    await expect(page.getByTestId("planning-year-select")).toBeVisible();

    const year = new Date().getFullYear();
    await expect(page.getByTestId("planning-roadmap-card-annual")).toBeVisible();
    await expect(page.getByTestId("planning-roadmap-card-q1")).toBeVisible();
    await expect(page.getByTestId("planning-roadmap-card-q1")).toContainText("Q1");
    await expect(page.getByTestId("planning-roadmap-card-annual")).toContainText("Annual");
  });

  test("shows differentiated status badge colors", async ({ page }) => {
    await expect(page.getByTestId("product-roadmap-card")).toContainText("active");
    await expect(page.getByTestId("planning-roadmap-card-q1")).toContainText("draft");
    await expect(page.getByTestId("planning-roadmap-card-q2")).toContainText("review");

    const activeBadge = page
      .getByTestId("planning-roadmap-card-annual")
      .locator('[class*="emerald"]');
    const draftBadge = page
      .getByTestId("planning-roadmap-card-q1")
      .locator('[class*="muted"]');
    const reviewBadge = page
      .getByTestId("planning-roadmap-card-q2")
      .locator('[class*="amber"]');

    await expect(activeBadge.first()).toBeVisible();
    await expect(draftBadge.first()).toBeVisible();
    await expect(reviewBadge.first()).toBeVisible();
  });

  test("opens roadmap document in floating sheet panel", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByTestId("planning-roadmap-card-q1").click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("DocumentSheetList catalog component"),
    ).toBeVisible();
    await expect(
      page.getByTestId("document-sheet-panel").getByText(`${year} Q1 분기 로드맵`),
    ).toBeVisible();
  });

  test("closes sheet panel with close button", async ({ page }) => {
    await page.getByTestId("planning-roadmap-card-q1").click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();

    await page.getByTestId("document-sheet-close").click();
    await expect(page.getByTestId("document-sheet-panel")).not.toBeVisible();
  });

  test("autosaves roadmap doc edits from sheet panel", async ({ page }) => {
    test.slow();

    await page.getByTestId("planning-roadmap-card-q1").click();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();

    const editor = page
      .getByTestId("document-sheet-editor")
      .locator(".ProseMirror");
    await expect(editor).toBeVisible({ timeout: 15_000 });

    const marker = `roadmap-autosave-${Date.now()}`;
    const saveResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
      { timeout: 20_000 },
    );
    await editor.click();
    await editor.press("End");
    await editor.type(` ${marker}`);
    await saveResponse;

    await page.reload();
    await gotoProject(page, "executive/roadmap");
    await page.getByTestId("planning-roadmap-card-q1").click();
    await expect(editor).toContainText(marker, { timeout: 15_000 });
  });
});
