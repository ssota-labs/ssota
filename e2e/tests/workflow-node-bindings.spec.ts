import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

async function openNewWorkflowSheet(page: import("@playwright/test").Page) {
  await gotoProject(page, "workflow");
  await page.getByRole("button", { name: "New workflow" }).click();
  await expect(
    page.getByRole("heading", { name: "Create a new workflow" }),
  ).toBeVisible();
}

async function openNoteActionsMenu(page: import("@playwright/test").Page) {
  await page.getByTestId("edit-workflow-node-Note").click();
  return page.getByTestId("toggle-action-Note-create_node");
}

test.describe("Workflow node bindings", () => {
  test("Create sheet: add node, toggle action, persist after save", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const workflowTitle = `E2E bindings ${Date.now()}`;

    await loginAsSmoke(page);
    await openNewWorkflowSheet(page);

    await page.getByLabel("Name").fill(workflowTitle);
    await page.getByLabel("Description").fill("Node bindings create sheet test");

    await expect(page.getByText("Applicable nodes", { exact: true })).toBeVisible();

    const dialog = page.getByRole("dialog");
    await page.getByTestId("add-workflow-node").click();
    await expect(dialog.getByRole("heading", { name: "Add node" })).toBeVisible();
    await dialog
      .locator("nav")
      .getByRole("button", { name: "Note", exact: true })
      .click();
    await expect(page.getByTestId("confirm-add-workflow-node")).toBeEnabled();
    await page.getByTestId("confirm-add-workflow-node").click();
    await expect(page.getByTestId("edit-workflow-node-Note")).toBeVisible();

    let createNodeToggle = await openNoteActionsMenu(page);
    await expect(createNodeToggle).toHaveAttribute("aria-checked", "true");
    await createNodeToggle.click();
    createNodeToggle = await openNoteActionsMenu(page);
    await expect(createNodeToggle).toHaveAttribute("aria-checked", "false");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/workflow\?workflow=/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible();

    const contextNode = page
      .locator(".react-flow__node")
      .filter({ hasText: "Context" })
      .first();
    await expect(contextNode.getByText("Note", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible();
    await expect(
      page
        .locator(".react-flow__node")
        .filter({ hasText: "Context" })
        .first()
        .getByText("Note", { exact: true }),
    ).toBeVisible();
  });
});
