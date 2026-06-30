import { TasksExplorer } from "@/components/tasks/tasks-explorer";
import { type TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { resolveEndUserContext } from "@/lib/request-context";
import { getAgentDefinitionPort, getTaskPort } from "@/lib/ports";

export default async function AppTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const ctx = await resolveEndUserContext(orgSlug, teamspaceSlug);
  const tasks = await getTaskPort(ctx.teamspaceId, ctx.accountId).queryTasks({
    limit: 200,
  });

  const rows: TaskWorkspaceRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    executorType: task.executorType,
    assignee: task.assignee ?? "Unassigned",
    agentDefinitionId: task.agentDefinitionId ?? "",
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
    await getAgentDefinitionPort(ctx.teamspaceId).listDefinitions();
  const agentOptions = agentDefinitions.map((entry) => ({
    agentDefinitionId: entry.id,
    title: entry.name,
  }));

  return (
    <TasksExplorer
      rows={rows}
      teamspaceId={ctx.teamspaceId}
      agentOptions={agentOptions}
    />
  );
}
