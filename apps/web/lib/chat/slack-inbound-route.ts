import type { AgentDefinition } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import { parseSlackUserGroupMentions } from "./slack-mentions";

export type SlackInboundRoute = {
  agentDefinitionId: string;
  isMain: boolean;
  showTypingIndicator: boolean;
};

const SLACK_AGENT_MENTION_TRIGGER_ID = "slack:agent_mentioned";

function slackMentionTrigger(definition: AgentDefinition) {
  return definition.runPolicy.connectionTriggers?.find(
    (t) =>
      t.id === SLACK_AGENT_MENTION_TRIGGER_ID &&
      t.enabled &&
      t.provider === "slack" &&
      t.kind === "agent_mentioned",
  );
}

function matchesUserGroup(
  trigger: NonNullable<ReturnType<typeof slackMentionTrigger>>,
  mentions: ReturnType<typeof parseSlackUserGroupMentions>,
): boolean {
  if (!trigger.slackUserGroupId) return false;
  for (const mention of mentions) {
    if (mention.id === trigger.slackUserGroupId) return true;
    if (
      trigger.slackUserGroupHandle &&
      mention.handle &&
      mention.handle.toLowerCase() ===
        trigger.slackUserGroupHandle.toLowerCase()
    ) {
      return true;
    }
  }
  return false;
}

export async function listTeamspaceAgentDefinitions(
  listDefinitions: () => Promise<Array<{ id: string }>>,
  getById: (id: string) => Promise<AgentDefinition | null>,
): Promise<AgentDefinition[]> {
  const indices = await listDefinitions();
  const definitions: AgentDefinition[] = [];
  for (const index of indices) {
    const definition = await getById(index.id);
    if (definition) definitions.push(definition);
  }
  return definitions;
}

export async function resolveSlackInboundRoute(input: {
  definitions: AgentDefinition[];
  messageText: string;
  messageIsBotMention: boolean;
  threadAgentDefinitionId?: string | null;
}): Promise<SlackInboundRoute | null> {
  const mentions = parseSlackUserGroupMentions(input.messageText);

  if (mentions.length > 0) {
    for (const definition of input.definitions) {
      if (definition.isMain || definition.referenceOnly) continue;
      const trigger = slackMentionTrigger(definition);
      if (!trigger || !matchesUserGroup(trigger, mentions)) continue;
      return {
        agentDefinitionId: definition.id,
        isMain: false,
        showTypingIndicator: trigger.showTypingIndicator !== false,
      };
    }
  }

  if (input.messageIsBotMention) {
    const main =
      input.definitions.find((d) => d.isMain) ??
      input.definitions.find((d) => d.id === MAIN_AGENT_ID);
    const mainTrigger = main ? slackMentionTrigger(main) : undefined;
    return {
      agentDefinitionId: main?.id ?? MAIN_AGENT_ID,
      isMain: true,
      showTypingIndicator: mainTrigger?.showTypingIndicator !== false,
    };
  }

  if (input.threadAgentDefinitionId) {
    const definition = input.definitions.find(
      (d) => d.id === input.threadAgentDefinitionId,
    );
    const trigger = definition ? slackMentionTrigger(definition) : undefined;
    return {
      agentDefinitionId: input.threadAgentDefinitionId,
      isMain: definition?.isMain ?? input.threadAgentDefinitionId === MAIN_AGENT_ID,
      showTypingIndicator: trigger?.showTypingIndicator !== false,
    };
  }

  return null;
}

/** Reject duplicate Slack user-group ids across agents in one teamspace. */
export async function assertSlackMentionUserGroupUnique(
  definitions: AgentDefinition[],
  agentDefinitionId: string,
  slackUserGroupId: string,
): Promise<void> {
  for (const definition of definitions) {
    if (definition.id === agentDefinitionId) continue;
    const trigger = slackMentionTrigger(definition);
    if (
      trigger?.enabled &&
      trigger.slackUserGroupId === slackUserGroupId
    ) {
      throw new Error(
        "Another agent in this teamspace already uses this Slack user group.",
      );
    }
  }
}
