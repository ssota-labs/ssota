import {
  AGENT_DEFINITION_SEEDS,
  isKnownBuiltinAgentId,
} from "@ssota/contracts/agents";
import { getAgentDefinitionPort } from "@/lib/ports";

/**
 * A schedule's `agentDefinitionId` is a real FK. When the UI references a
 * builtin id that is not yet persisted for this teamspace, seed it idempotently
 * and return the stable uuid.
 */
export async function resolveAgentDefinitionId(
  teamspaceId: string,
  definitionId: string,
): Promise<string | null> {
  const port = getAgentDefinitionPort(teamspaceId);
  const existing = await port.getById(definitionId);
  if (existing) return existing.id;

  if (!isKnownBuiltinAgentId(definitionId)) return null;

  const seed = AGENT_DEFINITION_SEEDS.find((entry) => entry.id === definitionId);
  if (!seed) return null;

  const saved = await port.upsertDefinition(seed);
  return saved.id;
}

/** @deprecated Use resolveAgentDefinitionId */
export const resolveWorkflowInstructionId = resolveAgentDefinitionId;
