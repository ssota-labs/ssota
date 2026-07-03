import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("sandbox environments", () => {
  test("lists sandbox environments on the Sandbox nav page", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "sandbox");
    await expect(page.getByRole("heading", { name: /^Sandbox$/i })).toBeVisible();
    await expect(
      page.getByText("Manage reusable VM templates for coding agent task runs."),
    ).toBeVisible();
    await expect(page.getByTestId("sandbox-environments-panel")).toBeVisible();
    await expect(
      page.getByTestId("sandbox-environment-row-sandbox.dev_node24"),
    ).toBeVisible();
  });
});
