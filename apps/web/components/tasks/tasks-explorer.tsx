import { TasksDetail } from "@/components/tasks/tasks-detail";
import {
  SpawnTaskDialog,
  type WorkflowOption,
} from "@/components/tasks/spawn-task-dialog";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksExplorerProps = {
  rows: TaskWorkspaceRow[];
  teamspaceId: string;
  workflowOptions: WorkflowOption[];
};

export function TasksExplorer({
  rows,
  teamspaceId,
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
        <SpawnTaskDialog teamspaceId={teamspaceId} workflowOptions={workflowOptions} />
      </div>
      <TasksDetail
        rows={rows}
        teamspaceId={teamspaceId}
        workflowOptions={workflowOptions}
      />
    </div>
  );
}
