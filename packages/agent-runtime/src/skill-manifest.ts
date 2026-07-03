import type { SkillIndex } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import type { SkillPort } from "@ssota/core";

/** Bound skills for an agent, with platform builtin fallback for main. */
export async function resolveSkillManifest(
  port: SkillPort,
  organizationId: string,
  agentDefinitionId: string,
): Promise<SkillIndex[]> {
  const bound = await port.listForAgentDefinition(agentDefinitionId);
  if (bound.length > 0) return bound;

  if (agentDefinitionId === BUILTIN_AGENT_IDS.main) {
    const catalog = await port.listForOrganization(organizationId);
    return catalog.filter((s) => s.source === "builtin");
  }

  return [];
}
