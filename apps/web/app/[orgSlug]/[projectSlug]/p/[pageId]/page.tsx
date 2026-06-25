import { notFound } from "next/navigation";
import type { TableViewState } from "@ssota/contracts";
import type { UiComponentContentV2 } from "@ssota/contracts/catalog";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { getGraphPorts, getPagePort, getPageViewStatePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { TreePageView } from "@/lib/page-runtime/tree-page-view";
import {
  pageUsesArtifactWorkbench,
  pageUsesFillHeight,
} from "@/lib/page-runtime/spec-utils";
import { normalizeSearchParams } from "@/lib/page-runtime/search-params";
import { runPageAction } from "@/lib/page-runtime/run-page-action";
import { savePageViewState } from "@/lib/page-runtime/save-page-view-state";
import { getCurrentUser } from "@/lib/supabase/server";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { deployUiComponentAction } from "@/lib/graph/actions/deploy-ui-component";
import { defaultSourceComponentProperties } from "@/lib/design-studio/empty-document";
import { slugifyComponentTitle } from "@/lib/design-studio/tree-utils";

/**
 * Notion-style page renderer. Loads a page from the `pages` table by id, resolves
 * its bindings against the live graph (server-side), and renders the JSON-render
 * spec. A page is a dashboard (not 1:1 with a node); `subject_node_id` optionally
 * anchors the page's bindings to a node (exposed to bindings as `context.subject`,
 * consumed by the `subject` binding kind / `traverse from:"subject"`).
 */
export default async function TreePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; pageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, projectSlug, pageId } = await params;
  const urlParams = normalizeSearchParams(await searchParams);
  const { project } = await resolveProject(orgSlug, projectSlug);

  const page = await getPagePort(project.id).getPage(pageId);
  if (!page) {
    notFound();
  }

  const graphRead = getGraphPorts(project.id).graphRead;

  const context: Record<string, unknown> = { searchParams: urlParams };
  if (page.subjectNodeId) {
    const subject = await graphRead.getNodeById(page.subjectNodeId);
    if (subject && subject.projectId === project.id) {
      context.subject = {
        id: subject.id,
        catalogKey: subject.catalogKey,
        title: subject.title,
        properties: subject.properties,
      };
      context.subjectNodeId = subject.id;
    }
  }

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
  const pagePath = projectPath(routeCtx, "p", pageId);
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
      subjectNodeId: page!.subjectNodeId ?? null,
      revalidate: [pagePath],
    });
  }

  async function onStudioCreateComponent(): Promise<string> {
    "use server";
    const title = `Component ${new Date().toISOString().slice(0, 10)}`;
    const slug = `${slugifyComponentTitle(title)}-${Date.now().toString(36).slice(-4)}`;
    const node = await createGraphNodeAction({
      projectId: project.id,
      catalogKey: "ui_component",
      title,
      properties: defaultSourceComponentProperties(slug),
      revalidatePaths: [pagePath],
    });
    return node.id;
  }

  async function onStudioDeployComponent(input: {
    nodeId: string;
    contentV2: UiComponentContentV2;
  }): Promise<void> {
    "use server";
    await deployUiComponentAction({
      projectId: project.id,
      nodeId: input.nodeId,
      contentV2: input.contentV2,
      revalidatePaths: [pagePath],
    });
  }

  // Per-user table view state (column order/visibility/sizing/sort/filters/…),
  // loaded for the current user and threaded into the renderer. `save` is the
  // controlled-table persistence callback.
  const user = await getCurrentUser();
  const initialViewStates = user
    ? await getPageViewStatePort(project.id).getForPage(user.id, pageId)
    : {};

  async function saveViewState(
    elementId: string,
    viewState: TableViewState,
  ): Promise<void> {
    "use server";
    await savePageViewState({
      projectId: project.id,
      pageId,
      elementId,
      viewState,
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
      <TreePageView
        spec={page.spec}
        bindings={page.bindings}
        bindingData={bindingData}
        basePath={basePath}
        onAction={onAction}
        viewState={{ initial: initialViewStates, save: saveViewState }}
        artifactWorkbench={
          usesWorkbench
            ? {
                projectId: project.id,
                previewBasePath,
                onCreateComponent: onStudioCreateComponent,
                onDeployComponent: onStudioDeployComponent,
              }
            : null
        }
      />
    </div>
  );
}
