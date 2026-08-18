import { DEFAULT_LANDING_SEGMENT } from "@/lib/company-workspace/navigation";
import { orgPath } from "./paths";
import { getConsolePort } from "@/lib/ports";

export async function getDefaultProjectPath(userId: string): Promise<string> {
  const consolePort = getConsolePort();
  const organizations = await consolePort.listOrganizationsForUser(userId);

  if (organizations.length === 0) {
    return "/onboarding/profile";
  }

  const org = organizations[0]!;
  const projects = await consolePort.listTeamspacesForOrganization(org.id);
  if (projects.length === 0) {
    return "/onboarding/project";
  }

  return orgPath({
    orgSlug: org.slug,
    teamspaceSlug: projects[0]!.slug,
  }, DEFAULT_LANDING_SEGMENT);
}
