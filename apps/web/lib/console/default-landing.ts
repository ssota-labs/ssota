import { projectPath } from "./paths";
import { getConsolePort } from "@/lib/ports";

export async function getDefaultProjectPath(userId: string): Promise<string> {
  const consolePort = getConsolePort();
  const organizations = await consolePort.listOrganizationsForUser(userId);

  if (organizations.length === 0) {
    return "/onboarding/profile";
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
