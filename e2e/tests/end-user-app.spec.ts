import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import {
  DEFAULT_APP_BASE,
  DEFAULT_CONSOLE_BASE,
  DEFAULT_ORG_SLUG,
  gotoProject,
} from "../helpers/console";

test.describe("end-user app", () => {
  test("app_enabled gate: disabled project returns 404", async ({ page }) => {
    await loginAsSmoke(page);
    const response = await page.goto(
      `/app/${DEFAULT_ORG_SLUG}/app-disabled/c`,
    );
    expect(response?.status()).toBe(404);
  });

  test("provision: /app chat loads AppShell for enabled project", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await page.goto(`${DEFAULT_APP_BASE}/c`);
    await expect(page.getByRole("button", { name: /새 채팅|New chat/i })).toBeVisible({
      timeout: 15_000,
    });
    const sidebar = page.getByRole("navigation", { name: "Primary" });
    await expect(sidebar.getByRole("link", { name: "Chat", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Connections", exact: true }),
    ).toBeVisible();
  });

  test("app tasks route renders account-scoped workspace", async ({ page }) => {
    await loginAsSmoke(page);
    await page.goto(`${DEFAULT_APP_BASE}/tasks`);
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Runtime work queue", { exact: false })).toBeVisible();
  });

  test("builder regression: console overview still loads", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/overview$`));
    await expect(page.getByText("Open tasks")).toBeVisible();
  });
});
