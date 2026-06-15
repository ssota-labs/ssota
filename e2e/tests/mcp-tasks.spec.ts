import { test, expect } from "@playwright/test";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("MCP task tools", () => {
  test("list, query, and get tasks in smoke project", async ({ request }) => {
    const token = await getSmokeAccessToken();

    const listed = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_tasks",
    )) as Array<{ id: string; title: string }>;
    expect(Array.isArray(listed)).toBe(true);

    const queried = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_tasks",
      { limit: 10 },
    )) as Array<{ id: string; title: string }>;
    expect(Array.isArray(queried)).toBe(true);

    const first = listed[0] ?? queried[0];
    if (!first) {
      test.skip(true, "No tasks seeded for smoke project");
      return;
    }

    const task = (await mcpToolCall(request, mcpUrl, token, "get_task", {
      taskId: first.id,
    })) as { id: string; title: string } | null;
    expect(task?.id).toBe(first.id);
    expect(task?.title).toBeTruthy();
  });
});
