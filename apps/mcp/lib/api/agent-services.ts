import type { AgentDefinition, AgentDefinitionIndex } from "@ssota/contracts";
import { blockNoteContentToText } from "@ssota/contracts";
import {
  getAgentDefinitionById,
  listRunnableBuiltinAgentIds,
} from "@ssota/contracts/agents";
import { createAgentDefinitionPort } from "@ssota/adapter-postgres";
import type { getDb } from "@/lib/ports";

type Db = ReturnType<typeof getDb>;

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

function serializeAgentSummary(
  entry: AgentDefinition | AgentDefinitionIndex,
): AgentSummary {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
  };
}

export async function listAgentsForMcp(db: Db, teamspaceId: string) {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const items = await port.listDefinitions();
  const dbIds = new Set(items.map((w) => w.id));
  const builtins: AgentSummary[] = listRunnableBuiltinAgentIds()
    .filter((id) => !dbIds.has(id))
    .map((id) => {
      const builtin = getAgentDefinitionById(id)!;
      return {
        id: builtin.id,
        name: builtin.title,
        description: builtin.description,
      };
    });
  return { agents: [...items.map(serializeAgentSummary), ...builtins] };
}

export async function getAgentForMcp(
  db: Db,
  teamspaceId: string,
  agentDefinitionId: string,
): Promise<AgentSummary | null> {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const entry = await port.getById(agentDefinitionId);
  if (entry) return serializeAgentSummary(entry);
  const builtin = getAgentDefinitionById(agentDefinitionId);
  if (!builtin) return null;
  return {
    id: builtin.id,
    name: builtin.title,
    description: builtin.description,
  };
}

export async function getAgentInstructionForMcp(
  db: Db,
  teamspaceId: string,
  agentDefinitionId: string,
) {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const entry = await port.getById(agentDefinitionId);
  if (entry) {
    return {
      agentDefinitionId: entry.id,
      instruction: blockNoteContentToText(entry.instructions),
    };
  }
  const builtin = getAgentDefinitionById(agentDefinitionId);
  if (!builtin) return null;
  return {
    agentDefinitionId: builtin.id,
    instruction: builtin.instruction,
  };
}

/** @deprecated Use listAgentsForMcp */
export const listWorkflowsForMcp = listAgentsForMcp;

/** @deprecated Use getAgentForMcp */
export const getWorkflowForMcp = getAgentForMcp;

/** @deprecated Use getAgentInstructionForMcp */
export const getWorkflowInstructionForMcp = getAgentInstructionForMcp;
