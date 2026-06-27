import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Console v2.7 navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");
  });

  test("sidebar: L0 shows home, tasks, chat, connections, and page tree groups", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Chat", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Connections", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Executive", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Research", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Manager", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Development", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Design", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Workflow Map", exact: true })).toBeVisible();
  });

  test("sidebar: page tree research group expands and navigates", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Research", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Market research", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Market research", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`));
    await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
  });

  test("sidebar: page tree executive group expands to roadmap link", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Executive", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Roadmap", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`));
  });

  test("sidebar footer: developer setup and settings links", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Developer setup", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  });

  test("footer profile menu: appearance and sign out", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "Signed in as" }).click();
    await expect(page.getByText("Appearance", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("organization switcher opens opaque popover with options", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "Organization", exact: true }).click();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    await expect(popover).not.toHaveClass(/cn-menu-translucent/);
    await expect(popover.getByText("Organization", { exact: true })).toBeVisible();
    await expect(popover.getByRole("link", { name: /SSOTA Labs/ })).toBeVisible();
  });
});
