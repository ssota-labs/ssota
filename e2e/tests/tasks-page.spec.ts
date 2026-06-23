import { test, expect } from "@playwright/test";
import { createDb, createWorkflowInstructionPort } from "@ssota/adapter-postgres";
import { textToBlockNoteContent } from "@ssota/contracts";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import {
  E2E_EXECUTION_DIRECTIVE,
  getDefaultProjectId,
  getSmokeAccessToken,
  mcpToolCall,
} from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

// Workflows are no longer seeded per project, so provision the one this fixture
// spawns against (MCP is read-only for workflow instructions).
const WORKFLOW_KEY = "work.e2e_tasks_page";

test.describe("Tasks page", () => {
  test.beforeAll(async ({ request }) => {
    const projectId = await getDefaultProjectId();
    const { db, client } = createDb(process.env.DATABASE_URL);
    try {
      await createWorkflowInstructionPort(db, { projectId }).upsertInstruction({
        key: WORKFLOW_KEY,
        name: "E2E tasks page workflow",
        description: "Workflow referenced by the tasks-page e2e fixture.",
        content: textToBlockNoteContent("Complete the tasks-page fixture task."),
      });
    } finally {
      await client.end({ timeout: 1 });
    }

    const token = await getSmokeAccessToken();
    await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "E2E tasks page fixture",
      workflowInstructionKey: WORKFLOW_KEY,
      assignee: "agent:e2e-tasks-page",
      executionDirective: E2E_EXECUTION_DIRECTIVE,
      acceptanceCriteria: ["Visible on tasks page"],
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
});
