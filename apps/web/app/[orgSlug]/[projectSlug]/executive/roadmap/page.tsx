import { notFound, redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getPagePort } from "@/lib/ports";

/** Legacy slug URL → dynamic page id (`pages.slug = executive/roadmap`). */
export default async function ExecutiveRoadmapRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const page = await getPagePort(project.id).getPageBySlug("executive/roadmap");
  if (!page) {
    notFound();
  }
  redirect(projectPath({ orgSlug, projectSlug }, "p", page.id));
}
