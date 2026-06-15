import { listWorkflowKeys, getWorkflowByKey } from "@ssota/contracts/workflows";
import { enrichTasks } from "@ssota/core";
import { TasksExplorer } from "@/components/tasks/tasks-explorer";
import {
  type TaskTab,
  type TaskWorkspaceRow,
} from "@/components/tasks/tasks-workspace";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getTaskPort } from "@/lib/ports";

const taskTabs = new Set<TaskTab>(["table", "board"]);

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { tab } = await searchParams;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const taskPort = getTaskPort(project.id);
  const tasks = await taskPort.queryTasks({ limit: 200 });
  const enriched = await enrichTasks(taskPort, tasks);
  const activeTab = taskTabs.has(tab as TaskTab) ? (tab as TaskTab) : "table";

  const rows: TaskWorkspaceRow[] = enriched.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    executorType: task.executorType,
    assignee: task.assignee ?? "Unassigned",
    workflowKey: task.workflowKey,
    subjectId: task.subjectId ?? "",
    acceptanceCriteria: task.acceptanceCriteria.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item === null || item === undefined) return [];
      return [String(item)];
    }),
    context: task.context,
    result: task.result,
    completedAt: task.completedAt?.slice(0, 10) ?? "",
    updatedAt: task.updatedAt.slice(0, 10),
    createdAt: task.createdAt.slice(0, 10),
    blockedBy: task.blockedBy,
    isRunnable: task.isRunnable,
  }));

  const workflowOptions = listWorkflowKeys().map((workflowKey) => {
    const workflow = getWorkflowByKey(workflowKey);
    return {
      workflowKey,
      title: workflow?.title ?? workflowKey,
    };
  });

  return (
    <TasksExplorer
      rows={rows}
      activeTab={activeTab}
      baseHref={projectPath(ctx, "tasks")}
      projectId={project.id}
      workflowOptions={workflowOptions}
    />
  );
}
