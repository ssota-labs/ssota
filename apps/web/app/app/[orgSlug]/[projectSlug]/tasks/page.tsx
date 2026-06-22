import { listWorkflowKeys, getWorkflowByKey } from "@ssota/contracts/workflows";
import { TasksExplorer } from "@/components/tasks/tasks-explorer";
import {
  type TaskTab,
  type TaskWorkspaceRow,
} from "@/components/tasks/tasks-workspace";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveEndUserContext } from "@/lib/request-context";
import { getTaskPort } from "@/lib/ports";

const taskTabs = new Set<TaskTab>(["table", "board"]);

export default async function AppTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { tab } = await searchParams;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const routeCtx = { orgSlug, projectSlug };
  const tasks = await getTaskPort(ctx.projectId, ctx.accountId).queryTasks({
    limit: 200,
  });
  const activeTab = taskTabs.has(tab as TaskTab) ? (tab as TaskTab) : "table";

  const rows: TaskWorkspaceRow[] = tasks.map((task) => ({
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
    completedAt: task.completedAt?.toISOString() ?? "",
    updatedAt: task.updatedAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
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
      baseHref={appProjectPath(routeCtx, "tasks")}
      projectId={ctx.projectId}
      workflowOptions={workflowOptions}
    />
  );
}
