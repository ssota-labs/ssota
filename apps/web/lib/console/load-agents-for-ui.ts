import {
  normalizeWorkflowInstructionContent,
  type AgentDefinition,
  type TeamspaceMainConfig,
} from "@ssota/contracts";
import { MAIN_AGENT_ID, getMainAgentDefinition } from "@ssota/contracts/agents";
import { getAgentDefinitionPort } from "@/lib/ports";

/** User-created agent definitions stored for this teamspace (DB only). */
export async function loadAgentDefinitionsForUi(
  teamspaceId: string,
): Promise<AgentDefinition[]> {
  const port = getAgentDefinitionPort(teamspaceId);
  const indices = await port.listDefinitions();
  const rows = (
    await Promise.all(indices.map((entry) => port.getById(entry.id)))
  ).filter((entry): entry is AgentDefinition => entry !== null);

  return rows
    .map((row) => ({
      ...row,
      instructions: normalizeWorkflowInstructionContent(row.instructions),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

/** @deprecated Use loadAgentDefinitionsForUi */
export const loadWorkflowInstructionsForUi = loadAgentDefinitionsForUi;
