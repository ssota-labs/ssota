import { test, expect } from "@playwright/test";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
  E2E_EXECUTION_DIRECTIVE,
  getSmokeAccessToken,
  mcpToolCall,
  mcpToolCallExpectError,
} from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

const scope = {
  orgSlug: DEFAULT_MCP_ORG_SLUG,
  projectSlug: DEFAULT_MCP_PROJECT_SLUG,
};

test.describe("MCP workflow tools", () => {
  test("list, get, and get_instruction for DB workflow instructions", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();

    const listed = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_workflows",
      {},
      scope,
    )) as { workflows: Array<{ key: string; name: string }> };

    expect(listed.workflows.length).toBeGreaterThanOrEqual(8);
    expect(
      listed.workflows.some((entry) => entry.key === "orchestrator.daily"),
    ).toBe(true);
    for (const workflow of listed.workflows) {
      expect(workflow).not.toHaveProperty("instruction");
      expect(workflow).not.toHaveProperty("content");
    }

    const daily = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_workflow",
      { workflowKey: "orchestrator.daily" },
      scope,
    )) as { key: string; name: string };
    expect(daily.key).toBe("orchestrator.daily");
    expect(daily).not.toHaveProperty("instruction");
    expect(daily).not.toHaveProperty("content");

    const dailyInstruction = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_workflow_instruction",
      { workflowKey: "orchestrator.daily" },
      scope,
    )) as { workflowKey: string; instruction: string };
    expect(dailyInstruction.workflowKey).toBe("orchestrator.daily");
    expect(dailyInstruction.instruction).toContain("query_tasks");
    expect(dailyInstruction.instruction.length).toBeGreaterThan(50);
  });

  test("rejects unknown workflow keys", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const errorText = await mcpToolCallExpectError(
      request,
      mcpUrl,
      token,
      "get_workflow_instruction",
      { workflowKey: "not.a.workflow" },
      scope,
    );
    expect(errorText).toContain("UNKNOWN_WORKFLOW_KEY");
  });
});
