import { notFound } from "next/navigation";
import type { TableViewState } from "@ssota/contracts";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts, getPagePort, getPageViewStatePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { TreePageView } from "@/lib/page-runtime/tree-page-view";
import { pageUsesDocumentSheetList } from "@/lib/page-runtime/spec-utils";
import { runPageAction } from "@/lib/page-runtime/run-page-action";
import { savePageViewState } from "@/lib/page-runtime/save-page-view-state";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Notion-style page renderer. Loads a page from the `pages` table by id, resolves
 * its bindings against the live graph (server-side), and renders the JSON-render
 * spec. A page is a dashboard (not 1:1 with a node); `subject_node_id` optionally
 * anchors the page's bindings to a node (exposed to bindings as `context.subject`,
 * consumed by the `subject` binding kind / `traverse from:"subject"`).
 */
export default async function TreePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; pageId: string }>;
}) {
  const { orgSlug, projectSlug, pageId } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const page = await getPagePort(project.id).getPage(pageId);
  if (!page) {
    notFound();
  }

  const graphRead = getGraphPorts(project.id).graphRead;

  const context: Record<string, unknown> = {};
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

  const fillHeight = pageUsesDocumentSheetList(page.spec);
  const basePath = `/${orgSlug}/${projectSlug}`;

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
      revalidate: [`/${orgSlug}/${projectSlug}/p/${pageId}`],
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
        bindingData={bindingData}
        basePath={basePath}
        onAction={onAction}
        viewState={{ initial: initialViewStates, save: saveViewState }}
      />
    </div>
  );
}
