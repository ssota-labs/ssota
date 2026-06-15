import { test, expect } from "@playwright/test";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("MCP task tools", () => {
  test("spawn_task then list/get/query/update tasks", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const idempotencyKey = `e2e-spawn-task-${Date.now()}`;

    const spawned = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "E2E spawned task",
      workflowKey: "work.implement_feature",
      assignee: "agent:e2e",
      idempotencyKey,
    })) as { id: string; title: string; workflowKey: string; status: string };

    expect(spawned.id).toBeTruthy();
    expect(spawned.workflowKey).toBe("work.implement_feature");
    expect(spawned.status).toBe("pending");

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
        workflowKey: "work.implement_feature",
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
    expect(task?.workflowKey).toBe("work.implement_feature");

    const updated = (await mcpToolCall(request, mcpUrl, token, "update_task", {
      taskId: matched!.id,
      status: "done",
      result: { e2e: true },
    })) as { status: string; result: Record<string, unknown> };
    expect(updated.status).toBe("done");
    expect(updated.result.e2e).toBe(true);

    const duplicate = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: "Should not create duplicate",
      workflowKey: "work.implement_feature",
      idempotencyKey,
    })) as { id: string; title: string };
    expect(duplicate.id).toBe(spawned.id);
    expect(duplicate.title).toBe("E2E spawned task");
  });

  test("spawn_task blockedByTaskIds enforces dependency rules", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();
    const suffix = Date.now();

    const blocker = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: `E2E blocker ${suffix}`,
      workflowKey: "work.implement_feature",
      idempotencyKey: `e2e-blocker-${suffix}`,
    })) as { id: string; status: string };

    const blocked = (await mcpToolCall(request, mcpUrl, token, "spawn_task", {
      title: `E2E blocked ${suffix}`,
      workflowKey: "work.implement_feature",
      blockedByTaskIds: [blocker.id],
      idempotencyKey: `e2e-blocked-${suffix}`,
    })) as {
      id: string;
      status: string;
      blockedBy: Array<{ id: string }>;
      isRunnable: boolean;
    };

    expect(blocked.status).toBe("pending");
    expect(blocked.blockedBy.map((task) => task.id)).toContain(blocker.id);
    expect(blocked.isRunnable).toBe(false);

    await expect(
      mcpToolCall(request, mcpUrl, token, "update_task", {
        taskId: blocked.id,
        status: "ready",
      }),
    ).rejects.toThrow(/DEPENDENCY_BLOCKED/);

    await mcpToolCall(request, mcpUrl, token, "update_task", {
      taskId: blocker.id,
      status: "done",
    });

    const promoted = (await mcpToolCall(request, mcpUrl, token, "get_task", {
      taskId: blocked.id,
    })) as { status: string; isRunnable: boolean };
    expect(promoted.status).toBe("ready");
    expect(promoted.isRunnable).toBe(true);

    const runnable = (await mcpToolCall(request, mcpUrl, token, "query_tasks", {
      runnable: true,
      limit: 50,
    })) as Array<{ id: string }>;
    expect(runnable.some((task) => task.id === blocked.id)).toBe(true);
  });
});
