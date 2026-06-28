import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Workflow instructions", () => {
  test("lists seeded instructions and opens editor sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "workflow/instructions");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Workflow instructions", exact: true }),
    ).toBeVisible();
    await expect(main.getByText("Orchestrator", { exact: true })).toBeVisible();
    await expect(
      main.getByTestId("workflow-instruction-item-orchestrator.daily"),
    ).toBeVisible();

    await main.getByTestId("workflow-instruction-item-orchestrator.daily").click();

    const sheet = page.getByTestId("document-sheet-panel");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "Daily orchestrator" })).toBeVisible();
    await expect(sheet.getByTestId("document-sheet-editor")).toBeVisible();
  });

  test("sidebar nav link reaches workflow instructions", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");

    await page
      .getByRole("link", { name: /^Workflow$|^워크플로우$/i })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/workflow/instructions$`),
    );
    await expect(
      page.getByRole("heading", { name: "Workflow instructions", exact: true }),
    ).toBeVisible();
  });
});
