import { getTeamspaceMainConfigPort } from "@/lib/ports";
import { mainConfigToAgentDefinition } from "@/lib/console/load-agents-for-ui";
import { mergeMainAgentConnectorBindingSeed } from "@/lib/console/agent-settings-connection-seed";

export async function loadMainAgentDefinitionForUi(teamspaceId: string) {
  const config = await getTeamspaceMainConfigPort().getMainConfig(teamspaceId);
  if (!config) {
    throw new Error(`Teamspace ${teamspaceId} not found`);
  }
  const definition = mainConfigToAgentDefinition(teamspaceId, config);
  return {
    ...definition,
    runPolicy: mergeMainAgentConnectorBindingSeed(definition.runPolicy),
  };
}
