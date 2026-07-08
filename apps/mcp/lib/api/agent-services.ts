import { randomUUID } from "node:crypto";
import type {
  AgentDefinition,
  AgentDefinitionIndex,
  AgentTrigger,
  RunPolicy,
  ToolBundle,
} from "@ssota/contracts";
import { blockNoteContentToText, textToBlockNoteContent } from "@ssota/contracts";
import { getAgentDefinitionById } from "@ssota/contracts/agents";
import { createAgentDefinitionPort } from "@ssota/adapter-postgres";
import type { getDb } from "@/lib/ports";

type Db = ReturnType<typeof getDb>;

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  toolBundles: ToolBundle[];
  allowedTriggers: AgentTrigger[];
  linkedWorkerAgentIds: string[];
}

function serializeAgentSummary(
  entry: AgentDefinition | AgentDefinitionIndex,
): AgentSummary {
  // Surface capabilities/triggers/org-chart links so authors can verify the
  // agent org-chart from list_agents/get_agent (not only the create echo).
  const e = entry as {
    toolBundles?: ToolBundle[];
    runPolicy?: RunPolicy;
  };
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    toolBundles: e.toolBundles ?? [],
    allowedTriggers: e.runPolicy?.allowedTriggers ?? [],
    linkedWorkerAgentIds: e.runPolicy?.linkedWorkerAgentIds ?? [],
  };
}

export async function listAgentsForMcp(db: Db, teamspaceId: string) {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const index = await port.listDefinitions();
  // listDefinitions returns a thin index (no runPolicy); fetch full defs so the
  // org-chart (triggers + links) is visible from list_agents, not just get_agent.
  const agents = await Promise.all(
    index.map(async (item) => {
      const full = await port.getById(item.id);
      return serializeAgentSummary(full ?? item);
    }),
  );
  return { agents };
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
    toolBundles: builtin.toolBundles ?? [],
    allowedTriggers: builtin.runPolicy?.allowedTriggers ?? [],
    linkedWorkerAgentIds: builtin.runPolicy?.linkedWorkerAgentIds ?? [],
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

/**
 * S3 — author an agent definition (upsert by id). The playbook is markdown in
 * `body`; `toolBundles`/`runPolicy` (triggers, model) are validated by
 * AgentDefinitionSeedSchema in the port (bad enum values reject). Omit id to
 * create. Builder scope (no accountId).
 */
export async function createAgentDefinitionForMcp(
  db: Db,
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const runPolicy: RunPolicy = {};
  if (typeof input.model === "string") runPolicy.model = input.model;
  if (typeof input.maxSteps === "number") runPolicy.maxSteps = input.maxSteps;
  if (input.allowedTriggers !== undefined)
    runPolicy.allowedTriggers = input.allowedTriggers as AgentTrigger[];
  if (input.linkedWorkerAgentIds !== undefined)
    runPolicy.linkedWorkerAgentIds = input.linkedWorkerAgentIds as string[];
  const saved = await port.upsertDefinition({
    id: (input.id as string | undefined) ?? randomUUID(),
    name: String(input.name),
    description: (input.description as string | undefined) ?? "",
    instructions: textToBlockNoteContent(String(input.body ?? "")),
    toolBundles: ((input.toolBundles as string[] | undefined) ??
      []) as ToolBundle[],
    nodeScopes: [],
    runPolicy,
  });
  return {
    id: saved.id,
    name: saved.name,
    description: saved.description,
    toolBundles: saved.toolBundles,
    runPolicy: saved.runPolicy,
  };
}

/** @deprecated Use listAgentsForMcp */
export const listWorkflowsForMcp = listAgentsForMcp;

/** @deprecated Use getAgentForMcp */
export const getWorkflowForMcp = getAgentForMcp;

/** @deprecated Use getAgentInstructionForMcp */
export const getWorkflowInstructionForMcp = getAgentInstructionForMcp;
