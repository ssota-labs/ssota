import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("design studio", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("ui-components opens studio with component browser", async ({ page }) => {
    await gotoProject(page, "design/ui-components");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/design/ui-components/[0-9a-f-]+$`),
      { timeout: 15_000 },
    );
    await expect(page.getByTestId("design-studio-shell")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Components" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Layers" })).toBeVisible();
    await expect(page.getByTestId("studio-component-demo-button")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Button" })).toBeVisible();
    await expect(page.getByLabel("Node ID")).toBeVisible();
    await expect(page.getByRole("button", { name: "Deploy" })).toBeVisible();
  });

  test("component browser switches components and layers tab works", async ({
    page,
  }) => {
    await gotoProject(page, "design/ui-components");
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("studio-component-demo-card").click();
    await expect(page).toHaveURL(
      /\/design\/ui-components\/[0-9a-f-]+$/,
      { timeout: 15_000 },
    );
    await expect(page.getByRole("heading", { name: "Demo Card" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("tab", { name: "Layers" }).click();
    await expect(page.getByText("<div>")).toBeVisible();
  });

  test("editor updates styles via inspector controls", async ({ page }) => {
    await gotoProject(page, "design/ui-components");
    await expect(page.getByRole("heading", { name: "Demo Button" })).toBeVisible({
      timeout: 15_000,
    });

    const backgroundField = page.getByLabel("Background");
    await backgroundField.clear();
    await backgroundField.fill("blue-600");
    await expect(backgroundField).toHaveValue("blue-600");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Demo Button" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Background")).toHaveValue("blue-600");
  });

  test("wireframes page lists only published components", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await gotoProject(page, `initiatives/${initiativeId}/design/wireframes`);
    await expect(page.getByText("Published UI components")).toBeVisible();
    await expect(page.getByText("Demo Button")).toBeVisible();
    await expect(page.getByText("Demo Card")).toBeVisible();
  });

  test("inspect mode selects nodes from preview iframe", async ({ page }) => {
    await gotoProject(page, "design/ui-components");
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("studio-mode-inspect")).toBeVisible();

    const preview = page.frameLocator('iframe[title="Design preview"]');
    await expect(preview.locator('[data-studio-id="root"]')).toBeVisible({
      timeout: 15_000,
    });

    await preview.locator('[data-studio-id="label"]').click();
    await expect(page.getByLabel("Text")).toHaveValue("Button");
    await expect(page.getByLabel("Node ID")).toHaveValue("label");
  });

  test("preview toolbar switches interaction mode", async ({ page }) => {
    await gotoProject(page, "design/ui-components");
    await expect(page.getByTestId("studio-mode-preview")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("studio-mode-preview").click();
    await expect(
      page.getByText("Live preview — selection disabled"),
    ).toBeVisible();
  });
});
