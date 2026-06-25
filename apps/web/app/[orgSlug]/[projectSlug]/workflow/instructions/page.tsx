import { WorkflowInstructionsWorkspace } from "@/components/console/workflow-instructions-workspace";
import { loadWorkflowInstructionsForUi } from "@/lib/console/load-workflow-instructions-for-ui";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function WorkflowInstructionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const instructions = await loadWorkflowInstructionsForUi(project.id);

  return (
    <div className="relative min-h-0 flex-1">
      <WorkflowInstructionsWorkspace
        projectId={project.id}
        instructions={instructions}
      />
    </div>
  );
}
