import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

test.describe("Research market hub — visual captures (seeded)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "research/market");
    await expect(page.getByTestId("document-sheet-list")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("capture Studies, Competitors, Segments, Sources with seed data", async ({
    page,
  }) => {
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-01-studies-tabs.png`,
      fullPage: true,
    });

    await page
      .locator('[data-testid^="document-sheet-list-item-"]')
      .filter({ hasText: "Competitive landscape — dev workflow tools" })
      .click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByText("Key competitors")).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-02-studies-sheet.png`,
      fullPage: true,
    });
    await page.getByTestId("document-sheet-close").click();

    await page.getByRole("tab", { name: "Competitors" }).click();
    await expect(page.getByRole("heading", { name: "Competitors" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Linear" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cursor" })).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-03-competitors-list.png`,
      fullPage: true,
    });

    await page.getByRole("button", { name: "Notion" }).click();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-04-competitors-notion-detail.png`,
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Segments" }).click();
    await expect(
      page.getByRole("button", { name: "Product eng teams 5–50" }),
    ).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-05-segments-list.png`,
      fullPage: true,
    });

    await page.getByRole("button", { name: "Product eng teams 5–50" }).click();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-06-segments-detail.png`,
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Sources" }).click();
    await expect(
      page.getByRole("button", {
        name: "Dev workflow tools landscape (YouTube)",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-07-sources-list.png`,
      fullPage: true,
    });

    await page
      .getByRole("button", { name: "Dev workflow tools landscape (YouTube)" })
      .click();
    await expect(page.getByTestId("node-detail-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("media-embed-youtube")).toBeVisible();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/research-market-08-sources-youtube-detail.png`,
      fullPage: true,
    });
  });
});
