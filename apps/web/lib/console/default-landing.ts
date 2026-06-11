import { projectPath } from "./paths";
import { getConsolePort } from "@/lib/ports";

export async function getDefaultProjectPath(userId: string): Promise<string> {
  const consolePort = getConsolePort();
  const organizations = await consolePort.listOrganizationsForUser(userId);

  if (organizations.length === 0) {
    return "/onboarding/profile";
  }

  const pref = await consolePort.getUserProjectPreference(userId);
  if (pref) {
    const org = organizations.find((item) => item.slug === pref.orgSlug);
    if (org) {
      const project = await consolePort.getProjectBySlug(org.id, pref.projectSlug);
      if (project) {
        return projectPath({
          orgSlug: pref.orgSlug,
          projectSlug: pref.projectSlug,
        });
      }
    }
  }

  const org = organizations[0]!;
  const projects = await consolePort.listProjectsForOrganization(org.id);
  if (projects.length === 0) {
    return "/onboarding/project";
  }

  return projectPath({
    orgSlug: org.slug,
    projectSlug: projects[0]!.slug,
  });
}
