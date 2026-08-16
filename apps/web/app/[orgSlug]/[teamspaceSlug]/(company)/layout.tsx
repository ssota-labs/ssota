import { headers } from "next/headers";
import { CompanyWorkspaceLayoutView } from "../company-workspace-layout-view";
import { getConsoleRelativePath } from "@/lib/billing/entitlement-gate";
import { resolveOrg } from "@/lib/console/resolve-project";
import { resolveBuilderContext } from "@/lib/request-context";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function CompanyWorkspaceLayout({
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
  const user = await getCurrentUser();
  const relativePath = getConsoleRelativePath(returnTo, orgSlug, teamspaceSlug);

  return (
    <CompanyWorkspaceLayoutView
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      org={org}
      project={project}
      userId={builder.userId}
      userEmail={user?.email ?? ""}
      relativePath={relativePath}
    >
      {children}
    </CompanyWorkspaceLayoutView>
  );
}
