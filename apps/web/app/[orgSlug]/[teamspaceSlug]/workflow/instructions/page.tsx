import { WorkflowInstructionsWorkspace } from "@/components/console/workflow-instructions-workspace";
import { loadWorkflowInstructionGroupsForUi } from "@/lib/console/load-workflow-instructions-for-ui";
import { resolveOrg } from "@/lib/console/resolve-project";

export default async function WorkflowInstructionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const groups = await loadWorkflowInstructionGroupsForUi(project.id);

  return (
    <div className="relative min-h-0 flex-1">
      <WorkflowInstructionsWorkspace teamspaceId={project.id} groups={groups} />
    </div>
  );
}
