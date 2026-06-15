import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("Tasks page", () => {
  test.beforeAll(async ({ request }) => {
    const token = await getSmokeAccessToken();
    await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "E2E tasks page fixture",
      workflowKey: "work.implement_feature",
      assignee: "agent:e2e-tasks-page",
      idempotencyKey: `e2e-tasks-page-fixture-${Date.now()}`,
    });
  });

  test("table view shows runtime tasks", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");

    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(
      page.getByText("Runtime work queue", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Table", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Board", exact: true })).toBeVisible();
    await expect(page.getByText("E2E tasks page fixture").first()).toBeVisible();
  });

  test("board tab shows kanban columns", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks?tab=board");

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/tasks\\?tab=board`),
    );
    await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("E2E tasks page fixture").first()).toBeVisible();
  });

  test("table tab preserves board tab in URL when switching back", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks?tab=board");

    await page.getByRole("button", { name: "Table", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/tasks$`));
    await expect(page.getByRole("button", { name: "Board", exact: true })).toBeVisible();
  });

  test("shows blocked-by badge and detail for dependent task", async ({
    page,
    request,
  }) => {
    const token = await getSmokeAccessToken();
    const suffix = Date.now();

    const blocker = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: `E2E UI blocker ${suffix}`,
      workflowKey: "work.implement_feature",
      idempotencyKey: `e2e-ui-blocker-${suffix}`,
    })) as { id: string };

    const blockedTitle = `E2E UI blocked ${suffix}`;
    await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: blockedTitle,
      workflowKey: "work.implement_feature",
      blockedByTaskIds: [blocker.id],
      idempotencyKey: `e2e-ui-blocked-${suffix}`,
    });

    await loginAsSmoke(page);
    await gotoProject(page, "tasks");

    const blockedRow = page.getByRole("row", { name: new RegExp(blockedTitle) });
    await expect(blockedRow).toBeVisible();
    await expect(blockedRow.getByText("Blocked by 1")).toBeVisible();

    await blockedRow.getByRole("button", { name: "View" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Blocked by", { exact: true })).toBeVisible();
    await expect(
      sheet.getByText(`E2E UI blocker ${suffix}`, { exact: false }),
    ).toBeVisible();
  });
});
