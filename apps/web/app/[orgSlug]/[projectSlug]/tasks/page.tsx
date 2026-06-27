import { TasksExplorer } from "@/components/tasks/tasks-explorer";
import { type TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { resolveProject } from "@/lib/console/resolve-project";
import { getTaskPort, getWorkflowInstructionPort } from "@/lib/ports";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const tasks = await getTaskPort(project.id).queryTasks({ limit: 200 });

  const rows: TaskWorkspaceRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    executorType: task.executorType,
    assignee: task.assignee ?? "Unassigned",
    workflowInstructionKey: task.workflowInstructionKey ?? "",
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

  const workflowInstructions =
    await getWorkflowInstructionPort(project.id).listInstructions();
  const workflowOptions = workflowInstructions.map((entry) => ({
    workflowInstructionKey: entry.key,
    title: entry.name,
  }));

  return (
    <TasksExplorer
      rows={rows}
      projectId={project.id}
      workflowOptions={workflowOptions}
    />
  );
}
