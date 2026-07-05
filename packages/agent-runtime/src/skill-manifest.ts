import type { SkillIndex } from "@ssota/contracts";
import type { SkillPort } from "@ssota/core";

/** Bound skills for an agent (ready locks only when lock metadata exists). */
export async function resolveSkillManifest(
  port: SkillPort,
  _organizationId: string,
  agentDefinitionId: string,
): Promise<SkillIndex[]> {
  return port.listForAgentDefinition(agentDefinitionId);
}
