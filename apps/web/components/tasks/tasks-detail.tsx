"use client";

import { useEffect, useState, useTransition } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { updateTaskStatusAction } from "@/app/actions";
import { SpawnTaskDialog, type WorkflowOption } from "@/components/tasks/spawn-task-dialog";
import { TasksDetailSheet } from "@/components/tasks/tasks-detail-sheet";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksDetailProps = {
  rows: TaskWorkspaceRow[];
  projectId: string;
  workflowOptions: WorkflowOption[];
};

export function TasksDetail({
  rows,
  projectId,
  workflowOptions,
}: TasksDetailProps) {
  const [selected, setSelected] = useState<TaskWorkspaceRow | null>(null);
  const [motionReduced, setMotionReduced] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      await updateTaskStatusAction(projectId, taskId, status);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-end gap-3 border-b px-4 py-2">
        <div className="text-xs text-muted-foreground">{rows.length} tasks</div>
      </div>

      {rows.length === 0 ? (
        <div className="space-y-4 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No tasks yet. Create one here or use MCP spawn_task from your agent
            environment.
          </p>
          <div className="flex justify-center">
            <SpawnTaskDialog
              projectId={projectId}
              workflowOptions={workflowOptions}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <TasksKanbanBoard
            rows={rows}
            projectId={projectId}
            onOpenDetail={setSelected}
            onStatusChange={handleStatusChange}
            motionReduced={motionReduced || isPending}
          />
        </div>
      )}

      <TasksDetailSheet task={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
