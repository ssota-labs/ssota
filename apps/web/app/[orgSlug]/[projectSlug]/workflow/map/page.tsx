import { WorkflowMapWorkspace } from "@/components/console/workflow-map-workspace";
import { resolveProject } from "@/lib/console/resolve-project";
import { buildWorkflowLensPhases } from "@/lib/graph/loaders/build-workflow-lens";

export default async function WorkflowMapPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const phases = await buildWorkflowLensPhases(ctx, project.id);

  return <WorkflowMapWorkspace phases={phases} />;
}
