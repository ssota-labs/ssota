import { test, expect } from "@playwright/test";
import { createDb, createAgentDefinitionPort } from "@ssota/adapter-postgres";
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

const E2E_AGENT_ID = "b0000000-0000-4000-8000-000000000098";

test.describe("Tasks page", () => {
  test.beforeAll(async ({ request }) => {
    const teamspaceId = await getDefaultProjectId();
    const { db, client } = createDb(process.env.DATABASE_URL);
    try {
      await createAgentDefinitionPort(db, { teamspaceId }).upsertDefinition({
        id: E2E_AGENT_ID,
        name: "E2E tasks page agent",
        description: "Agent referenced by the tasks-page e2e fixture.",
        instructions: textToBlockNoteContent(
          "Complete the tasks-page fixture task.",
        ),
      });
    } finally {
      await client.end({ timeout: 1 });
    }

    const token = await getSmokeAccessToken();
    await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "E2E tasks page fixture",
      agentDefinitionId: E2E_AGENT_ID,
      assignee: "agent:e2e-tasks-page",
      executionDirective: E2E_EXECUTION_DIRECTIVE,
      acceptanceCriteria: ["Visible on tasks page"],
      idempotencyKey: `e2e-tasks-page-fixture-${Date.now()}`,
    });
  });

  test("kanban view shows runtime tasks", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");

    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/tasks$`));
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(
      page.getByText("Runtime work queue", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("E2E tasks page fixture").first()).toBeVisible();
  });
});
