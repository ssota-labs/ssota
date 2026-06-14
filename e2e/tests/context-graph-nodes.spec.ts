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
});
