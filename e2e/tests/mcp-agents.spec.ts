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
    )) as { agents: Array<{ key: string; name: string }> };

    expect(
      listed.agents.some((entry) => entry.key === "specialist.implement_feature"),
    ).toBe(true);
    for (const agent of listed.agents) {
      expect(agent).not.toHaveProperty("instruction");
      expect(agent).not.toHaveProperty("content");
    }

    const guide = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_agent",
      { agentKey: "guide.agent_authoring" },
      scope,
    )) as { key: string; name: string };
    expect(guide.key).toBe("guide.agent_authoring");
    expect(guide).not.toHaveProperty("instruction");
    expect(guide).not.toHaveProperty("content");

    const guideInstruction = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "get_agent_instruction",
      { agentKey: "guide.agent_authoring" },
      scope,
    )) as { agentKey: string; instruction: string };
    expect(guideInstruction.agentKey).toBe("guide.agent_authoring");
    expect(guideInstruction.instruction).toContain("write_agent_instruction");
    expect(guideInstruction.instruction.length).toBeGreaterThan(50);
  });

  test("rejects unknown agent keys", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const errorText = await mcpToolCallExpectError(
      request,
      mcpUrl,
      token,
      "get_agent_instruction",
      { agentKey: "not.an.agent" },
      scope,
    );
    expect(errorText).toContain("UNKNOWN_AGENT_KEY");
  });
});
