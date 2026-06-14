import { test, expect } from "@playwright/test";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("MCP read tools", () => {
  test("discover, fetch, and query domain workflows", async ({ request }) => {
    const token = await getSmokeAccessToken();

    const contracts = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_action_contracts",
    )) as unknown[];
    expect(Array.isArray(contracts)).toBe(true);
    expect(contracts.length).toBeGreaterThan(0);

    const createContract = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_action_contract",
      { actionType: "create_node" },
    )) as { actionType: string } | null;
    expect(createContract?.actionType).toBe("create_node");

    const nodeType = (await mcpToolCall(request, mcpUrl, token, "get_node_type", {
      nodeType: "Document",
    })) as { nodeType: string; propertySchema: Record<string, unknown> } | null;
    expect(nodeType?.nodeType).toBe("Document");
    expect(nodeType?.propertySchema?.title).toBeTruthy();

    const found = (await mcpToolCall(request, mcpUrl, token, "find_workflow", {
      query: "document creation",
      limit: 3,
    })) as Array<{ id: string; title: string }>;
    expect(found.length).toBeGreaterThan(0);

    const workflow = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_workflow",
      { workflowId: found[0]!.id },
    )) as { id: string; title: string } | null;
    expect(workflow?.id).toBe(found[0]!.id);
    expect(workflow?.title).toBeTruthy();
  });
});
