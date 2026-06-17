import { test, expect } from "@playwright/test";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
  getSmokeAccessToken,
  mcpToolCall,
} from "../helpers/mcp";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

const scope = {
  orgSlug: DEFAULT_MCP_ORG_SLUG,
  projectSlug: DEFAULT_MCP_PROJECT_SLUG,
};

test.describe("MCP graph read tools", () => {
  test("catalog and instance query tools", async ({ request }) => {
    const token = await getSmokeAccessToken();

    const nodeTypes = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_node_types",
      {},
      scope,
    )) as Array<{ nodeType: string; label: string }>;
    expect(Array.isArray(nodeTypes)).toBe(true);
    expect(nodeTypes.length).toBeGreaterThan(30);
    expect(nodeTypes.some((entry) => entry.nodeType === "initiative")).toBe(true);

    const nodeType = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_node_type",
      { nodeType: "initiative" },
      scope,
    )) as { nodeType: string; label: string } | null;
    expect(nodeType?.nodeType).toBe("initiative");
    expect(nodeType?.label).toBeTruthy();

    const edgeTypes = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_edge_types",
      {},
      scope,
    )) as Array<{ edgeType: string }>;
    expect(edgeTypes.some((entry) => entry.edgeType === "for_initiative")).toBe(
      true,
    );

    const initiatives = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_nodes",
      { nodeType: "initiative", limit: 10 },
      scope,
    )) as Array<{ id: string; title: string; nodeType: string }>;
    expect(initiatives.length).toBeGreaterThan(0);

    const initiativeId = await getSmokeInitiativeId();
    const node = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_node",
      { nodeId: initiativeId },
      scope,
    )) as { id: string; title: string } | null;
    expect(node?.id).toBe(initiativeId);
    expect(node?.title).toBe("Smoke initiative");

    const edges = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "traverse_edges",
      { nodeId: initiativeId, direction: "both" },
      scope,
    )) as Array<{ edgeType: string }>;
    expect(Array.isArray(edges)).toBe(true);
  });
});
