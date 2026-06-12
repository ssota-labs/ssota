import { cache } from "react";
import { notFound } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import { getConsolePort } from "@/lib/ports";

export type ResolvedProject = {
  org: Organization;
  project: Project;
};

export const resolveProject = cache(async (
  orgSlug: string,
  projectSlug: string,
): Promise<ResolvedProject> => {
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const project = await consolePort.getProjectBySlug(org.id, projectSlug);
  if (!project) notFound();

  return { org, project };
});
