import { TasksExplorer } from "@/components/tasks/tasks-explorer";
import { type TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getAgentDefinitionPort, getTaskPort } from "@/lib/ports";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const tasks = await getTaskPort(project.id).queryTasks({ limit: 200 });

  const rows: TaskWorkspaceRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    executorType: task.executorType,
    assignee: task.assignee ?? "Unassigned",
    agentKey: task.agentKey ?? "",
    subjectId: task.subjectId ?? "",
    acceptanceCriteria: task.acceptanceCriteria.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item === null || item === undefined) return [];
      return [String(item)];
    }),
    context: task.context,
    result: task.result,
    completedAt: task.completedAt?.toISOString() ?? "",
    updatedAt: task.updatedAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
  }));

  const agentDefinitions =
    await getAgentDefinitionPort(project.id).listDefinitions();
  const agentOptions = agentDefinitions.map((entry) => ({
    agentKey: entry.key,
    title: entry.name,
  }));

  return (
    <TasksExplorer
      rows={rows}
      teamspaceId={project.id}
      agentOptions={agentOptions}
    />
  );
}
