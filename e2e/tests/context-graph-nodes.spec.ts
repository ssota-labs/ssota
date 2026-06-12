import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoGraphNodes } from "../helpers/console";

test.describe("Context Graph Nodes", () => {
  test("Node catalog canvas에서 노드 클릭 시 definition 패널이 열린다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoGraphNodes(page, "document");
    await expect(page.getByRole("heading", { name: "Document" })).toBeVisible();
    await expect(page.locator(".react-flow")).toBeVisible();

    await page.locator(".react-flow__node").filter({ hasText: "Document" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Node definition")).toBeVisible();
    await expect(page.getByText("Properties")).toBeVisible();
  });
});
