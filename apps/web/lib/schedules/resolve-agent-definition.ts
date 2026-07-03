import { getAgentDefinitionPort } from "@/lib/ports";

/** Resolve a schedule target to a persisted user agent definition id. */
export async function resolveAgentDefinitionId(
  teamspaceId: string,
  definitionId: string,
): Promise<string | null> {
  const port = getAgentDefinitionPort(teamspaceId);
  const existing = await port.getById(definitionId);
  return existing?.id ?? null;
}

/** @deprecated Use resolveAgentDefinitionId */
export const resolveWorkflowInstructionId = resolveAgentDefinitionId;
