import {
  normalizeWorkflowInstructionContent,
  textToBlockNoteContent,
  type AgentDefinition,
  type TeamspaceMainConfig,
} from "@ssota/contracts";
import {
  getAgentDefinitionById,
  listRunnableBuiltinAgentIds,
  MAIN_AGENT_ID,
  getMainAgentDefinition,
} from "@ssota/contracts/agents";
import { groupAgentDefinitions } from "@/lib/console/agent-groups";
import { getAgentDefinitionPort } from "@/lib/ports";

export type AgentGroup = ReturnType<typeof groupAgentDefinitions>[number];

/**
 * Teamspace DB rows plus runnable code-defined builtins not yet overridden in the DB.
 */
export async function loadAgentDefinitionsForUi(
  teamspaceId: string,
): Promise<AgentDefinition[]> {
  const port = getAgentDefinitionPort(teamspaceId);
  const indices = await port.listDefinitions();
  const dbRows = (
    await Promise.all(indices.map((entry) => port.getById(entry.id)))
  ).filter((entry): entry is AgentDefinition => entry !== null);

  const byId = new Map(
    dbRows.map((row) => [
      row.id,
      {
        ...row,
        instructions: normalizeWorkflowInstructionContent(row.instructions),
      },
    ]),
  );

  for (const id of listRunnableBuiltinAgentIds()) {
    if (byId.has(id)) continue;
    const builtin = getAgentDefinitionById(id);
    if (!builtin) continue;
    const now = new Date(0).toISOString();
    byId.set(id, {
      id: builtin.id,
      teamspaceId,
      accountId: null,
      name: builtin.title,
      description: builtin.description,
      instructions: normalizeWorkflowInstructionContent(
        textToBlockNoteContent(builtin.instruction),
      ),
      toolBundles: builtin.toolBundles,
      nodeScopes: builtin.nodeScopes,
      runPolicy: builtin.runPolicy,
      createdAt: now,
      updatedAt: now,
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function mainConfigToAgentDefinition(
  teamspaceId: string,
  config: TeamspaceMainConfig,
): AgentDefinition {
  const builtin = getMainAgentDefinition();
  return {
    id: MAIN_AGENT_ID,
    teamspaceId,
    accountId: null,
    name: "Project agent",
    description: builtin.description,
    instructions: normalizeWorkflowInstructionContent(config.instructions),
    toolBundles: config.toolBundles,
    nodeScopes: [],
    runPolicy: config.runPolicy,
    createdAt: config.updatedAt,
    updatedAt: config.updatedAt,
  };
}

export async function loadAgentGroupsForUi(
  teamspaceId: string,
): Promise<AgentGroup[]> {
  const definitions = await loadAgentDefinitionsForUi(teamspaceId);
  return groupAgentDefinitions(definitions);
}

/** @deprecated Use loadAgentDefinitionsForUi */
export const loadWorkflowInstructionsForUi = loadAgentDefinitionsForUi;

/** @deprecated Use loadAgentGroupsForUi */
export const loadWorkflowInstructionGroupsForUi = loadAgentGroupsForUi;

/** @deprecated Use AgentGroup */
export type WorkflowInstructionGroup = AgentGroup;
