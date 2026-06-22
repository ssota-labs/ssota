import { notFound } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { DynamicPageRenderer } from "@/lib/page-runtime";
import { projectPath } from "@/lib/console/paths";
import { getNodeDetailView } from "@/lib/graph/loaders/get-node-detail";
import { NodeDetailWorkspace } from "@/components/console/node-detail-workspace";

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

  if (!home) {
    // No drill-in template for this node type → universal generic detail view
    // (edges + properties), the replacement for the old /nodes/[id] route.
    const ctx = { orgSlug, projectSlug };
    const detail = await getNodeDetailView(ctx, project.id, nodeId);
    if (!detail) notFound();
    return (
      <NodeDetailWorkspace
        projectId={project.id}
        detail={detail}
        nodesBasePath={projectPath(ctx, "n")}
        revalidatePath={projectPath(ctx, "n", nodeId)}
      />
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

  return (
    <div className="mx-auto max-w-5xl p-6">
      <DynamicPageRenderer
        spec={home.spec}
        bindingData={bindingData}
        basePath={`/${orgSlug}/${projectSlug}`}
      />
    </div>
  );
}
