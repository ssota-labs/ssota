import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Workflow context create sheet", () => {
  test("create workflow with filter group, traversal, and assertion inline", async ({
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
      "E2E workflow with inline structured context.",
    );

    await page.getByTestId("add-filter-group").click();
    const filterGroupRow = page.getByTestId(/filter-group-row-/).first();
    await expect(filterGroupRow).toBeVisible();
    await expect(page.getByTestId(/filter-group-expanded-/).first()).toBeVisible();

    const filterNodeType = page
      .getByTestId(/filter-group-expanded-/)
      .first()
      .locator('[data-slot="select-trigger"]')
      .first();
    await filterNodeType.click();
    await page.getByRole("option", { name: "Document", exact: true }).click();
    await expect(filterGroupRow).toContainText("Document");
    await expect(filterGroupRow).toContainText(/All conditions/);

    await page.getByTestId("add-context-traversal").click();
    const traversalRow = page.getByTestId(/traversal-row-/).first();
    await expect(traversalRow).toBeVisible();
    await expect(page.getByTestId(/traversal-expanded-/).first()).toBeVisible();

    await page.getByTestId("traversal-start-node-type").click();
    await page.getByRole("option", { name: "Document", exact: true }).click();
    await expect(traversalRow).toContainText(/From Document/);

    await page.getByTestId("add-context-assertion").click();
    const assertionRow = page.getByTestId(/assertion-row-/).first();
    await expect(assertionRow).toBeVisible();
    await expect(page.getByTestId(/assertion-expanded-/).first()).toBeVisible();

    const assertionExpanded = page.getByTestId(/assertion-expanded-/).first();
    await assertionExpanded.getByTestId("assertion-node-type").click();
    await page.getByRole("option", { name: "Document", exact: true }).click();
    await expect(assertionRow).toContainText("Document");

    const valueInput = assertionExpanded.locator('input[placeholder="Value"]').first();
    await valueInput.fill("Approved");
    await expect(assertionRow).toContainText(/Approved/);

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Context", { exact: true }).first().click();
    await expect(page.getByText("Filter groups", { exact: true })).toBeVisible();
    await expect(page.getByText("Traversals", { exact: true })).toBeVisible();
    await expect(page.getByText("Assertions", { exact: true })).toBeVisible();
    await expect(page.getByText("Document", { exact: true }).first()).toBeVisible();
  });

  test("traversal can be added before filter group", async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsSmoke(page);
    await gotoProject(page, "workflow");

    await page.getByRole("button", { name: "New workflow" }).click();
    await page.getByTestId("add-context-traversal").click();

    await expect(page.getByTestId(/traversal-row-/).first()).toBeVisible();
    await expect(page.getByTestId(/traversal-expanded-/).first()).toBeVisible();
    await expect(page.getByTestId("traversal-start-node-type")).toBeVisible();
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
