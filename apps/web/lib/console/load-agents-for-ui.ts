import {
  normalizeWorkflowInstructionContent,
  textToBlockNoteContent,
  type AgentDefinition,
} from "@ssota/contracts";
import {
  getAgentDefinitionById,
  listBuiltinAgentIds,
} from "@ssota/contracts/agents";
import { groupAgentDefinitions } from "@/lib/console/agent-groups";
import { getAgentDefinitionPort } from "@/lib/ports";

export type AgentGroup = ReturnType<typeof groupAgentDefinitions>[number];

/**
 * Teamspace DB rows plus code-defined builtins not yet overridden in the DB.
 * Builtins use stable ids from {@link BUILTIN_AGENT_IDS}.
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

  for (const id of listBuiltinAgentIds()) {
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
      isMain: builtin.isMain,
      referenceOnly: builtin.referenceOnly,
      toolBundles: builtin.toolBundles,
      nodeScopes: builtin.nodeScopes,
      runPolicy: builtin.runPolicy,
      createdAt: now,
      updatedAt: now,
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
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
