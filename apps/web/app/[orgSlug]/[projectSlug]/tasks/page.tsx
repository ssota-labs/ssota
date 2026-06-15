import {
  TasksExplorer,
} from "@/components/tasks/tasks-explorer";
import {
  type TaskFilter,
  type TaskTab,
  type TaskWorkspaceRow,
} from "@/components/tasks/tasks-workspace";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

const taskFilters = new Set<TaskFilter>([
  "all",
  "human",
  "agent",
  "automation",
  "blocked",
  "review",
]);

const taskTabs = new Set<TaskTab>(["table", "board"]);

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ view?: string; tab?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { view, tab } = await searchParams;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const tasks = await ports.tasks.queryTasks({ limit: 200 });
  const activeFilter = taskFilters.has(view as TaskFilter)
    ? (view as TaskFilter)
    : "all";
  const activeTab = taskTabs.has(tab as TaskTab) ? (tab as TaskTab) : "table";

  const rows: TaskWorkspaceRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    executorType: task.executorType,
    assignee: task.assignee ?? "Unassigned",
    workflowKey: task.workflowKey,
    targetNodeId: task.targetNodeId ?? "",
    subjectId: task.subjectId ?? "",
    acceptanceCriteria: task.acceptanceCriteria.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item === null || item === undefined) return [];
      return [String(item)];
    }),
    context: task.context,
    result: task.result,
    sourceActionLogId: task.sourceActionLogId ?? "",
    completedAt: task.completedAt?.toISOString() ?? "",
    updatedAt: task.updatedAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
  }));

  return (
    <TasksExplorer
      rows={rows}
      activeFilter={activeFilter}
      activeTab={activeTab}
      baseHref={projectPath(ctx, "tasks")}
      projectId={project.id}
    />
  );
}
