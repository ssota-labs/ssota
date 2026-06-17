import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoGraphNodes, gotoProject } from "../helpers/console";

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
    await gotoProject(page, "log");
    await expect(page.getByText("update_node_property_schema").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/log`));
  });

  test("Node body editor autosaves rich JSON through update_node_properties", async ({
    page,
  }) => {
    const title = `E2E body doc ${Date.now()}`;
    const body = `Rich body saved ${Date.now()}`;

    await loginAsSmoke(page);
    await gotoGraphNodes(page, "document");
    await expect(page.getByPlaceholder(/Filter by id/)).toBeVisible();

    await page.getByRole("button", { name: "Insert" }).click();
    await page.getByLabel("Node Type").fill("Document");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Content").fill("Legacy fallback body");
    await Promise.all([
      page.waitForResponse(
        (response) => response.request().method() === "POST" && response.ok(),
      ),
      page.getByRole("button", { name: "Submit action" }).click(),
    ]);

    await gotoGraphNodes(page, "document");
    await page.getByText(title).click();

    const editor = page.locator('[data-testid="node-body-editor"] .ProseMirror');
    await expect(editor).toBeVisible();
    await editor.fill(body);
    await editor.press("Enter");
    await editor.pressSequentially("/table");
    await expect(page.getByRole("option", { name: /Table/ })).toBeVisible();
    await editor.press("Enter");
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press("Escape");
    await page.getByText(title).click();
    await expect(editor).toContainText(body);

    await gotoProject(page, "log");
    await expect(page.getByText("update_node_properties").first()).toBeVisible();
  });
});
