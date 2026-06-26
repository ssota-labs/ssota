import { notFound, redirect } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { TreePageView } from "@/lib/page-runtime/tree-page-view";
import {
  pageUsesArtifactWorkbench,
  pageUsesFillHeight,
} from "@/lib/page-runtime/spec-utils";
import { runPageAction } from "@/lib/page-runtime/run-page-action";
import {
  isHubPage,
  resolveHubRedirectPath,
} from "@/lib/page-runtime/hub-redirect";
import { getNodeDetailView } from "@/lib/graph/loaders/get-node-detail";
import { NodeDetailWorkspace } from "@/components/console/node-detail-workspace";
import { SetNodeDrill } from "@/components/console/node-drill-context";

/**
 * Node drill-in landing. Renders the node's type template "home" — the
 * lowest-position root-level template for the node's catalogKey — with the node
 * injected as `subject`. The sidebar L1 (driven by appliesToNodeType) lets the
 * user navigate the rest of the template tree.
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

  if (!home) {
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

  const context: Record<string, unknown> = {
    subjectNodeId: subject.id,
    subject: {
      id: subject.id,
      catalogKey: subject.catalogKey,
      title: subject.title,
      properties: subject.properties,
    },
  };
  const bindingData = await resolvePageBindings(
    graphRead,
    project.id,
    home.bindings,
    context,
  );
  await resolveArtifactBindings(project.id, home.bindings, bindingData);

  const fillHeight = pageUsesFillHeight(home.spec);
  const usesWorkbench = pageUsesArtifactWorkbench(home.spec);
  const basePath = `/${orgSlug}/${projectSlug}`;
  const pagePath = projectPath(routeCtx, "n", nodeId);
  const previewBasePath = projectPath(routeCtx, "design", "preview");

  async function onAction(
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    "use server";
    await runPageAction({
      projectId: project.id,
      pageId: home!.id,
      actionKey,
      input,
      subjectNodeId: subject!.id,
      revalidate: [pagePath],
    });
  }

  return (
    <div
      className={
        fillHeight
          ? "flex min-h-0 w-full flex-1 flex-col"
          : "mx-auto w-full max-w-5xl p-6"
      }
    >
      <SetNodeDrill
        nodeId={subject.id}
        catalogKey={subject.catalogKey}
        nodeTitle={subject.title}
        pageTitle={home.title}
      />
      <TreePageView
        spec={home.spec}
        bindings={home.bindings}
        bindingData={bindingData}
        basePath={basePath}
        onAction={onAction}
        artifactWorkbench={
          usesWorkbench
            ? {
                projectId: project.id,
                previewBasePath,
              }
            : null
        }
      />
    </div>
  );
}
