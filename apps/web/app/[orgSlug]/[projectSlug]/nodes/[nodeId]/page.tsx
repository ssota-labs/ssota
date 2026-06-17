import { notFound } from "next/navigation";
import { NodeDetailWorkspace } from "@/components/console/node-detail-workspace";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getNodeDetailView } from "@/lib/graph/loaders/get-node-detail";

export default async function NodeDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; nodeId: string }>;
}) {
  const { orgSlug, projectSlug, nodeId } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const detail = await getNodeDetailView(ctx, project.id, nodeId);

  if (!detail) {
    notFound();
  }

  return (
    <NodeDetailWorkspace
      projectId={project.id}
      detail={detail}
      nodesBasePath={projectPath(ctx, "nodes")}
      revalidatePath={projectPath(ctx, "nodes", nodeId)}
    />
  );
}
