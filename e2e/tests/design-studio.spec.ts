import { test, expect, type Page } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

async function openDesignStudio(page: Page) {
  await gotoProject(page, "design/ui-components");
  await expect(page).toHaveURL(/\/design\/ui-components\/[0-9a-f-]+$/, {
    timeout: 15_000,
  });
  await expect(page.getByTestId("design-studio-shell")).toBeVisible({
    timeout: 15_000,
  });
}

async function waitForBundlePreview(page: Page) {
  await expect(page.getByTestId("studio-mode-inspect")).toBeEnabled({
    timeout: 60_000,
  });
  const preview = page.frameLocator('iframe[title="Design preview"]');
  await expect(preview.locator("[data-studio-id]").first()).toBeVisible({
    timeout: 60_000,
  });
  return preview;
}

async function openDesignStudioWithPreview(page: Page) {
  await openDesignStudio(page);
  return waitForBundlePreview(page);
}

test.describe("design studio", () => {
  test.describe.configure({ timeout: 180_000, retries: 1 });
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("ui-components opens studio with component browser", async ({ page }) => {
    await openDesignStudio(page);
    await expect(page.getByRole("tab", { name: "Components" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Layers" })).toBeVisible();
    await expect(page.getByTestId("studio-component-demo-button")).toBeVisible();
    await expect(
      page.getByText(
        "Select a layer in the preview or layers panel to edit styles.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Deploy" })).toBeVisible();
  });

  test("preview toolbar switches interaction mode", async ({ page }) => {
    await openDesignStudioWithPreview(page);
    await page.getByTestId("studio-mode-preview").click();
    await expect(
      page.getByText("Live preview — selection disabled"),
    ).toBeVisible();
  });

  test("component browser switches components and layers tab works", async ({
    page,
  }) => {
    await openDesignStudio(page);

    await page.getByTestId("studio-component-demo-card").click();
    await expect(page).toHaveURL(/\/design\/ui-components\/[0-9a-f-]+$/, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("studio-component-demo-card")).toHaveClass(
      /bg-muted/,
      { timeout: 15_000 },
    );

    const preview = await waitForBundlePreview(page);
    await expect(preview.locator(".rounded-lg.border").first()).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("tab", { name: "Layers" }).click();
    const layersPanel = page
      .locator('[role="tabpanel"]')
      .filter({ hasText: "Component.tsx" });
    await expect(layersPanel.getByText("Component.tsx")).toBeVisible({
      timeout: 15_000,
    });
    await expect(layersPanel.getByText("<div>")).toBeVisible({ timeout: 15_000 });
    await expect(layersPanel.getByText("<Button>")).toBeVisible();
  });

  test("inspect mode selects nodes from preview iframe", async ({ page }) => {
    const preview = await openDesignStudioWithPreview(page);

    await preview.locator("button").first().click();
    await expect(page.getByLabel("Node ID")).not.toHaveValue("", {
      timeout: 10_000,
    });
    await expect(page.getByRole("textbox", { name: "Background" })).toBeVisible();
  });

  test("inspect mode resolves semantic border color", async ({ page }) => {
    const preview = await openDesignStudioWithPreview(page);
    await preview.locator("[data-studio-id]").first().click();
    await expect(page.getByLabel("Node ID")).not.toHaveValue("", {
      timeout: 10_000,
    });

    const borderColorField = page.getByRole("textbox", { name: "Border color" });
    await expect(borderColorField).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Border color presets").click();
    await page.getByRole("button", { name: "primary", exact: true }).click();
    await expect(borderColorField).toHaveValue("primary");

    await page.getByLabel("Border color swatch").click();
    const colorPicker = page.getByLabel("Border color picker");
    await expect(colorPicker).toBeVisible({ timeout: 10_000 });
    const pickerValue = await colorPicker.inputValue();
    expect(pickerValue.toLowerCase()).not.toBe("#000000");
  });

  test("inspect mode resolves palette border color in picker", async ({
    page,
  }) => {
    const preview = await openDesignStudioWithPreview(page);
    await preview.locator("[data-studio-id]").first().click();
    await expect(page.getByLabel("Node ID")).not.toHaveValue("", {
      timeout: 10_000,
    });

    const borderColorField = page.getByRole("textbox", { name: "Border color" });
    await expect(borderColorField).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Border color presets").click();
    await page.getByRole("button", { name: "blue-500", exact: true }).click();
    await expect(borderColorField).toHaveValue("blue-500");

    await page.getByLabel("Border color swatch").click();
    const colorPicker = page.getByLabel("Border color picker");
    await expect(colorPicker).toBeVisible({ timeout: 10_000 });
    const pickerValue = await colorPicker.inputValue();
    expect(pickerValue.toLowerCase()).not.toBe("#000000");
    expect(pickerValue.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("editor updates styles via inspector controls", async ({ page }) => {
    const preview = await openDesignStudioWithPreview(page);
    await preview.locator("button").first().click();

    const backgroundField = page.getByRole("textbox", { name: "Background" });
    await expect(backgroundField).toBeVisible({ timeout: 10_000 });
    await backgroundField.clear();
    await backgroundField.fill("blue-600");
    await expect(backgroundField).toHaveValue("blue-600");
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });

    const reloadedPreview = await waitForBundlePreview(page);
    await reloadedPreview.locator("[data-studio-id]").first().click();
    await expect(page.getByRole("textbox", { name: "Background" })).toHaveValue(
      "blue-600",
      { timeout: 20_000 },
    );
  });

  test("wireframes page lists only published components", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await gotoProject(page, `initiatives/${initiativeId}/design/wireframes`);
    await expect(page.getByText("Published UI components")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Demo Button")).toBeVisible();
    await expect(page.getByText("Demo Card")).toBeVisible();
  });
});
