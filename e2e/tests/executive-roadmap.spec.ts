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

    await expect(
      page.getByRole("button", { name: "Product roadmap" }),
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

  test("opens roadmap document in floating sheet panel", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();
    await expect(
      page.getByTestId("document-sheet-editor").getByTestId("blocknote-editor-shell"),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId("document-sheet-panel").getByText(`${year} Q1 분기 로드맵`),
    ).toBeVisible();
  });

  test("closes sheet panel with close button", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();

    await page.getByTestId("document-sheet-close").click();
    await expect(page.getByTestId("document-sheet-panel")).not.toBeVisible();
  });

  test("widens sheet panel from left resize handle", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();
    const panel = page.getByTestId("document-sheet-panel");
    await expect(panel).toBeVisible();

    const before = await panel.boundingBox();
    const handle = page.getByTestId("document-sheet-resize-handle");
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(before).not.toBeNull();
    expect(handleBox).not.toBeNull();

    const centerY = handleBox!.y + handleBox!.height / 2;
    const startX = handleBox!.x + handleBox!.width / 2;
    await page.mouse.move(startX, centerY);
    await page.mouse.down();
    await page.mouse.move(startX - 320, centerY, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await panel.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.width).toBeGreaterThanOrEqual(before!.width + 20);
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

    await page.reload();
    await gotoProject(page, "executive/roadmap");
    await page.getByRole("button", { name: new RegExp(`${year} Q1 분기 로드맵`) }).click();
    await expect(editor).toContainText(marker, { timeout: 15_000 });
  });
});
