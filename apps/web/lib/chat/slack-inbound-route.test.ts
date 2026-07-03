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

  it("routes bot mentions to the main agent without a DB id fallback", async () => {
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

  it("routes bot mentions to code main when no DB main row exists", async () => {
    const route = await resolveSlackInboundRoute({
      definitions: [specialist],
      messageText: "hello",
      messageIsBotMention: true,
    });

    expect(route).toEqual({
      isMain: true,
      showTypingIndicator: true,
    });
  });

  it("continues main threads from stored builtin id without routing id", async () => {
    const route = await resolveSlackInboundRoute({
      definitions: [specialist],
      messageText: "follow up",
      messageIsBotMention: false,
      threadAgentDefinitionId: MAIN_AGENT_ID,
    });

    expect(route).toEqual({
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

describe("assertSlackMentionUserGroupUnique", () => {
  const specialistA = agent({
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
        },
      ],
    },
  });

  const specialistB = agent({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Research",
    runPolicy: {
      connectionTriggers: [
        {
          id: "slack:agent_mentioned",
          provider: "slack",
          kind: "agent_mentioned",
          label: "Agent mentioned",
          enabled: true,
          slackUserGroupId: "S0RESEARCH",
          slackUserGroupHandle: "research",
        },
      ],
    },
  });

  it("allows multiple agents with distinct user groups", async () => {
    const { assertSlackMentionUserGroupUnique } = await import(
      "./slack-inbound-route"
    );
    await expect(
      assertSlackMentionUserGroupUnique(
        [specialistA, specialistB],
        specialistB.id,
        "S0OTHERGROUP",
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects duplicate user group ids", async () => {
    const { assertSlackMentionUserGroupUnique } = await import(
      "./slack-inbound-route"
    );
    await expect(
      assertSlackMentionUserGroupUnique(
        [specialistA, specialistB],
        specialistB.id,
        "S0614NJ2P",
      ),
    ).rejects.toThrow(/already uses this Slack user group/i);
  });
});
