import {
  markdownToBlockNoteContent,
  normalizeWorkflowInstructionContent,
  type AgentDefinition,
} from "@ssota/contracts";
import {
  getAgentDefinitionByKey,
  listAgentDefinitionKeys,
  listRoutableAgentIndex,
} from "@ssota/contracts/agents";
import { groupAgentDefinitions } from "@/lib/console/agent-groups";
import { getAgentDefinitionPort } from "@/lib/ports";

export type AgentGroup = ReturnType<typeof groupAgentDefinitions>[number];

const VIRTUAL_ID_PREFIX = "virtual:";

export function isVirtualAgentDefinitionId(id: string): boolean {
  return id.startsWith(VIRTUAL_ID_PREFIX);
}

/** @deprecated Use isVirtualAgentDefinitionId */
export const isVirtualWorkflowInstructionId = isVirtualAgentDefinitionId;

function virtualDefinition(
  teamspaceId: string,
  key: string,
  name: string,
  description: string,
  instructionText: string,
  agentKind: AgentDefinition["agentKind"],
): AgentDefinition {
  const now = new Date(0).toISOString();
  return {
    id: `${VIRTUAL_ID_PREFIX}${key}`,
    teamspaceId,
    accountId: null,
    key,
    name,
    description,
    instructions: normalizeWorkflowInstructionContent(
      markdownToBlockNoteContent(instructionText),
    ),
    agentKind,
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Teamspace DB rows plus code-defined builtins not yet overridden in the DB.
 * Virtual rows use ids `virtual:{key}` until the user saves.
 */
export async function loadAgentDefinitionsForUi(
  teamspaceId: string,
): Promise<AgentDefinition[]> {
  const port = getAgentDefinitionPort(teamspaceId);
  const indices = await port.listDefinitions();
  const dbRows = (
    await Promise.all(indices.map((entry) => port.getById(entry.id)))
  ).filter((entry): entry is AgentDefinition => entry !== null);

  const byKey = new Map(
    dbRows.map((row) => [
      row.key,
      {
        ...row,
        instructions: normalizeWorkflowInstructionContent(row.instructions),
      },
    ]),
  );

  for (const builtin of listRoutableAgentIndex()) {
    if (byKey.has(builtin.key)) continue;
    const definition = getAgentDefinitionByKey(builtin.key);
    if (!definition) continue;
    byKey.set(
      builtin.key,
      virtualDefinition(
        teamspaceId,
        builtin.key,
        builtin.name,
        builtin.description,
        definition.instruction,
        definition.agentKind,
      ),
    );
  }

  for (const key of listAgentDefinitionKeys()) {
    if (byKey.has(key)) continue;
    const definition = getAgentDefinitionByKey(key);
    if (!definition) continue;
    byKey.set(
      key,
      virtualDefinition(
        teamspaceId,
        key,
        definition.title,
        definition.description,
        definition.instruction,
        definition.agentKind,
      ),
    );
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
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
