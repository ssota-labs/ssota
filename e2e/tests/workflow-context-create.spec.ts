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

    const dialog = page.getByRole("dialog");
    await page.getByTestId("add-filter-group").click();
    await expect(
      dialog.getByRole("heading", { name: "Add filter group" }),
    ).toBeVisible();
    await dialog
      .locator("nav")
      .getByRole("button", { name: "Document", exact: true })
      .click();
    await page.getByTestId("confirm-add-filter-group").click();

    const filterGroupRow = page.getByTestId(/filter-group-row-/).first();
    await expect(filterGroupRow).toBeVisible();
    await expect(filterGroupRow).toContainText("Document");
    await expect(filterGroupRow).toContainText(/All conditions/);

    await filterGroupRow.getByRole("button").first().click();
    await expect(page.getByRole("heading", { name: "Edit filter group" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await page.getByTestId("add-context-traversal").click();
    await expect(
      dialog.getByRole("heading", { name: "Add traversal" }),
    ).toBeVisible();
    await dialog
      .locator("nav")
      .getByRole("button", { name: "Document", exact: true })
      .click();
    await page.getByTestId("confirm-add-context-traversal").click();
    const traversalRow = page.getByTestId(/traversal-row-/).first();
    await expect(traversalRow).toBeVisible();
    await expect(traversalRow).toContainText(/From Document/);

    await page.getByTestId("add-context-assertion").click();
    await expect(
      dialog.getByRole("heading", { name: "Add assertion" }),
    ).toBeVisible();
    await dialog
      .locator("nav")
      .getByRole("button", { name: "Status equals", exact: true })
      .click();
    await page.getByTestId("confirm-add-context-assertion").click();
    const assertionRow = page.getByTestId(/assertion-row-/).first();
    await expect(assertionRow).toBeVisible();
    await expect(assertionRow).toContainText("Status equals");

    await assertionRow.getByRole("button").first().click();
    await expect(page.getByRole("heading", { name: "Edit assertion" })).toBeVisible();
    await page.getByLabel("Status").fill("Approved");
    await page.getByRole("button", { name: "Done" }).click();
    await expect(assertionRow).toContainText(/Approved/);

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Context", { exact: true }).first().click();
    await expect(page.getByText("Filter groups", { exact: true })).toBeVisible();
    await expect(page.getByText("Traversals", { exact: true })).toBeVisible();
    await expect(page.getByText("Assertions", { exact: true })).toBeVisible();
    await expect(page.getByText(/fg_document_.* · Document/)).toBeVisible();
  });

  test("context sections use compact card lists like triggers", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginAsSmoke(page);
    await gotoProject(page, "workflow");

    await page.getByRole("button", { name: "New workflow" }).click();

    const triggerCard = page
      .getByText("When should this workflow run?")
      .locator("xpath=ancestor::div[contains(@class,'space-y-3')][1]")
      .locator(".overflow-hidden.rounded-lg.border.bg-card");
    await expect(triggerCard).toBeVisible();

    const filterGroupCard = page
      .getByText("Filter groups", { exact: true })
      .locator("xpath=ancestor::section[1]")
      .locator(".overflow-hidden.rounded-lg.border.bg-card");
    await expect(filterGroupCard).toBeVisible();
    await expect(filterGroupCard.getByTestId("add-filter-group")).toBeVisible();

    const traversalCard = page
      .getByText("Traversals", { exact: true })
      .locator("xpath=ancestor::section[1]")
      .locator(".overflow-hidden.rounded-lg.border.bg-card");
    await expect(traversalCard).toBeVisible();
    await expect(traversalCard.getByTestId("add-context-traversal")).toBeVisible();

    const assertionCard = page
      .getByText("Assertions", { exact: true })
      .locator("xpath=ancestor::section[1]")
      .locator(".overflow-hidden.rounded-lg.border.bg-card");
    await expect(assertionCard).toBeVisible();
    await expect(assertionCard.getByTestId("add-context-assertion")).toBeVisible();
  });
});
