import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Workflow context create sheet", () => {
  test("create workflow with filter group, traversal, and assertion", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginAsSmoke(page);
    await gotoProject(page, "workflow");

    const workflowTitle = `Context workflow ${Date.now()}`;

    await page.getByRole("button", { name: "New workflow" }).click();
    await expect(
      page.getByRole("heading", { name: "Create a new workflow" }),
    ).toBeVisible();

    await page.getByLabel("Name").fill(workflowTitle);
    await page.getByLabel("Description").fill(
      "E2E workflow with structured context filter groups.",
    );

    await page.getByTestId("add-filter-group").click();
    await page.getByPlaceholder("Search node types...").fill("Document");
    await page.getByRole("button", { name: "Document" }).click();
    await page.getByRole("button", { name: "Add filter group" }).click();

    await expect(page.getByTestId(/filter-group-/)).toBeVisible();

    await page.getByTestId("add-context-traversal").click();
    await page.getByRole("button", { name: "Add traversal" }).click();
    await expect(page.getByTestId(/traversal-/)).toBeVisible();

    await page.getByTestId("add-context-assertion").click();
    await page.getByRole("button", { name: "Status equals" }).click();
    await page.getByRole("button", { name: "Add assertion" }).click();
    await expect(page.getByTestId(/assertion-/)).toBeVisible();

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Context", { exact: true }).first().click();
    await expect(page.getByText("Filter groups", { exact: true })).toBeVisible();
    await expect(page.getByText("Traversals", { exact: true })).toBeVisible();
    await expect(page.getByText("Assertions", { exact: true })).toBeVisible();
    await expect(page.getByText("Document")).toBeVisible();
  });
});
