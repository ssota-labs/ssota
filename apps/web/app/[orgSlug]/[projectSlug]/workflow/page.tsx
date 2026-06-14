import { redirect } from "next/navigation";
import { WorkflowsWorkspace } from "@/components/workflows/workflows-workspace";
import {
  displayNodeCatalogLabel,
  getCachedEdgeCatalog,
  getCachedNodeCatalog,
} from "@/lib/console/cached-catalog";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

const tabs = ["builder", "agent", "flow", "runs", "reviews"] as const;

export default async function WorkflowListPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ workflow?: string; tab?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { workflow: workflowParam, tab } = await searchParams;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const [workflows, logs, pendingGates, nodeCatalog, edgeCatalog] = await Promise.all([
    ports.catalog.listWorkflows({ limit: 100 }),
    ports.commit.getActionLog({ limit: 100 }),
    ports.gate.listPendingGates(),
    getCachedNodeCatalog(project.id),
    getCachedEdgeCatalog(project.id),
  ]);
  const selected =
    workflows.find(
      (entry) =>
        entry.id === workflowParam || entry.slug === workflowParam,
    ) ??
    workflows[0] ??
    null;
  const activeTab =
    tab && tabs.includes(tab as (typeof tabs)[number])
      ? (tab as (typeof tabs)[number])
      : "builder";

  if (!workflowParam && selected) {
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
      workflows={workflows}
      logs={logs}
      pendingGates={pendingGates}
      selected={selected}
      activeTab={activeTab}
      nodeCatalog={nodeCatalog.map((entry) => ({
        nodeType: entry.nodeType,
        label: displayNodeCatalogLabel(entry),
        propertyKeys: Object.keys(entry.propertySchema ?? {}),
      }))}
      edgeCatalog={edgeCatalog.map((entry) => ({
        edgeType: entry.edgeType,
        label: entry.label,
      }))}
    />
  );
}
