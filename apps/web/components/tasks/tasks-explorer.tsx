import { TasksDetail } from "@/components/tasks/tasks-detail";
import {
  SpawnTaskDialog,
  type WorkflowOption,
} from "@/components/tasks/spawn-task-dialog";
import type { TaskTab, TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksExplorerProps = {
  rows: TaskWorkspaceRow[];
  activeTab: TaskTab;
  baseHref: string;
  projectId: string;
  workflowOptions: WorkflowOption[];
};

export function TasksExplorer({
  rows,
  activeTab,
  baseHref,
  projectId,
  workflowOptions,
}: TasksExplorerProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-start gap-2 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold">Tasks</h1>
          <p className="text-xs text-muted-foreground">
            Runtime work queue for humans, agents, and automation. Status changes go
            through update_task.
          </p>
        </div>
        <SpawnTaskDialog
          projectId={projectId}
          workflowOptions={workflowOptions}
          taskOptions={rows}
        />
      </div>
      <TasksDetail
        rows={rows}
        activeTab={activeTab}
        baseHref={baseHref}
        projectId={projectId}
        workflowOptions={workflowOptions}
      />
    </div>
  );
}
