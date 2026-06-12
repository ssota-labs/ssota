import type { Organization } from "@ssota/core";
import { createConsolePort } from "@ssota/adapter-supabase";
import { getDb } from "@/lib/ports";

export async function listOrganizationsForUser(userId: string) {
  const consolePort = createConsolePort(getDb());
  return consolePort.listOrganizationsForUser(userId);
}

export async function listProjectsForUser(userId: string, orgSlug?: string) {
  const consolePort = createConsolePort(getDb());
  let orgs = await consolePort.listOrganizationsForUser(userId);

  if (orgSlug) {
    const org = await consolePort.getOrganizationBySlug(orgSlug);
    if (!org || !orgs.some((entry: Organization) => entry.id === org.id)) {
      return [];
    }
    orgs = [org];
  }

  const results: Array<{
    organization: { id: string; slug: string; name: string };
    project: { id: string; slug: string; name: string };
    mcpUrl: string;
  }> = [];

  for (const org of orgs) {
    const projects = await consolePort.listProjectsForOrganization(org.id);
    for (const project of projects) {
      results.push({
        organization: { id: org.id, slug: org.slug, name: org.name },
        project: { id: project.id, slug: project.slug, name: project.name },
        mcpUrl: `/api/mcp?org=${encodeURIComponent(org.slug)}&project=${encodeURIComponent(project.slug)}`,
      });
    }
  }

  return results;
}

export async function getProjectForUser(
  userId: string,
  orgSlug: string,
  projectSlug: string,
) {
  const consolePort = createConsolePort(getDb());
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) return null;

  const memberships = await consolePort.listOrganizationsForUser(userId);
  if (!memberships.some((entry: Organization) => entry.id === org.id)) return null;

  const project = await consolePort.getProjectBySlug(org.id, projectSlug);
  if (!project) return null;

  return {
    organization: { id: org.id, slug: org.slug, name: org.name },
    project: { id: project.id, slug: project.slug, name: project.name },
    mcpUrl: `/api/mcp?org=${encodeURIComponent(org.slug)}&project=${encodeURIComponent(project.slug)}`,
  };
}
