import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { COMPANY_WORKSPACE_ENABLED } from "@/lib/company-workspace/navigation";
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
  // 플래그 꺼짐 = 숨김. 라우트는 남기되 404 (ADR-keep-tenant-platform "숨긴 뒤 삭제").
  if (!COMPANY_WORKSPACE_ENABLED) notFound();
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
