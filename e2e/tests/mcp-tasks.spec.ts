import { test, expect } from "@playwright/test";
import { createDb, createWorkflowInstructionPort } from "@ssota/adapter-postgres";
import { textToBlockNoteContent } from "@ssota/contracts";
import {
  E2E_EXECUTION_DIRECTIVE,
  getDefaultProjectId,
  getSmokeAccessToken,
  mcpToolCall,
} from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

// Workflows are no longer seeded per project, so this spec provisions the one
// it spawns against (MCP itself is read-only for workflow instructions).
const WORKFLOW_KEY = "work.e2e_task";

test.describe("MCP task tools", () => {
  test.beforeAll(async () => {
    const teamspaceId = await getDefaultProjectId();
    const { db, client } = createDb(process.env.DATABASE_URL);
    try {
      await createWorkflowInstructionPort(db, { teamspaceId }).upsertInstruction({
        key: WORKFLOW_KEY,
        name: "E2E task workflow",
        description: "Workflow referenced by the MCP tasks e2e spec.",
        content: textToBlockNoteContent("Complete the E2E task."),
      });
    } finally {
      await client.end({ timeout: 1 });
    }
  });

  test("spawn_task then list/get/query/update tasks", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const idempotencyKey = `e2e-spawn-task-${Date.now()}`;

    const spawned = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "E2E spawned task",
      workflowInstructionKey: WORKFLOW_KEY,
      assignee: "agent:e2e",
      executionDirective: E2E_EXECUTION_DIRECTIVE,
      acceptanceCriteria: ["Task completed in E2E"],
      idempotencyKey,
    })) as {
      id: string;
      title: string;
      workflowInstructionKey: string;
      status: string;
    };

    expect(spawned.id).toBeTruthy();
    expect(spawned.workflowInstructionKey).toBe(WORKFLOW_KEY);
    expect(spawned.status).toBe("pending");

    const listed = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_tasks",
    )) as Array<{ id: string; title: string; workflowInstructionKey: string }>;
    expect(Array.isArray(listed)).toBe(true);
    expect(listed.some((task) => task.title === "E2E spawned task")).toBe(true);

    const queried = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_tasks",
      {
        workflowInstructionKey: WORKFLOW_KEY,
        assignee: "agent:e2e",
        limit: 10,
      },
    )) as Array<{ id: string; title: string }>;
    const matched = queried.find((task) => task.title === "E2E spawned task");
    expect(matched).toBeTruthy();

    const task = (await mcpToolCall(request, mcpUrl, token, "get_task", {
      taskId: matched!.id,
    })) as { id: string; title: string; workflowInstructionKey: string } | null;
    expect(task?.id).toBe(matched!.id);
    expect(task?.workflowInstructionKey).toBe(WORKFLOW_KEY);

    const updated = (await mcpToolCall(request, mcpUrl, token, "update_task", {
      taskId: matched!.id,
      status: "done",
      result: { e2e: true },
    })) as { status: string; result: Record<string, unknown> };
    expect(updated.status).toBe("done");
    expect(updated.result.e2e).toBe(true);

    const duplicate = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "Should not create duplicate",
      workflowInstructionKey: WORKFLOW_KEY,
      executionDirective: E2E_EXECUTION_DIRECTIVE,
      acceptanceCriteria: ["done"],
      idempotencyKey,
    })) as { id: string; title: string };
    expect(duplicate.id).toBe(spawned.id);
    expect(duplicate.title).toBe("E2E spawned task");
  });
});
