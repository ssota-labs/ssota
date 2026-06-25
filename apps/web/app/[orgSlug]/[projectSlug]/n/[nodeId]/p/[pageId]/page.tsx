import { notFound } from "next/navigation";
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
import { normalizeSearchParams } from "@/lib/page-runtime/search-params";
import { runPageAction } from "@/lib/page-runtime/run-page-action";
import { SetNodeDrill } from "@/components/console/node-drill-context";

/**
 * Node drill-in template renderer. Renders a node-type template page (from the
 * `pages` table, `appliesToNodeType` set) in the context of a specific subject
 * node `nodeId`: the node is injected as the binding `subject`, so the same
 * template renders per-instance (e.g. one "Features" template, scoped to each
 * initiative). Generic replacement for the per-initiative factory routes.
 */
export default async function NodeTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    nodeId: string;
    pageId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, projectSlug, nodeId, pageId } = await params;
  const urlParams = normalizeSearchParams(await searchParams);
  const { project } = await resolveProject(orgSlug, projectSlug);

  const page = await getPagePort(project.id).getPage(pageId);
  if (!page) notFound();

  const graphRead = getGraphPorts(project.id).graphRead;
  const subject = await graphRead.getNodeById(nodeId);
  if (!subject || subject.projectId !== project.id) notFound();

  const context: Record<string, unknown> = {
    searchParams: urlParams,
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
    page.bindings,
    context,
  );
  await resolveArtifactBindings(project.id, page.bindings, bindingData);

  const fillHeight = pageUsesFillHeight(page.spec);
  const usesWorkbench = pageUsesArtifactWorkbench(page.spec);
  const basePath = `/${orgSlug}/${projectSlug}`;
  const routeCtx: ProjectRouteContext = { orgSlug, projectSlug };
  const pagePath = projectPath(routeCtx, "n", nodeId, "p", pageId);
  const previewBasePath = projectPath(routeCtx, "design", "preview");

  async function onAction(
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    "use server";
    await runPageAction({
      projectId: project.id,
      pageId,
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
          ? "flex min-h-0 flex-1 flex-col"
          : "mx-auto max-w-5xl p-6"
      }
    >
      <SetNodeDrill
        nodeId={subject.id}
        catalogKey={subject.catalogKey}
        nodeTitle={subject.title}
        pageTitle={page.title}
      />
      <TreePageView
        spec={page.spec}
        bindings={page.bindings}
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
