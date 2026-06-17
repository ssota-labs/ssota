import { test, expect } from "@playwright/test";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
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
  test("list, get, and get_instruction for registry workflows", async ({
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
    )) as { workflows: Array<{ workflowKey: string; title: string }> };

    expect(listed.workflows.length).toBeGreaterThanOrEqual(9);
    expect(
      listed.workflows.some((entry) => entry.workflowKey === "agent.main"),
    ).toBe(true);
    for (const workflow of listed.workflows) {
      expect(workflow).not.toHaveProperty("instruction");
    }

    const daily = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_workflow",
      { workflowKey: "orchestrator.daily" },
      scope,
    )) as { workflowKey: string; cadenceHint: string };
    expect(daily.workflowKey).toBe("orchestrator.daily");
    expect(daily.cadenceHint).toBe("daily");
    expect(daily).not.toHaveProperty("instruction");

    const mainInstruction = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_workflow_instruction",
      { workflowKey: "agent.main" },
      scope,
    )) as { workflowKey: string; instruction: string };
    expect(mainInstruction.workflowKey).toBe("agent.main");
    expect(mainInstruction.instruction).toContain("get_workflow_instruction");
    expect(mainInstruction.instruction.length).toBeGreaterThan(50);
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
