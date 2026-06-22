import type { Organization, Project } from "@ssota/core";
import { createConsolePort } from "@ssota/adapter-postgres";
import { getDb } from "@/lib/ports";

export type ResolvedProjectAccess = {
  org: Organization;
  project: Project;
};

/** org/project slug → project row + membership check (Console과 동일 규칙). */
export async function resolveProjectAccess(
  userId: string,
  orgSlug: string,
  projectSlug: string,
): Promise<ResolvedProjectAccess | null> {
  const consolePort = createConsolePort(getDb());
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) return null;

  const memberships = await consolePort.listOrganizationsForUser(userId);
  if (!memberships.some((entry: Organization) => entry.id === org.id)) {
    return null;
  }

  const project = await consolePort.getProjectBySlug(org.id, projectSlug);
  if (!project) return null;

  return { org, project };
}
