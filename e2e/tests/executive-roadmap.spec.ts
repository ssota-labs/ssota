import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Executive roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/roadmap");
  });

  test("shows product and planning document lists", async ({ page }) => {
    await expect(page.getByText("Planning roadmaps")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: "Product roadmap" }),
    ).toBeVisible();
    await expect(page.getByTestId("document-sheet-list")).toHaveCount(2);

    const productList = page.getByTestId("document-sheet-list").first();
    await expect(
      productList.getByRole("button", { name: "Product roadmap" }).first(),
    ).toBeVisible();
    const year = new Date().getFullYear();
    await expect(
      page.getByRole("button", { name: new RegExp(`${year} 연간 로드맵`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`${year} Q2 분기 로드맵`) }),
    ).toBeVisible();
  });

  test("hides archived product roadmap until show-archived toggle is enabled", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Product roadmap (2025 archive)" }),
    ).not.toBeVisible();

    await page.getByRole("switch", { name: "Show archived" }).click();

    await expect(
      page.getByRole("button", { name: "Product roadmap (2025 archive)" }),
    ).toBeVisible();
  });

  test("filters planning roadmaps by year", async ({ page }) => {
    const year = new Date().getFullYear();
    await expect(
      page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Year" }).click();
    await page.getByRole("option", { name: String(year - 1) }).click();

    await expect(
      page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`${year - 1} 연간 로드맵`) }),
    ).toBeVisible();
  });

  test("shows differentiated status badge colors in planning list", async ({
    page,
  }) => {
    const year = new Date().getFullYear();
    const annualRow = page.getByRole("button", { name: new RegExp(`${year} 연간 로드맵`) });
    const q1Row = page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) });
    const q2Row = page.getByRole("button", { name: new RegExp(`${year} Q2 분기 로드맵`) });

    await expect(annualRow.locator('[class*="emerald"]').first()).toBeVisible();
    await expect(q1Row.locator('[class*="muted"]').first()).toBeVisible();
    await expect(q2Row.locator('[class*="amber"]').first()).toBeVisible();
  });

  test("opens only one docked sheet when switching between lists", async ({
    page,
  }) => {
    const year = new Date().getFullYear();

    await page.getByRole("button", { name: "Product roadmap" }).first().click();
    await expect(page.getByTestId("document-sheet-panel")).toHaveCount(1);

    const panel = page.getByTestId("document-sheet-panel");
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThan(viewport!.width);
    await expect(page.getByTestId("document-sheet-resize-handle")).toBeVisible();

    await page
      .getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) })
      .click({ position: { x: 8, y: 12 } });
    await expect(page.getByTestId("document-sheet-panel")).toHaveCount(1);
    await expect(
      page.getByTestId("document-sheet-panel").getByText(`${year} Q1 분기 로드맵`),
    ).toBeVisible();
  });

  test("opens roadmap document in docked sheet panel", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();

    const panel = page.getByTestId("document-sheet-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();
    await expect(
      page.getByTestId("document-sheet-editor").getByTestId("blocknote-editor-shell"),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(panel.getByText(`${year} Q1 분기 로드맵`)).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThan(viewport!.width);
    await expect(page.getByTestId("document-sheet-resize-handle")).toBeVisible();
  });

  test("closes sheet panel with close button", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();

    await page.getByTestId("document-sheet-close").click();
    await expect(page.getByTestId("document-sheet-panel")).not.toBeVisible();
  });

  test("autosaves roadmap doc edits from sheet panel", async ({ page }) => {
    test.slow();

    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();
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
    await page.waitForTimeout(500);

    await page.reload();
    await gotoProject(page, "executive/roadmap");
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();
    const reloadedEditor = page
      .getByTestId("document-sheet-editor")
      .locator(".ProseMirror");
    await expect(reloadedEditor).toBeVisible({ timeout: 15_000 });
    await expect(reloadedEditor).toContainText(marker, { timeout: 15_000 });
  });
});
