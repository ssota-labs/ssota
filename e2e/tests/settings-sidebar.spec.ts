import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Settings L2 sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "settings/general");
  });

  test("shows settings sidebar with all sections", async ({ page }) => {
    const settingsNav = page.getByRole("complementary", { name: "Settings navigation" });
    await expect(settingsNav.getByRole("link", { name: "General", exact: true })).toBeVisible();
    await expect(settingsNav.getByRole("link", { name: "Appearance", exact: true })).toBeVisible();
    await expect(settingsNav.getByRole("link", { name: "Members", exact: true })).toBeVisible();
    await expect(settingsNav.getByRole("link", { name: "Teamspace", exact: true })).toBeVisible();
    await expect(settingsNav.getByRole("link", { name: "Developer", exact: true })).toBeVisible();
  });

  test("navigates between settings sections", async ({ page }) => {
    const settingsNav = page.getByRole("complementary", { name: "Settings navigation" });

    await settingsNav.getByRole("link", { name: "Appearance", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/settings/appearance$`));
    await expect(page.getByRole("heading", { name: "Appearance", level: 1 })).toBeVisible();

    await settingsNav.getByRole("link", { name: "Developer", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/settings/developer$`));
    await expect(page.getByRole("heading", { name: "Developer", level: 1 })).toBeVisible();
    await expect(page.getByText("Connect MCP", { exact: true })).toBeVisible();
  });

  test("settings index redirects to general", async ({ page }) => {
    await gotoProject(page, "settings");
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/settings/general$`));
  });

  test("developer setup legacy route redirects to settings developer", async ({ page }) => {
    await gotoProject(page, "developer/setup");
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/settings/developer$`));
  });
});
