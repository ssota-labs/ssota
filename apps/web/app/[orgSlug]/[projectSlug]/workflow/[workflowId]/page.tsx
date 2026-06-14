import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function WorkflowDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    workflowId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug, projectSlug, workflowId } = await params;
  const { tab } = await searchParams;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const workflow = isUuid(workflowId)
    ? ((await ports.catalog.getWorkflow(workflowId)) ??
      (await ports.catalog.getWorkflowBySlug(workflowId)))
    : await ports.catalog.getWorkflowBySlug(workflowId);

  const query = new URLSearchParams();
  if (workflow) {
    query.set("workflow", workflow.slug);
  } else {
    query.set("workflow", workflowId);
  }
  if (tab) query.set("tab", tab);

  redirect(
    `${projectPath({ orgSlug, projectSlug }, "workflow")}?${query.toString()}`,
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
