import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Settings members", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "settings/members");
  });

  test("shows members page with owner row", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite member" })).toBeVisible();
    await expect(page.getByText("smoke@ssota.ai")).toBeVisible();
    await expect(page.getByText("Owner")).toBeVisible();
  });

  test("opens invite member dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Invite member" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Invite member" })).toBeVisible();
    await expect(page.getByPlaceholder("user@example.com")).toBeVisible();
  });
});
