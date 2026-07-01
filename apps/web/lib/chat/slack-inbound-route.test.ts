import { describe, expect, it } from "vitest";
import type { AgentDefinition } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import { resolveSlackInboundRoute } from "./slack-inbound-route";

function agent(
  partial: Partial<AgentDefinition> & Pick<AgentDefinition, "id" | "name">,
): AgentDefinition {
  return {
    teamspaceId: "00000000-0000-4000-8000-000000000001",
    accountId: null,
    description: "",
    instructions: [],
    isMain: false,
    referenceOnly: false,
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...partial,
  };
}

describe("resolveSlackInboundRoute", () => {
  const specialist = agent({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Content Planner",
    runPolicy: {
      connectionTriggers: [
        {
          id: "slack:agent_mentioned",
          provider: "slack",
          kind: "agent_mentioned",
          label: "Agent mentioned",
          enabled: true,
          slackUserGroupId: "S0614NJ2P",
          slackUserGroupHandle: "content-planner",
          showTypingIndicator: false,
        },
      ],
    },
  });

  const main = agent({
    id: MAIN_AGENT_ID,
    name: "SSOTA Main Agent",
    isMain: true,
  });

  it("routes user-group mentions to the matching specialist", async () => {
    const route = await resolveSlackInboundRoute({
      definitions: [main, specialist],
      messageText: "Please help <!subteam^S0614NJ2P|@content-planner>",
      messageIsBotMention: false,
    });

    expect(route).toEqual({
      agentDefinitionId: specialist.id,
      isMain: false,
      showTypingIndicator: false,
    });
  });

  it("routes bot mentions to the main agent", async () => {
    const route = await resolveSlackInboundRoute({
      definitions: [main, specialist],
      messageText: "hello",
      messageIsBotMention: true,
    });

    expect(route).toEqual({
      agentDefinitionId: MAIN_AGENT_ID,
      isMain: true,
      showTypingIndicator: true,
    });
  });

  it("continues subscribed threads with stored agent id", async () => {
    const route = await resolveSlackInboundRoute({
      definitions: [main, specialist],
      messageText: "follow up",
      messageIsBotMention: false,
      threadAgentDefinitionId: specialist.id,
    });

    expect(route?.agentDefinitionId).toBe(specialist.id);
  });
});
