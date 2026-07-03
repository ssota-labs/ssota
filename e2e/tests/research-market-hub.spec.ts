import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Research market hub", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "research/market");
  });

  test("shows Studies, Competitors, Segments, and Sources tabs", async ({
    page,
  }) => {
    await expect(page.getByTestId("document-sheet-list")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Studies" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Competitors" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Segments" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sources" })).toBeVisible();
  });

  test("Studies tab opens competitive landscape document sheet", async ({
    page,
  }) => {
    await expect(page.getByTestId("document-sheet-list")).toBeVisible();
    await expect(
      page.getByText("Competitive landscape — dev workflow tools"),
    ).toBeVisible();

    await page
      .locator('[data-testid^="document-sheet-list-item-"]')
      .filter({ hasText: "Competitive landscape — dev workflow tools" })
      .click();

    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByText("Key competitors")).toBeVisible();
  });

  test("Competitors tab selects Notion and shows BlockNote editor", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Competitors" }).click();
    await expect(page.getByRole("heading", { name: "Competitors" })).toBeVisible();
    await page.getByRole("button", { name: "Notion" }).click();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Strengths", { exact: false })).toBeVisible();
  });

  test("Segments tab selects TAM row and shows BlockNote editor", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Segments" }).click();
    await expect(page.getByRole("heading", { name: "Segments" })).toBeVisible();
    await page.getByRole("button", { name: "Product eng teams 5–50" }).click();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("graph-native research", { exact: false }),
    ).toBeVisible();
  });

  test("Sources tab shows YouTube embed and takeaway editor", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Sources" }).click();
    await page
      .getByRole("button", { name: "Dev workflow tools landscape (YouTube)" })
      .click();
    await expect(page.getByTestId("media-embed-youtube")).toBeVisible();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Key points from video", { exact: false }),
    ).toBeVisible();
  });
});
