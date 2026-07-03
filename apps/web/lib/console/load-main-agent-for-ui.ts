import { getTeamspaceMainConfigPort } from "@/lib/ports";
import { mainConfigToAgentDefinition } from "@/lib/console/load-agents-for-ui";

export async function loadMainAgentDefinitionForUi(teamspaceId: string) {
  const config = await getTeamspaceMainConfigPort().getMainConfig(teamspaceId);
  if (!config) {
    throw new Error(`Teamspace ${teamspaceId} not found`);
  }
  return mainConfigToAgentDefinition(teamspaceId, config);
}
