import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";

test.describe("sandbox environments settings", () => {
  test("lists sandbox environments page in developer settings", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await page.goto("/ssota-labs/ssota-dev/settings/sandbox-environments");
    await expect(
      page.getByRole("heading", { name: /sandbox environments/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Manage reusable VM templates for coding agent task runs."),
    ).toBeVisible();
    await expect(page.getByTestId("sandbox-environments-panel")).toBeVisible();
    await expect(
      page.getByTestId("sandbox-environment-row-sandbox.dev_node24"),
    ).toBeVisible();
  });
});
