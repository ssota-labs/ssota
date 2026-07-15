"use client";

import { useEffect, useState, useTransition } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { updateTaskStatusAction } from "@/app/actions";
import { SpawnTaskDialog, type AgentOption } from "@/components/tasks/spawn-task-dialog";
import { TasksDetailSheet } from "@/components/tasks/tasks-detail-sheet";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksDetailProps = {
  rows: TaskWorkspaceRow[];
  teamspaceId: string;
  agentOptions: AgentOption[];
};

export function TasksDetail({
  rows,
  teamspaceId,
  agentOptions,
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
      await updateTaskStatusAction(teamspaceId, taskId, status);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {rows.length === 0 ? (
        <div className="space-y-4 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No tasks yet. Create one here or use MCP spawn_task from your agent
            environment.
          </p>
          <div className="flex justify-center">
            <SpawnTaskDialog
              teamspaceId={teamspaceId}
              agentOptions={agentOptions}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <TasksKanbanBoard
            rows={rows}
            teamspaceId={teamspaceId}
            onOpenDetail={setSelected}
            onStatusChange={handleStatusChange}
            motionReduced={motionReduced || isPending}
          />
        </div>
      )}

      <TasksDetailSheet
        teamspaceId={teamspaceId}
        task={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
