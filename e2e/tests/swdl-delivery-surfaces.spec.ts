import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

/**
 * P0 U2 — global Delivery surfaces seeded by the SWDL Domain Pack.
 * Asserts nav pages render Board/Table (or inbox table) shells.
 */
test.describe("SWDL delivery surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("backlog shows Board and Table tabs", async ({ page }) => {
    await gotoProject(page, "development/backlog");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/development/backlog`),
    );
    await expect(page.getByRole("tab", { name: "Board" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Table" })).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Table" }).click();
    await expect(page.getByText("Backlog").first()).toBeVisible();
  });

  test("sprints page includes Board tab and task columns", async ({ page }) => {
    await gotoProject(page, "development/sprints");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/development/sprints`),
    );
    await expect(page.getByRole("tab", { name: "Board" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Sprints" })).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Sprints" }).click();
    await expect(page.getByText("Sprints").first()).toBeVisible();
  });

  test("pull-requests inbox renders status table", async ({ page }) => {
    await gotoProject(page, "development/pull-requests");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/development/pull-requests`),
    );
    await expect(page.getByText("PR inbox", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Pull requests").first()).toBeVisible();
  });

  test("api-snapshots page is reachable", async ({ page }) => {
    await gotoProject(page, "development/api-snapshots");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/development/api-snapshots`),
    );
    await expect(page.getByText("API snapshots").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
