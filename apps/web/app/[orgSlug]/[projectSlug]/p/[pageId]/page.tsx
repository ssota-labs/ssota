import { notFound } from "next/navigation";
import type { TableViewState } from "@ssota/contracts";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts, getPagePort, getPageViewStatePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { DynamicPageRenderer } from "@/lib/page-runtime";
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

  // Anchor node (generic replacement for initiative-scoping): resolved here and
  // threaded into the binding context as `subject`.
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
    <div className="mx-auto max-w-5xl p-6">
      <DynamicPageRenderer
        spec={page.spec}
        bindingData={bindingData}
        basePath={`/${orgSlug}/${projectSlug}`}
        onAction={onAction}
        viewState={{ initial: initialViewStates, save: saveViewState }}
      />
    </div>
  );
}
