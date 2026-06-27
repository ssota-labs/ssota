import { ensureTeamspaceOrganizationScope } from "@ssota/agent-runtime";

/** Durable step: register org scope for graph/catalog tool ports. */
export async function resolveTeamspaceOrgScopeStep(
  teamspaceId: string,
): Promise<string> {
  "use step";
  return ensureTeamspaceOrganizationScope(teamspaceId);
}
