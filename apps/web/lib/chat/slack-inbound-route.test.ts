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

  const mainConfig = {
    teamspaceId: "00000000-0000-4000-8000-000000000001",
    instructions: [],
    toolBundles: [],
    runPolicy: {
      connectionTriggers: [
        {
          id: "slack:agent_mentioned",
          provider: "slack",
          kind: "agent_mentioned",
          label: "Agent mentioned",
          enabled: true,
          showTypingIndicator: true,
        },
      ],
    },
    updatedAt: new Date(0).toISOString(),
  };

  it("routes user-group mentions to the matching specialist", async () => {
    const route = await resolveSlackInboundRoute({
      definitions: [specialist],
      mainConfig,
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
      definitions: [specialist],
      mainConfig,
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
      definitions: [specialist],
      mainConfig,
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
        null,
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
        null,
        specialistB.id,
        "S0614NJ2P",
      ),
    ).rejects.toThrow(/already uses this Slack user group/i);
  });

  it("rejects specialist group that conflicts with project agent", async () => {
    const { assertSlackMentionUserGroupUnique } = await import(
      "./slack-inbound-route"
    );
    await expect(
      assertSlackMentionUserGroupUnique(
        [specialistA],
        {
          runPolicy: {
            connectionTriggers: [
              {
                id: "slack:agent_mentioned",
                provider: "slack",
                kind: "agent_mentioned",
                label: "Agent mentioned",
                enabled: true,
                slackUserGroupId: "S0MAIN",
              },
            ],
          },
        },
        specialistA.id,
        "S0MAIN",
      ),
    ).rejects.toThrow(/project agent already uses/i);
  });
});
