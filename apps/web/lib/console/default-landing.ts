import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "./constants";
import { projectPath } from "./paths";

export async function getDefaultProjectPath(userId: string): Promise<string> {
  const { getConsolePort } = await import("@/lib/ports");
  const consolePort = getConsolePort();
  const pref = await consolePort.getUserProjectPreference(userId);
  if (pref) {
    return projectPath({
      orgSlug: pref.orgSlug,
      projectSlug: pref.projectSlug,
    });
  }
  return projectPath({
    orgSlug: DEFAULT_ORG_SLUG,
    projectSlug: DEFAULT_PROJECT_SLUG,
  });
}
