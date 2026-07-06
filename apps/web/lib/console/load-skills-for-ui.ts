import type { SkillIndex } from "@ssota/contracts";
import {
  getCachedOrganizationIdForTeamspace,
  getDb,
  getSkillPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
} from "@/lib/ports";

export async function loadSkillsForUi(
  teamspaceId: string,
): Promise<SkillIndex[]> {
  const port = await getSkillPort(teamspaceId);
  let organizationId = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(
      getDb(),
      teamspaceId,
    );
    registerTeamspaceOrganization(teamspaceId, organizationId);
  }
  return port.listLibrarySkills(organizationId);
}
