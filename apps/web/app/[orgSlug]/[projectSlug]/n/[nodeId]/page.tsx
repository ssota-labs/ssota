import { notFound, redirect } from "next/navigation";
import { resolveProject } from "@/lib/console/resolve-project";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import {
  isHubPage,
  resolveHubRedirectPath,
} from "@/lib/page-runtime/hub-redirect";
import { getNodeDetailView } from "@/lib/graph/loaders/get-node-detail";
import { NodeDetailWorkspace } from "@/components/console/node-detail-workspace";
import { SetNodeDrill } from "@/components/console/node-drill-context";

/**
 * Node drill-in landing. When a home template exists, redirects to
 * `/n/{nodeId}/p/{homePageId}` so rendering uses a single route. Without a
 * template, falls back to {@link NodeDetailWorkspace}.
 */
export default async function NodeLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; nodeId: string }>;
}) {
  const { orgSlug, projectSlug, nodeId } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const graphRead = getGraphPorts(project.id).graphRead;
  const subject = await graphRead.getNodeById(nodeId);
  if (!subject || subject.projectId !== project.id) notFound();

  const templates = await getPagePort(project.id).listTemplatesForNodeType(
    subject.catalogKey,
  );
  const home =
    templates
      .filter((p) => !p.parentId)
      .sort((a, b) => a.position - b.position)[0] ?? null;

  const routeCtx: ProjectRouteContext = { orgSlug, projectSlug };
  if (home && isHubPage(home.spec)) {
    const hubRedirect = await resolveHubRedirectPath(
      getPagePort(project.id),
      home.id,
      routeCtx,
      nodeId,
    );
    if (hubRedirect) redirect(hubRedirect);
  }

  if (home) {
    redirect(projectPath(routeCtx, "n", nodeId, "p", home.id));
  }

  const ctx = { orgSlug, projectSlug };
  const detail = await getNodeDetailView(ctx, project.id, nodeId);
  if (!detail) notFound();
  return (
    <>
      <SetNodeDrill
        nodeId={subject.id}
        catalogKey={subject.catalogKey}
        nodeTitle={subject.title}
      />
      <NodeDetailWorkspace
        projectId={project.id}
        detail={detail}
        nodesBasePath={projectPath(ctx, "n")}
        revalidatePath={projectPath(ctx, "n", nodeId)}
      />
    </>
  );
}
