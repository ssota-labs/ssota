import { cache } from "react";
import { notFound } from "next/navigation";
import type { Organization, Teamspace } from "@ssota/core";
import { getConsolePort, registerTeamspaceOrganization } from "@/lib/ports";

export type ResolvedProject = {
  org: Organization;
  project: Teamspace;
};

export const resolveOrg = cache(async (
  orgSlug: string,
  teamspaceSlug: string,
): Promise<ResolvedProject> => {
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const project = await consolePort.getTeamspaceBySlug(org.id, teamspaceSlug);
  if (!project) notFound();

  registerTeamspaceOrganization(project.id, org.id);

  return { org, project };
});
