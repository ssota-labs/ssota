"use server";

import {
  BlockNoteContentSchema,
  UpdateTeamspaceMainConfigInputSchema,
  UpsertAgentDefinitionInputSchema,
} from "@ssota/contracts";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAgentDefinitionPort, getTeamspaceMainConfigPort } from "@/lib/ports";
import { createSlackUserGroupForAgent } from "@ssota/agent-runtime";
import { getSlackBotTokenForTeamspace } from "@/lib/chat/slack-token";
import {
  assertSlackMentionUserGroupUnique,
  listTeamspaceAgentDefinitions,
} from "@/lib/chat/slack-inbound-route";

export async function updateAgentDefinitionAction(
  teamspaceId: string,
  input: {
    id: string;
    name: string;
    description?: string;
    instructions: unknown;
    toolBundles?: string[];
    runPolicy?: {
      model?: string;
      allowedTriggers?: string[];
      linkedWorkerAgentIds?: string[];
      enabledConnectorProviders?: string[];
      connectorBindings?: Array<{
        connectionId: string;
        provider: string;
        scope: "user" | "org";
        accountLabel?: string;
      }>;
      connectionTriggers?: Array<{
        id: string;
        provider: string;
        kind: string;
        label: string;
        enabled?: boolean;
        slackUserGroupId?: string;
        slackUserGroupHandle?: string;
        showTypingIndicator?: boolean;
      }>;
      maxSteps?: number;
      sandboxPolicy?: "none" | "optional" | "required";
      approvalPolicy?: "none" | "gate" | "human";
      timeoutMs?: number;
    };
    scriptToolIds?: string[];
    linkedWorkerIds?: string[];
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = UpsertAgentDefinitionInputSchema.parse({
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    instructions: BlockNoteContentSchema.parse(input.instructions),
    toolBundles: input.toolBundles,
    runPolicy: input.runPolicy,
  });

  const port = getAgentDefinitionPort(teamspaceId);
  const definitions = await listTeamspaceAgentDefinitions(
    () => port.listDefinitions(),
    (id) => port.getById(id),
  );
  const mainConfig = await getTeamspaceMainConfigPort().getMainConfig(teamspaceId);
  for (const trigger of parsed.runPolicy.connectionTriggers ?? []) {
    if (
      trigger.id === "slack:agent_mentioned" &&
      trigger.enabled &&
      trigger.slackUserGroupId
    ) {
      await assertSlackMentionUserGroupUnique(
        definitions,
        mainConfig,
        parsed.id,
        trigger.slackUserGroupId,
      );
    }
  }

  await port.upsertDefinition(parsed);

  const workerIds = input.linkedWorkerIds ?? input.scriptToolIds;
  if (workerIds) {
    const { getWorkerPort } = await import("@/lib/ports");
    await getWorkerPort(teamspaceId).setAgentWorkers(input.id, workerIds);
  }

  for (const path of withConsolePaths(["/agents"])) {
    revalidatePath(path);
  }
}

/** @deprecated Use updateAgentDefinitionAction */
export const updateWorkflowInstructionAction = updateAgentDefinitionAction;

export async function updateTeamspaceMainConfigAction(
  teamspaceId: string,
  input: {
    instructions?: unknown;
    toolBundles?: string[];
    runPolicy?: {
      model?: string;
      allowedTriggers?: string[];
      linkedWorkerAgentIds?: string[];
      enabledConnectorProviders?: string[];
      connectorBindings?: Array<{
        connectionId: string;
        provider: string;
        scope: "user" | "org";
        accountLabel?: string;
      }>;
      connectionTriggers?: Array<{
        id: string;
        provider: string;
        kind: string;
        label: string;
        enabled?: boolean;
        slackUserGroupId?: string;
        slackUserGroupHandle?: string;
        showTypingIndicator?: boolean;
      }>;
      maxSteps?: number;
      sandboxPolicy?: "none" | "optional" | "required";
      approvalPolicy?: "none" | "gate" | "human";
      timeoutMs?: number;
    };
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = UpdateTeamspaceMainConfigInputSchema.parse({
    instructions: input.instructions
      ? BlockNoteContentSchema.parse(input.instructions)
      : undefined,
    toolBundles: input.toolBundles,
    runPolicy: input.runPolicy,
  });

  const port = getAgentDefinitionPort(teamspaceId);
  const definitions = await listTeamspaceAgentDefinitions(
    () => port.listDefinitions(),
    (id) => port.getById(id),
  );
  for (const trigger of parsed.runPolicy?.connectionTriggers ?? []) {
    if (
      trigger.id === "slack:agent_mentioned" &&
      trigger.enabled &&
      trigger.slackUserGroupId
    ) {
      await assertSlackMentionUserGroupUnique(
        definitions,
        null,
        null,
        trigger.slackUserGroupId,
      );
    }
  }

  await getTeamspaceMainConfigPort().updateMainConfig(teamspaceId, parsed);

  for (const path of withConsolePaths(["/agents"])) {
    revalidatePath(path);
  }
}

export async function provisionSlackAgentMentionTriggerAction(
  teamspaceId: string,
  input: { agentDefinitionId: string; agentName: string },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const token = await getSlackBotTokenForTeamspace(teamspaceId);
  if (!token) {
    throw new Error(
      "Connect Slack on the Channels page before adding a Slack mention trigger.",
    );
  }

  const created = await createSlackUserGroupForAgent(
    token,
    input.agentName,
    `SSOTA agent — mention @${input.agentName} in Slack to run this agent.`,
  );

  return {
    slackUserGroupId: created.id,
    slackUserGroupHandle: created.handle,
  };
}
