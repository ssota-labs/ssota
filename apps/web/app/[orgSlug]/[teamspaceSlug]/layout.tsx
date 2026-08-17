import { headers } from "next/headers";
import { enforceBuilderEntitlement, getConsoleRelativePath } from "@/lib/billing/entitlement-gate";
import { isCompanyWorkspaceRelativePath } from "@/lib/company-workspace/navigation";
import { resolveOrg } from "@/lib/console/resolve-project";
import { resolveBuilderContext } from "@/lib/request-context";
import { registerTeamspaceOrganization } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const requestHeaders = await headers();
  const headerPath = requestHeaders.get("x-pathname");
  const returnTo =
    headerPath?.startsWith(`/${orgSlug}/`) || headerPath === `/${orgSlug}`
      ? headerPath
      : `/${orgSlug}/${teamspaceSlug}`;

  const builder = await resolveBuilderContext(orgSlug, teamspaceSlug);
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  registerTeamspaceOrganization(project.id, org.id);

  const relativePath = getConsoleRelativePath(returnTo, orgSlug, teamspaceSlug);
  await enforceBuilderEntitlement({
    organizationId: org.id,
    orgSlug,
    relativePath,
  });

  if (isCompanyWorkspaceRelativePath(relativePath)) {
    return children;
  }

  const user = await getCurrentUser();
  const { ConsoleShellLayoutView } = await import("./console-shell-layout-view");
  return (
    <ConsoleShellLayoutView
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      org={org}
      project={project}
      userId={builder.userId}
      userEmail={user?.email ?? ""}
      returnTo={returnTo}
    >
      {children}
    </ConsoleShellLayoutView>
  );
}
