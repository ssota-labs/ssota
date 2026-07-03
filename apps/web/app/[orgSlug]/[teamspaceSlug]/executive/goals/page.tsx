import { notFound, redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getPagePort } from "@/lib/ports";

/** Legacy slug URL → dynamic page id (`pages.slug = executive/goals`). */
export default async function ExecutiveGoalsRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const page = await getPagePort(project.id).getPageBySlug("executive/goals");
  if (!page) {
    notFound();
  }
  redirect(orgPath({ orgSlug, teamspaceSlug }, "p", page.id));
}
