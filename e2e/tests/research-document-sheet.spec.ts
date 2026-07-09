import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Research document sheet", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("market research opens document in floating sheet", async ({ page }) => {
    await gotoProject(page, "research/market");

    await expect(page.getByTestId("document-sheet-list")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Competitive landscape — dev workflow tools")).toBeVisible();

    await page
      .locator('[data-testid^="document-sheet-list-item-"]')
      .filter({ hasText: "Competitive landscape — dev workflow tools" })
      .click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Key competitors")).toBeVisible();
  });

  test("user research opens document in floating sheet", async ({ page }) => {
    await gotoProject(page, "research/user");

    await expect(page.getByTestId("document-sheet-list")).toBeVisible();
    await page
      .locator('[data-testid^="document-sheet-list-item-"]')
      .filter({ hasText: "Onboarding interviews (smoke cohort)" })
      .click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByText("Findings")).toBeVisible();
  });

  test("hypotheses board shows smoke card; Docs tab opens sheet", async ({
    page,
  }) => {
    await gotoProject(page, "research/hypotheses");

    await expect(page.getByRole("tab", { name: "Board" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Smoke hypothesis").first()).toBeVisible();

    await page.getByRole("tab", { name: "Docs" }).click();
    await expect(page.getByTestId("document-sheet-list")).toBeVisible();
    await page
      .locator('[data-testid^="document-sheet-list-item-"]')
      .filter({ hasText: "Smoke hypothesis" })
      .click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(
      page.getByTestId("document-sheet-editor").getByText(
        "If research pages use DocumentCardListSheet",
        { exact: false },
      ),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("closes sheet panel with close button", async ({ page }) => {
    await gotoProject(page, "research/market");
    await expect(page.getByTestId("document-sheet-list")).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('[data-testid^="document-sheet-list-item-"]').first().click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();

    await page.getByTestId("document-sheet-close").click();
    await expect(page.getByTestId("document-sheet-panel")).not.toBeVisible();
  });

  test("closes sheet panel when clicking outside", async ({ page }) => {
    await gotoProject(page, "research/market");
    await expect(page.getByTestId("document-sheet-list").first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('[data-testid^="document-sheet-list-item-"]').first().click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();

    await page.getByRole("tab", { name: "Competitors" }).click();
    await expect(page.getByTestId("document-sheet-panel")).not.toBeVisible();
  });
});
