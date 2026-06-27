import { WorkflowMapWorkspace } from "@/components/console/workflow-map-workspace";
import { resolveOrg } from "@/lib/console/resolve-project";
import { buildWorkflowLensPhases } from "@/lib/graph/loaders/build-workflow-lens";

export default async function WorkflowMapPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const ctx = { orgSlug, teamspaceSlug };
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const phases = await buildWorkflowLensPhases(ctx, project.id);

  return <WorkflowMapWorkspace phases={phases} />;
}
