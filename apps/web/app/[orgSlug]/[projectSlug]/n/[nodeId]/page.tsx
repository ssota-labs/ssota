import { notFound, redirect } from "next/navigation";
import { resolveOrg } from "@/lib/console/resolve-project";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
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
  params: Promise<{ orgSlug: string; teamspaceSlug: string; nodeId: string }>;
}) {
  const { orgSlug, teamspaceSlug, nodeId } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);

  const graphRead = getGraphPorts(project.id).graphRead;
  const subject = await graphRead.getNodeById(nodeId);
  if (!subject || subject.teamspaceId !== project.id) notFound();

  const templates = await getPagePort(project.id).listTemplatesForNodeType(
    subject.catalogKey,
  );
  const home =
    templates
      .filter((p) => !p.parentId)
      .sort((a, b) => a.position - b.position)[0] ?? null;

  const routeCtx: OrgRouteContext = { orgSlug, teamspaceSlug };
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
    redirect(orgPath(routeCtx, "n", nodeId, "p", home.id));
  }

  const ctx = { orgSlug, teamspaceSlug };
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
        teamspaceId={project.id}
        detail={detail}
        nodesBasePath={orgPath(ctx, "n")}
        revalidatePath={orgPath(ctx, "n", nodeId)}
      />
    </>
  );
}
