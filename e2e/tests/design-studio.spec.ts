import { test, expect, type Page } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId, getSmokeUiComponentId } from "../helpers/graph-seed";

function studioBuildResponse(page: Page) {
  return page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes("/api/studio/build") &&
      res.status() === 200,
    { timeout: 90_000 },
  );
}

async function waitForBundlePreview(page: Page) {
  const preview = page.frameLocator('iframe[title="Design preview"]');
  await expect(page.locator('iframe[title="Design preview"]')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("studio-mode-inspect")).toBeEnabled({
    timeout: 45_000,
  });
  await expect(preview.locator("[data-studio-id]").first()).toBeVisible({
    timeout: 60_000,
  });
  return preview;
}

async function waitForPreviewReady(page: Page) {
  return waitForBundlePreview(page);
}

async function openStudioComponent(page: Page, slug: string) {
  const componentId = await getSmokeUiComponentId(slug);
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const buildDone = studioBuildResponse(page);
    await gotoProject(page, `design/ui-components/${componentId}`);
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });
    await buildDone.catch(() => {
      // Build may finish before the listener attaches on fast cache hits.
    });
    try {
      return await waitForPreviewReady(page);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await page.waitForTimeout(3_000);
      }
    }
  }

  throw lastError;
}

test.describe("design studio", () => {
  test.describe.configure({ timeout: 180_000, mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("ui-components opens studio with component browser", async ({ page }) => {
    const buttonId = await getSmokeUiComponentId("demo-button");
    await gotoProject(page, `design/ui-components/${buttonId}`);
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/design/ui-components/[0-9a-f-]+$`),
      { timeout: 15_000 },
    );
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });
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

  test("component browser switches components and layers tab works", async ({
    page,
  }) => {
    const cardId = await getSmokeUiComponentId("demo-card");
    await gotoProject(page, `design/ui-components/${cardId}`);
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("studio-component-demo-card")).toHaveClass(
      /bg-muted/,
      { timeout: 15_000 },
    );

    const layersTab = page.getByRole("tab", { name: "Layers" });
    await layersTab.click();
    await expect(layersTab).toHaveAttribute("data-active");

    const layersPanel = page.getByRole("tabpanel").filter({
      has: page.getByText("Component.tsx"),
    });
    await expect(layersPanel.getByText("Component.tsx")).toBeVisible({
      timeout: 15_000,
    });
    await expect(layersPanel.getByText("<div>", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(layersPanel.getByText("<Button>", { exact: true })).toBeVisible();
  });

  test("inspect mode selects nodes and resolves semantic border color", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const preview = await openStudioComponent(page, "demo-button");
    await expect(page.getByTestId("studio-mode-inspect")).toBeVisible();

    await preview.locator("[data-studio-id]").first().click();
    await expect(page.getByLabel("Node ID")).not.toHaveValue("", {
      timeout: 10_000,
    });
    await expect(page.getByLabel("Background")).toBeVisible();

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

    await page.getByTestId("studio-mode-preview").click();
    await expect(
      page.getByText("Live preview — selection disabled"),
    ).toBeVisible();
  });

  test("inspect mode resolves palette border color in picker", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const preview = await openStudioComponent(page, "demo-button");
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
    test.setTimeout(180_000);

    const preview = await openStudioComponent(page, "demo-button");
    await preview.locator("[data-studio-id]").first().click();

    const backgroundField = page.getByLabel("Background");
    await expect(backgroundField).toBeVisible({ timeout: 10_000 });
    await backgroundField.clear();
    await backgroundField.fill("blue-600");
    await expect(backgroundField).toHaveValue("blue-600");
    await page.waitForTimeout(500);

    const reloadedPreview = await openStudioComponent(page, "demo-button");
    await reloadedPreview.locator("[data-studio-id]").first().click();
    await expect(page.getByLabel("Background")).toHaveValue("blue-600", {
      timeout: 20_000,
    });
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
