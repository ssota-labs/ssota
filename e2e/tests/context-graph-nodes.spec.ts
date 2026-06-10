import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoGraphNodes } from "../helpers/console";

test.describe("Context Graph Nodes", () => {
  test("Node table에서 property를 추가하면 schema에 표시된다", async ({ page }) => {
    const propertyKey = `e2e_property_${Date.now()}`;

    await loginAsSmoke(page);
    await gotoGraphNodes(page, "document");
    await expect(page.getByRole("heading", { name: "Document" })).toBeVisible();

    await page.getByRole("button", { name: "Add property" }).click();
    await page.getByLabel("Property key").fill(propertyKey);
    await page.getByLabel("Value type").fill("string");
    await page.getByLabel("Owning actions").fill("create_document");
    await page.getByRole("button", { name: "Submit change" }).click();

    await expect(page.getByRole("columnheader", { name: propertyKey })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "View logs" }).click();
    await expect(page.getByText("define_property").first()).toBeVisible();
    await expect(page.getByText("update_node_type").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/log`));
  });
});
