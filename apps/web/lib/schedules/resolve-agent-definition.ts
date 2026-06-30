import { getAgentDefinitionPort } from "@/lib/ports";
import {
  isVirtualAgentDefinitionId,
  loadAgentDefinitionsForUi,
} from "@/lib/console/load-agents-for-ui";

/**
 * A schedule's `agentDefinitionId` is a real FK. The UI may hand us a
 * `virtual:{key}` id for a code-defined agent the user never saved — in that
 * case persist it (idempotent upsert) and return the resulting uuid.
 * Returns null if the id resolves to nothing.
 */
export async function resolveAgentDefinitionId(
  teamspaceId: string,
  definitionId: string,
): Promise<string | null> {
  if (!isVirtualAgentDefinitionId(definitionId)) {
    const existing = await getAgentDefinitionPort(teamspaceId).getById(
      definitionId,
    );
    return existing ? existing.id : null;
  }

  const all = await loadAgentDefinitionsForUi(teamspaceId);
  const virtual = all.find((entry) => entry.id === definitionId);
  if (!virtual) return null;

  const saved = await getAgentDefinitionPort(teamspaceId).upsertDefinition({
    key: virtual.key,
    name: virtual.name,
    description: virtual.description,
    instructions: virtual.instructions,
    agentKind: virtual.agentKind,
    toolBundles: virtual.toolBundles,
    nodeScopes: virtual.nodeScopes,
    runPolicy: virtual.runPolicy,
  });
  return saved.id;
}

/** @deprecated Use resolveAgentDefinitionId */
export const resolveWorkflowInstructionId = resolveAgentDefinitionId;
