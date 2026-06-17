import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoGraphNodes } from "../helpers/console";

test.describe("Context Graph Nodes", () => {
  test("Node table에서 property를 추가하면 schema에 표시된다", async ({ page }) => {
    const propertyKey = `e2e_property_${Date.now()}`;

    await loginAsSmoke(page);
    await gotoGraphNodes(page, "document");
    await expect(page.getByPlaceholder(/Filter by id/)).toBeVisible();

    await page.getByRole("button", { name: "Schema" }).click();
    await page.getByRole("button", { name: "Add property" }).click();
    await page.getByLabel("Property key").fill(propertyKey);
    await page.getByLabel("Value type").fill("string");
    const submit = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Submit change" }).click();
    await submit;
    await gotoGraphNodes(page, "document");

    await expect(page.getByRole("columnheader", { name: new RegExp(propertyKey) })).toBeVisible({
      timeout: 10_000,
    });
    await gotoGraphNodes(page, "document");
    await page.getByRole("button", { name: "Runs" }).click();
    await expect(page.getByText("update_node_property_schema").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Node body editor autosaves rich JSON through update_node_properties", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const title = `E2E body doc ${Date.now()}`;
    const body = `Rich body saved ${Date.now()}`;

    await loginAsSmoke(page);
    await gotoGraphNodes(page, "document");
    await expect(page.getByPlaceholder(/Filter by id/)).toBeVisible();

    await page.getByRole("button", { name: "Insert" }).click();
    await page.getByLabel("NodeType").fill("Document");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Content").fill("Legacy fallback body");
    const submitResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page
      .getByRole("button", { name: "Submit action" })
      .evaluate((node) => (node as HTMLButtonElement).click());
    await submitResponse;
    await gotoGraphNodes(page, "document");
    await expect(page.getByRole("gridcell", { name: title })).toBeVisible({
      timeout: 15_000,
    });
    const row = page.getByRole("row").filter({ hasText: title });
    await row.getByRole("button").first().click();

    const editor = page.locator('[data-testid="node-body-editor"] .ProseMirror');
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await editor.click();
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, body);
    const saveResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+v");
    await expect(editor).toContainText(body);
    await saveResponse;

    await page.keyboard.press("Escape");
    await expect(editor).not.toBeVisible();
    await row.getByRole("button").first().click();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await expect(editor).toContainText(body, { timeout: 10_000 });
  });
});
