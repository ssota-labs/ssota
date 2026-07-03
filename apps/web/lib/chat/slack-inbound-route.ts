import type { AgentDefinition, RunPolicy, TeamspaceMainConfig } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import { parseSlackUserGroupMentions } from "./slack-mentions";

export type SlackInboundRoute = {
  agentDefinitionId: string;
  isMain: boolean;
  showTypingIndicator: boolean;
};

const SLACK_AGENT_MENTION_TRIGGER_ID = "slack:agent_mentioned";

function slackMentionTrigger(runPolicy: RunPolicy | undefined) {
  return runPolicy?.connectionTriggers?.find(
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
  mainConfig?: Pick<TeamspaceMainConfig, "runPolicy"> | null;
  messageText: string;
  messageIsBotMention: boolean;
  threadAgentDefinitionId?: string | null;
}): Promise<SlackInboundRoute | null> {
  const mentions = parseSlackUserGroupMentions(input.messageText);

  if (mentions.length > 0) {
    for (const definition of input.definitions) {
      const trigger = slackMentionTrigger(definition.runPolicy);
      if (!trigger || !matchesUserGroup(trigger, mentions)) continue;
      return {
        agentDefinitionId: definition.id,
        isMain: false,
        showTypingIndicator: trigger.showTypingIndicator !== false,
      };
    }
  }

  if (input.messageIsBotMention) {
    const mainTrigger = slackMentionTrigger(input.mainConfig?.runPolicy);
    return {
      agentDefinitionId: MAIN_AGENT_ID,
      isMain: true,
      showTypingIndicator: mainTrigger?.showTypingIndicator !== false,
    };
  }

  if (input.threadAgentDefinitionId) {
    const isMain = input.threadAgentDefinitionId === MAIN_AGENT_ID;
    const definition = isMain
      ? null
      : input.definitions.find((d) => d.id === input.threadAgentDefinitionId);
    const trigger = isMain
      ? slackMentionTrigger(input.mainConfig?.runPolicy)
      : definition
        ? slackMentionTrigger(definition.runPolicy)
        : undefined;
    return {
      agentDefinitionId: input.threadAgentDefinitionId,
      isMain,
      showTypingIndicator: trigger?.showTypingIndicator !== false,
    };
  }

  return null;
}

/** Reject duplicate Slack user-group ids across project agent + runnable agents. */
export async function assertSlackMentionUserGroupUnique(
  definitions: AgentDefinition[],
  mainConfig: Pick<TeamspaceMainConfig, "runPolicy"> | null | undefined,
  agentDefinitionId: string | null,
  slackUserGroupId: string,
): Promise<void> {
  if (agentDefinitionId !== null) {
    const mainTrigger = slackMentionTrigger(mainConfig?.runPolicy);
    if (
      mainTrigger?.enabled &&
      mainTrigger.slackUserGroupId === slackUserGroupId
    ) {
      throw new Error(
        "The project agent already uses this Slack user group.",
      );
    }
  }

  for (const definition of definitions) {
    if (agentDefinitionId && definition.id === agentDefinitionId) continue;
    const trigger = slackMentionTrigger(definition.runPolicy);
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
