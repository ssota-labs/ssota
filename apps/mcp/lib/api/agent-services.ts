import type { AgentDefinition } from "@ssota/contracts";
import { blockNoteContentToText } from "@ssota/contracts";
import {
  getAgentDefinitionByKey,
  listRoutableAgentIndex,
} from "@ssota/contracts/agents";
import { createAgentDefinitionPort } from "@ssota/adapter-postgres";
import type { getDb } from "@/lib/ports";

type Db = ReturnType<typeof getDb>;

export interface AgentSummary {
  id: string | null;
  key: string;
  name: string;
  description: string;
  agentKind?: string;
}

function serializeAgentSummary(entry: AgentDefinition): AgentSummary {
  return {
    id: entry.id,
    key: entry.key,
    name: entry.name,
    description: entry.description,
    agentKind: entry.agentKind,
  };
}

export async function listAgentsForMcp(db: Db, teamspaceId: string) {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const items = await port.listDefinitions();
  const dbKeys = new Set(items.map((w) => w.key));
  const builtins: AgentSummary[] = listRoutableAgentIndex()
    .filter((b) => !dbKeys.has(b.key))
    .map((b) => ({ id: null, ...b }));
  return { agents: [...items, ...builtins] };
}

export async function getAgentForMcp(
  db: Db,
  teamspaceId: string,
  agentKey: string,
): Promise<AgentSummary | null> {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const entry = await port.getByKey(agentKey);
  if (entry) return serializeAgentSummary(entry);
  const builtin = getAgentDefinitionByKey(agentKey);
  if (!builtin) return null;
  return {
    id: null,
    key: builtin.agentKey,
    name: builtin.title,
    description: builtin.description,
    agentKind: builtin.agentKind,
  };
}

export async function getAgentInstructionForMcp(
  db: Db,
  teamspaceId: string,
  agentKey: string,
) {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const entry = await port.getByKey(agentKey);
  if (entry) {
    return {
      agentKey: entry.key,
      instruction: blockNoteContentToText(entry.instructions),
    };
  }
  const builtin = getAgentDefinitionByKey(agentKey);
  if (!builtin) return null;
  return { agentKey: builtin.agentKey, instruction: builtin.instruction };
}

/** @deprecated Use listAgentsForMcp */
export const listWorkflowsForMcp = listAgentsForMcp;

/** @deprecated Use getAgentForMcp */
export const getWorkflowForMcp = getAgentForMcp;

/** @deprecated Use getAgentInstructionForMcp */
export const getWorkflowInstructionForMcp = getAgentInstructionForMcp;
