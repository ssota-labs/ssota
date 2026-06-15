import { test, expect } from "@playwright/test";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("MCP task tools", () => {
  test("spawn_task via execute_action then list/get/query tasks", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();
    const idempotencyKey = `e2e-spawn-task-${Date.now()}`;

    const spawnResult = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "execute_action",
      {
        actionType: "spawn_task",
        input: {
          title: "E2E spawned task",
          workflowKey: "document_creation",
          assignee: "agent:e2e",
        },
        idempotencyKey,
      },
    )) as { status: string; logId?: string };

    expect(spawnResult.status).toBe("committed");
    expect(spawnResult.logId).toBeTruthy();

    const listed = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_tasks",
    )) as Array<{ id: string; title: string; workflowKey: string }>;
    expect(Array.isArray(listed)).toBe(true);
    expect(listed.some((task) => task.title === "E2E spawned task")).toBe(true);

    const queried = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_tasks",
      {
        workflowKey: "document_creation",
        assignee: "agent:e2e",
        limit: 10,
      },
    )) as Array<{ id: string; title: string }>;
    const matched = queried.find((task) => task.title === "E2E spawned task");
    expect(matched).toBeTruthy();

    const task = (await mcpToolCall(request, mcpUrl, token, "get_task", {
      taskId: matched!.id,
    })) as { id: string; title: string; workflowKey: string } | null;
    expect(task?.id).toBe(matched!.id);
    expect(task?.workflowKey).toBe("document_creation");
  });
});
