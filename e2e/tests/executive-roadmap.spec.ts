import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Executive roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/roadmap");
  });

  test("shows planning roadmaps with DocumentSheetList", async ({ page }) => {
    await expect(page.getByTestId("dynamic-page-renderer")).toBeVisible();
    await expect(page.getByTestId("document-sheet-list")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Planning roadmaps" })).toBeVisible();

    const year = new Date().getFullYear();
    await expect(page.getByText(`${year} 연간 로드맵`)).toBeVisible();
    await expect(page.getByText(`${year} Q1 분기 로드맵`)).toBeVisible();
  });

  test("opens roadmap document in floating sheet panel", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기`) }).click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("DocumentSheetList catalog component"),
    ).toBeVisible();
    await expect(page.getByText(`${year} 연간 로드맵`)).toBeVisible();
  });

  test("closes sheet panel with close button", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기`) }).click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();

    await page.getByTestId("document-sheet-close").click();
    await expect(page.getByTestId("document-sheet-panel")).not.toBeVisible();
  });

  test("autosaves roadmap doc edits from sheet panel", async ({ page }) => {
    test.slow();

    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기`) }).click();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();

    const editor = page
      .getByTestId("document-sheet-editor")
      .locator(".ProseMirror");
    await expect(editor).toBeVisible({ timeout: 15_000 });

    const marker = `roadmap-autosave-${Date.now()}`;
    await editor.click();
    await editor.press("End");
    await editor.type(` ${marker}`);

    await page.reload();
    await gotoProject(page, "executive/roadmap");
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기`) }).click();
    await expect(editor).toContainText(marker, { timeout: 15_000 });
  });
});
