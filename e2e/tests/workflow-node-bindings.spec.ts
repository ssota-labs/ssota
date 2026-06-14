import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

async function openDocumentCreationBuilder(page: import("@playwright/test").Page) {
  await gotoProject(page, "workflow?workflow=document_creation");
  await expect(page.getByText("Choose a workflow", { exact: true })).toBeVisible();
  await expect(page.getByText("Document creation", { exact: true }).first()).toBeVisible();
}

async function selectContextBlock(page: import("@playwright/test").Page) {
  await page
    .locator(".react-flow__node")
    .filter({ hasText: "Context" })
    .first()
    .click();
  await expect(page.getByText("Configure the selected workflow block.")).toBeVisible();
  await expect(page.getByText("Applicable nodes", { exact: true })).toBeVisible();
}

async function openDocumentActionsMenu(page: import("@playwright/test").Page) {
  await page.getByTestId("edit-workflow-node-Document").click();
  return page.getByTestId("toggle-action-Document-create_node");
}

test.describe("Workflow node bindings", () => {
  test("Context inspector: add node, toggle action, persist after reload", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginAsSmoke(page);
    await openDocumentCreationBuilder(page);
    await selectContextBlock(page);

    await expect(
      page.getByTestId("edit-workflow-node-Document"),
    ).toBeVisible();

    const projectRow = page.getByTestId("edit-workflow-node-Project");
    if (!(await projectRow.isVisible())) {
      const dialog = page.getByRole("dialog");
      await page.getByTestId("add-workflow-node").click();
      await expect(dialog).toBeVisible();
      await dialog
        .locator("nav")
        .getByRole("button", { name: "Workflow", exact: true })
        .click();
      await expect(page.getByTestId("confirm-add-workflow-node")).toBeEnabled();
      await page.getByTestId("confirm-add-workflow-node").click();
      await expect(dialog).toBeHidden();
      await expect(page.getByTestId("edit-workflow-node-Workflow")).toBeVisible();
    } else {
      await expect(projectRow).toBeVisible();
    }

    let createNodeToggle = await openDocumentActionsMenu(page);
    if ((await createNodeToggle.getAttribute("aria-checked")) === "false") {
      await createNodeToggle.click();
      createNodeToggle = await openDocumentActionsMenu(page);
      await expect(createNodeToggle).toHaveAttribute("aria-checked", "true");
    }

    await createNodeToggle.click();
    createNodeToggle = await openDocumentActionsMenu(page);
    await expect(createNodeToggle).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await openDocumentCreationBuilder(page);
    await selectContextBlock(page);

    createNodeToggle = await openDocumentActionsMenu(page);
    await expect(createNodeToggle).toHaveAttribute("aria-checked", "false");
  });
});
