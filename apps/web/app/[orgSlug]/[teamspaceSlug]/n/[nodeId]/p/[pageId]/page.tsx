import { notFound, redirect } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { resolveOrg } from "@/lib/console/resolve-project";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
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
import { ConsolePageFrame } from "@/components/console/console-page-frame";
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
    teamspaceSlug: string;
    nodeId: string;
    pageId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, teamspaceSlug, nodeId, pageId } = await params;
  const urlParams = normalizeSearchParams(await searchParams);
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);

  const page = await getPagePort(project.id).getPage(pageId);
  if (!page) notFound();

  const routeCtx: OrgRouteContext = { orgSlug, teamspaceSlug };
  if (isHubPage(page.spec)) {
    const hubRedirect = await resolveHubRedirectPath(
      getPagePort(project.id),
      pageId,
      routeCtx,
      nodeId,
    );
    if (hubRedirect) redirect(hubRedirect);
  }

  const graphRead = (await getGraphPorts(project.id)).graphRead;
  const subject = await graphRead.getNodeById(nodeId);
  if (!subject || subject.teamspaceId !== project.id) notFound();

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

  const usesWorkbench = pageUsesArtifactWorkbench(page.spec);
  const basePath = `/${orgSlug}/${teamspaceSlug}`;
  const pagePath = orgPath(routeCtx, "n", nodeId, "p", pageId);
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
      subjectNodeId: subject!.id,
      revalidate: [pagePath],
    });
  }

  const pagePort = getPagePort(project.id);
  const siblingNav = await loadPageSiblingNav(pagePort, page, (id) =>
    orgPath(routeCtx, "n", nodeId, "p", id),
  );

  return (
    <>
      {siblingNav ? <PageSiblingNav {...siblingNav} /> : null}
      <SetNodeDrill
        nodeId={subject.id}
        catalogKey={subject.catalogKey}
        nodeTitle={subject.title}
        pageTitle={page.title}
      />
      <ConsolePageFrame fullWidth={usesWorkbench} fillHeight={!usesWorkbench}>
        <DynamicPageRenderer
          spec={page.spec}
          pageBindings={page.bindings}
          bindingData={bindingData}
          basePath={basePath}
          onAction={onAction}
          artifactWorkbench={
            usesWorkbench
              ? {
                  teamspaceId: project.id,
                  previewBasePath,
                }
              : null
          }
        />
      </ConsolePageFrame>
    </>
  );
}
