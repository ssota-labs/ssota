import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Workflow builder save", () => {
  test("builder edits route graph, steps, and persists via save", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsSmoke(page);
    await gotoProject(page, "workflow");

    const workflowTitle = `Builder workflow ${Date.now()}`;
    const inspector = page.getByTestId("workflow-inspector");

    await page.getByRole("button", { name: "New workflow" }).click();
    await page.getByLabel("Name").fill(workflowTitle);
    await page.getByLabel("Description").fill(
      "E2E workflow for builder save with route outlets.",
    );
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("add-node-context").click();
    await page.getByTestId("add-node-option-route").click();
    await expect(inspector).toBeVisible({ timeout: 10_000 });
    await inspector.locator("#route-label").fill("Dispatch");

    const routeNode = page.locator(".react-flow__node").filter({
      hasText: "Dispatch",
    });
    await expect(routeNode).toBeVisible();

    const defaultOutletAdd = page.getByTestId("add-node-route");
    await defaultOutletAdd.click();
    await page.getByTestId("add-node-option-workflow").click();
    await expect(inspector.getByTestId("workflow-block-picker")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("add-node-context").click();
    await page.getByTestId("add-node-option-step").click();
    await expect(inspector.getByLabel("Title")).toBeVisible({ timeout: 10_000 });
    await inspector.getByLabel("Title").fill("Draft section");
    await inspector.getByLabel("Guidance").fill("Write the first draft section");
    await inspector
      .getByLabel("Instruction URL")
      .fill("https://example.com/notion-playbook");

    await expect(page.getByTestId("save-workflow-builder")).toBeEnabled();
    await page.getByTestId("save-workflow-builder").click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Draft section" }),
    ).toBeVisible();
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Dispatch" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Rendered text" }).click();
    const rendered = page.locator("article pre");
    await expect(rendered).toContainText("### 1. Draft section");
    await expect(rendered).toContainText("## Routes");
    await expect(rendered).toContainText("Dispatch");
    await expect(rendered).toContainText("instruction: https://example.com/notion-playbook");
  });
});
