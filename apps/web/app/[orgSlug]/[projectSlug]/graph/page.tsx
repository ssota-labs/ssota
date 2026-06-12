import { redirect } from "next/navigation";
import { getCachedNodeCatalog } from "@/lib/console/cached-catalog";
import { graphPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const nodeTypes = await getCachedNodeCatalog(project.id);

  if (nodeTypes[0]) {
    redirect(
      `${graphPath(ctx, "nodes")}?table=${encodeURIComponent(nodeTypes[0].slug)}`,
    );
  }

  redirect(graphPath(ctx, "nodes"));
}
