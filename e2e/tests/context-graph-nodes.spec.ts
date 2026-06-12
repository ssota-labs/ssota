import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoGraphNodes, gotoProject } from "../helpers/console";

test.describe("Context Graph Nodes", () => {
  test("Node table에서 property를 추가하면 schema에 표시된다", async ({ page }) => {
    const propertyKey = `e2e_property_${Date.now()}`;

    await loginAsSmoke(page);
    await gotoGraphNodes(page, "document");
    await expect(page.getByPlaceholder("Filter rows...")).toBeVisible();

    await page.getByTestId("open-definition").click();
    await page.getByRole("button", { name: "Add property" }).click();
    await page.getByLabel("Property key").fill(propertyKey);
    await page.getByLabel("Value type").fill("string");
    await page.getByLabel("Owning actions").fill("create_document");
    const submit = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Submit change" }).click();
    await submit;
    await gotoGraphNodes(page, "document");

    const propertyLabel = propertyKey
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    await expect(page.getByRole("columnheader", { name: new RegExp(propertyLabel) })).toBeVisible({
      timeout: 10_000,
    });
    await gotoProject(page, "log");
    await expect(page.getByText("define_property").first()).toBeVisible();
    await expect(page.getByText("update_node_type").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/log`));
  });
});
