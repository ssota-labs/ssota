import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("design studio", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("ui-components list shows demo components and opens editor", async ({
    page,
  }) => {
    await gotoProject(page, "design/ui-components");
    await expect(page.getByText("Demo Button (demo-button)")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "New component" })).toBeVisible();

    await page
      .getByRole("row", { name: /Demo Button \(demo-button\)/ })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/design/ui-components/[0-9a-f-]+$`),
      { timeout: 15_000 },
    );
    await expect(page.getByRole("heading", { name: "Demo Button" })).toBeVisible();
    await expect(page.getByText("Layers")).toBeVisible();
    await expect(page.getByText("Inspector")).toBeVisible();
    await expect(page.getByRole("button", { name: "Deploy" })).toBeVisible();
  });

  test("editor updates className and saves draft", async ({ page }) => {
    await gotoProject(page, "design/ui-components");
    await page
      .getByRole("row", { name: /Demo Button \(demo-button\)/ })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/design/ui-components/[0-9a-f-]+$`),
      { timeout: 15_000 },
    );
    await expect(page.getByText("Inspector")).toBeVisible();

    const classField = page.getByLabel("className");
    await classField.fill("rounded-full px-6 py-3 bg-blue-600 text-white");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.reload();
    await expect(classField).toHaveValue("rounded-full px-6 py-3 bg-blue-600 text-white");
  });

  test("wireframes page lists only published components", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await gotoProject(page, `initiatives/${initiativeId}/design/wireframes`);
    await expect(page.getByText("Published UI components")).toBeVisible();
    await expect(page.getByText("Demo Button")).toBeVisible();
    await expect(page.getByText("Demo Card")).toBeVisible();
  });
});
