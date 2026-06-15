import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Workflow builder save", () => {
  test("builder edits steps, references, and persists via save", async ({
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
      "E2E workflow for builder save and progressive disclosure.",
    );
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("add-node-context").click();
    await page.getByTestId("add-node-option-condition").click();
    await expect(inspector).toBeVisible({ timeout: 10_000 });
    await inspector.getByLabel("Label").fill("Needs review");
    await inspector.getByLabel("Description").fill(
      "Check if human review is required",
    );

    await page.getByTestId("add-node-condition").click();
    await page.getByTestId("add-node-option-step").click();
    await expect(inspector.getByLabel("Title")).toBeVisible({ timeout: 10_000 });
    await inspector.getByLabel("Title").fill("Draft section");
    await inspector.getByLabel("Guidance").fill("Write the first draft section");

    const firstStepNode = page.locator(".react-flow__node").filter({
      hasText: "Draft section",
    });
    await firstStepNode.click();
    await page.getByTestId("add-node-step").click();
    await page.getByTestId("add-node-option-reference").click();
    await expect(inspector.getByLabel("Title")).toBeVisible({ timeout: 10_000 });
    await inspector.getByLabel("Title").fill("Notion playbook");
    await inspector.getByLabel("URL").fill("https://example.com/notion-playbook");

    await firstStepNode.click();
    await page.getByTestId("add-node-step").click();
    await page.getByTestId("add-node-option-reference").click();
    await expect(inspector.getByLabel("Title")).toBeVisible({ timeout: 10_000 });
    await inspector.getByLabel("Title").fill("Related workflow");
    await inspector.getByTestId("reference-kind").click();
    await page.getByRole("option", { name: "workflow" }).click();

    await page.getByTestId("add-node-context").click();
    await page.getByTestId("add-node-option-step").click();
    await inspector.getByLabel("Title").fill("Publish");
    await inspector.getByLabel("Guidance").fill("Publish after approval");

    await expect(page.getByTestId("save-workflow-builder")).toBeEnabled();
    await page.getByTestId("save-workflow-builder").click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Draft section", { exact: true })).toBeVisible();
    await expect(page.getByText("Needs review", { exact: true })).toBeVisible();
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Notion playbook" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Rendered text" }).click();
    const rendered = page.locator("article pre");
    await expect(rendered).toContainText("### 2. Draft section");
    await expect(rendered).toContainText("## Conditions");
    await expect(rendered).toContainText("Needs review");
    await expect(rendered).toContainText("Fetch when needed");
    await expect(rendered).toContainText("Follow workflow (progressive)");
  });
});
