import { WorkflowReviewsPanel } from "@/components/workflows/workflow-reviews-panel";
import { PageHeader } from "@/components/studio/page-header";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function ProjectGatesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const gates = await ports.gate.listPendingGates();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Reviews"
        description="Approve or reject pending graph changes before they affect project state."
      />
      <WorkflowReviewsPanel gates={gates} projectId={project.id} />
    </div>
  );
}
