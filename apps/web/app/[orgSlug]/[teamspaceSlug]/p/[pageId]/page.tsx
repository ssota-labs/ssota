import { notFound, redirect } from "next/navigation";
import type { TableViewState } from "@ssota/contracts";
import type { UiComponentContentV2 } from "@ssota/contracts/catalog";
import { resolvePageBindings } from "@ssota/core";
import { resolveOrgPage } from "@/lib/console/resolve-org-page";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
import { getGraphPorts, getPagePort, getPageViewStatePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { PageSiblingNav } from "@/components/console/page-sibling-nav";
import { loadPageSiblingNav } from "@/lib/console/page-sibling-nav";
import { DynamicPageRenderer } from "@/lib/page-runtime";
import { pageUsesArtifactWorkbench } from "@/lib/page-runtime/spec-utils";
import {
  isHubPage,
  resolveHubRedirectPath,
} from "@/lib/page-runtime/hub-redirect";
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
  params: Promise<{ orgSlug: string; teamspaceSlug: string; pageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, pageId } = await params;
  const urlParams = normalizeSearchParams(await searchParams);
  const { teamspace: project, page } = await resolveOrgPage(orgSlug, pageId);

  const routeCtx: OrgRouteContext = {
    orgSlug,
    teamspaceSlug: project.slug,
    teamspaceId: project.id,
  };
  if (isHubPage(page.spec)) {
    const hubRedirect = await resolveHubRedirectPath(
      getPagePort(project.id),
      pageId,
      routeCtx,
    );
    if (hubRedirect) redirect(hubRedirect);
  }

  const graphRead = (await getGraphPorts(project.id)).graphRead;

  const context: Record<string, unknown> = { searchParams: urlParams };
  if (page.subjectNodeId) {
    const subject = await graphRead.getNodeById(page.subjectNodeId);
    if (
      subject &&
      (subject.teamspaceId === null || subject.teamspaceId === project.id)
    ) {
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

  const usesWorkbench = pageUsesArtifactWorkbench(page.spec);
  const basePath = orgPath(routeCtx);
  const pagePath = orgPath(routeCtx, "p", pageId);
  const previewBasePath = orgPath(routeCtx, "design", "preview");

  async function onAction(
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    "use server";
    await runPageAction({
      teamspaceId: project.id,
      pageId,
      actionKey,
      input,
      subjectNodeId: page!.subjectNodeId ?? null,
      routeCtx,
      revalidate: [pagePath],
    });
  }

  async function onStudioCreateComponent(): Promise<string> {
    "use server";
    const title = `Component ${new Date().toISOString().slice(0, 10)}`;
    const slug = `${slugifyComponentTitle(title)}-${Date.now().toString(36).slice(-4)}`;
    const node = await createGraphNodeAction({
      teamspaceId: project.id,
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
      teamspaceId: project.id,
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
      teamspaceId: project.id,
      pageId,
      elementId,
      viewState,
    });
  }

  const pagePort = getPagePort(project.id);
  const siblingNav = await loadPageSiblingNav(pagePort, page, (id) =>
    orgPath(routeCtx, "p", id),
  );

  return (
    <>
      {siblingNav ? <PageSiblingNav {...siblingNav} /> : null}
      <ConsolePageFrame fullWidth={usesWorkbench} fillHeight={!usesWorkbench}>
        <DynamicPageRenderer
          spec={page.spec}
          pageBindings={page.bindings}
          bindingData={bindingData}
          basePath={basePath}
          onAction={onAction}
          viewState={{ initial: initialViewStates, save: saveViewState }}
          artifactWorkbench={
            usesWorkbench
              ? {
                  teamspaceId: project.id,
                  previewBasePath,
                  onCreateComponent: onStudioCreateComponent,
                  onDeployComponent: onStudioDeployComponent,
                }
              : null
          }
        />
      </ConsolePageFrame>
    </>
  );
}
