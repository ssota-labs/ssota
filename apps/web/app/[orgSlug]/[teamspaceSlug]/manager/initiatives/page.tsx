import { notFound, redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getPagePort } from "@/lib/ports";

/** Legacy slug URL → dynamic page id (`pages.slug = manager/initiatives`). */
export default async function ManagerInitiativesRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const page = await getPagePort(project.id).getPageBySlug("manager/initiatives");
  if (!page) {
    notFound();
  }
  redirect(orgPath({ orgSlug, teamspaceSlug }, "p", page.id));
}
