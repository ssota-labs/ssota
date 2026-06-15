import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("Tasks page", () => {
  test.beforeAll(async ({ request }) => {
    const token = await getSmokeAccessToken();
    await mcpToolCall(request, mcpUrl, token, "execute_action", {
      actionType: "spawn_task",
      input: {
        title: "E2E tasks page fixture",
        workflowKey: "document_creation",
        assignee: "agent:e2e-tasks-page",
      },
      idempotencyKey: `e2e-tasks-page-fixture-${Date.now()}`,
    });
  });

  test("table view shows runtime tasks", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");

    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(
      page.getByText("Runtime tasks from the tasks table", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Table", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Board", exact: true })).toBeVisible();
    await expect(page.getByText("E2E tasks page fixture")).toBeVisible();
  });

  test("board tab shows kanban columns", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks?tab=board");

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/tasks\\?tab=board`),
    );
    await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("E2E tasks page fixture")).toBeVisible();
  });

  test("filter chips preserve tab in URL", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks?tab=board");

    await page.getByRole("button", { name: /Agent/ }).click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/tasks\\?view=agent&tab=board`),
    );
    await expect(page.getByRole("button", { name: "Board", exact: true })).toBeVisible();
  });
});
