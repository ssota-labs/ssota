import { notFound } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { DynamicPageRenderer } from "@/lib/page-runtime";
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
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    nodeId: string;
    pageId: string;
  }>;
}) {
  const { orgSlug, projectSlug, nodeId, pageId } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const page = await getPagePort(project.id).getPage(pageId);
  if (!page) notFound();

  const graphRead = getGraphPorts(project.id).graphRead;
  const subject = await graphRead.getNodeById(nodeId);
  if (!subject || subject.projectId !== project.id) notFound();

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
    page.bindings,
    context,
  );
  await resolveArtifactBindings(project.id, page.bindings, bindingData);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <SetNodeDrill
        nodeId={subject.id}
        catalogKey={subject.catalogKey}
        nodeTitle={subject.title}
        pageTitle={page.title}
      />
      <DynamicPageRenderer
        spec={page.spec}
        bindingData={bindingData}
        basePath={`/${orgSlug}/${projectSlug}`}
      />
    </div>
  );
}
