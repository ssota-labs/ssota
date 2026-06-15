"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { toast } from "sonner";
import { updateTaskStatusAction } from "@/app/actions";
import { SpawnTaskDialog, type WorkflowOption } from "@/components/tasks/spawn-task-dialog";
import { TasksDetailSheet } from "@/components/tasks/tasks-detail-sheet";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import { TasksTable } from "@/components/tasks/tasks-table";
import type { TaskTab, TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksDetailProps = {
  rows: TaskWorkspaceRow[];
  activeTab: TaskTab;
  baseHref: string;
  projectId: string;
  workflowOptions: WorkflowOption[];
};

export function TasksDetail({
  rows,
  activeTab,
  baseHref,
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
      try {
        await updateTaskStatusAction(projectId, taskId, status);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not update task status",
        );
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <TabLink href={tabHref(baseHref, "table")} active={activeTab === "table"}>
            Table
          </TabLink>
          <TabLink href={tabHref(baseHref, "board")} active={activeTab === "board"}>
            Board
          </TabLink>
        </div>
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
              taskOptions={rows}
            />
          </div>
        </div>
      ) : activeTab === "board" ? (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <TasksKanbanBoard
            rows={rows}
            projectId={projectId}
            onOpenDetail={setSelected}
            onStatusChange={handleStatusChange}
            motionReduced={motionReduced || isPending}
          />
        </div>
      ) : (
        <TasksTable rows={rows} onOpenDetail={setSelected} />
      )}

      <TasksDetailSheet
        task={selected}
        rows={rows}
        onClose={() => setSelected(null)}
        onSelectTask={setSelected}
      />
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      render={<Link href={href} scroll={false} />}
      variant={active ? "secondary" : "ghost"}
      size="sm"
      nativeButton={false}
      className="h-7"
    >
      {children}
    </Button>
  );
}

function tabHref(baseHref: string, tab: TaskTab) {
  return tab === "board" ? `${baseHref}?tab=board` : baseHref;
}
