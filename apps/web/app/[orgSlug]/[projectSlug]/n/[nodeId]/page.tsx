import { notFound } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";
import { DynamicPageRenderer } from "@/lib/page-runtime";

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
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="text-lg font-medium">{subject.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          No drill-in template defined for “{subject.catalogKey}”.
        </p>
      </div>
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
