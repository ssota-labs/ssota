import { redirect } from "next/navigation";
import { WorkflowsWorkspace } from "@/components/workflows/workflows-workspace";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

const tabs = ["builder", "instruction", "flow", "runs", "reviews"] as const;

export default async function WorkflowListPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ workflow?: string; tab?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { workflow, tab } = await searchParams;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const [instructions, logs, pendingGates] = await Promise.all([
    ports.catalog.listInstructions({ limit: 100 }),
    ports.commit.getActionLog({ limit: 100 }),
    ports.gate.listPendingGates(),
  ]);
  const selected =
    instructions.find(
      (instruction) =>
        instruction.id === workflow || instruction.slug === workflow,
    ) ??
    instructions[0] ??
    null;
  const activeTab =
    tab && tabs.includes(tab as (typeof tabs)[number])
      ? (tab as (typeof tabs)[number])
      : "builder";

  if (!workflow && selected) {
    const params = new URLSearchParams({ workflow: selected.slug });
    if (activeTab !== "builder") params.set("tab", activeTab);
    redirect(
      `${projectPath({ orgSlug, projectSlug }, "workflow")}?${params.toString()}`,
    );
  }

  return (
    <WorkflowsWorkspace
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      projectId={project.id}
      instructions={instructions}
      logs={logs}
      pendingGates={pendingGates}
      selected={selected}
      activeTab={activeTab}
    />
  );
}
