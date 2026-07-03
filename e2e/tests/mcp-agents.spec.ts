import { test, expect } from "@playwright/test";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
  getSmokeAccessToken,
  mcpToolCall,
  mcpToolCallExpectError,
} from "../helpers/mcp";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

const scope = {
  orgSlug: DEFAULT_MCP_ORG_SLUG,
  teamspaceSlug: DEFAULT_MCP_PROJECT_SLUG,
};

test.describe("MCP agent tools", () => {
  test("list, get, and get_instruction for agent definitions", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();

    const listed = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "list_agents",
      {},
      scope,
    )) as { agents: Array<{ id: string; name: string }> };

    expect(
      listed.agents.some(
        (entry) => entry.id === BUILTIN_AGENT_IDS.implementFeature,
      ),
    ).toBe(true);
    for (const agent of listed.agents) {
      expect(agent).not.toHaveProperty("instruction");
      expect(agent).not.toHaveProperty("content");
    }

    const agent = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_agent",
      { agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature },
      scope,
    )) as { id: string; name: string };
    expect(agent.id).toBe(BUILTIN_AGENT_IDS.implementFeature);
    expect(agent).not.toHaveProperty("instruction");
    expect(agent).not.toHaveProperty("content");

    const instruction = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_agent_instruction",
      { agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature },
      scope,
    )) as { agentDefinitionId: string; instruction: string };
    expect(instruction.agentDefinitionId).toBe(
      BUILTIN_AGENT_IDS.implementFeature,
    );
    expect(instruction.instruction).toContain("implement");
    expect(instruction.instruction.length).toBeGreaterThan(50);
  });

  test("rejects unknown agent definition ids", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const errorText = await mcpToolCallExpectError(
      request,
      mcpUrl,
      token,
      "get_agent_instruction",
      { agentDefinitionId: "00000000-0000-4000-8000-000000000099" },
      scope,
    );
    expect(errorText).toContain("UNKNOWN_AGENT_DEFINITION");
  });
});
