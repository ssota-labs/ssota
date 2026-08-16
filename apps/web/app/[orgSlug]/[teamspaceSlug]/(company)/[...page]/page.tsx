import { notFound, redirect } from "next/navigation";
import { CompanyWorkspacePage } from "@/components/company-workspace/company-workspace-page";
import { companyWorkspacePageIdFromSlug } from "@/lib/company-workspace/navigation";
import { orgPath } from "@/lib/console/paths";

export default async function CompanyWorkspaceCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string; page: string[] }>;
}) {
  const { orgSlug, teamspaceSlug, page } = await params;
  const slug = page.join("/");

  if (slug === "expert") {
    redirect(orgPath({ orgSlug, teamspaceSlug }, "expert", "portfolio"));
  }

  const pageId = companyWorkspacePageIdFromSlug(slug);
  if (!pageId) notFound();

  return <CompanyWorkspacePage pageId={pageId} />;
}
