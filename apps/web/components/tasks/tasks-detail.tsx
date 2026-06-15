"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { updateTaskStatusAction } from "@/app/actions";
import { TasksDetailSheet } from "@/components/tasks/tasks-detail-sheet";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import { TasksTable } from "@/components/tasks/tasks-table";
import type { TaskFilter, TaskTab, TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { matchesTaskFilter } from "@/components/tasks/tasks-workspace";

type TasksDetailProps = {
  rows: TaskWorkspaceRow[];
  activeFilter: TaskFilter;
  activeTab: TaskTab;
  baseHref: string;
  projectId: string;
};

export function TasksDetail({
  rows,
  activeFilter,
  activeTab,
  baseHref,
  projectId,
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

  const filtered = useMemo(
    () => rows.filter((row) => matchesTaskFilter(row, activeFilter)),
    [rows, activeFilter],
  );

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      await updateTaskStatusAction(projectId, taskId, status);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <TabLink href={tabHref(baseHref, activeFilter, "table")} active={activeTab === "table"}>
            Table
          </TabLink>
          <TabLink href={tabHref(baseHref, activeFilter, "board")} active={activeTab === "board"}>
            Board
          </TabLink>
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} tasks · {rows.length} total
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="space-y-3 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No runtime tasks match this view yet. Use spawn_task from MCP to add work
            items to this queue.
          </p>
        </div>
      ) : activeTab === "board" ? (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <TasksKanbanBoard
            rows={filtered}
            projectId={projectId}
            onOpenDetail={setSelected}
            onStatusChange={handleStatusChange}
            motionReduced={motionReduced || isPending}
          />
        </div>
      ) : (
        <TasksTable rows={filtered} onOpenDetail={setSelected} />
      )}

      <TasksDetailSheet task={selected} onClose={() => setSelected(null)} />
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

function tabHref(baseHref: string, filter: TaskFilter, tab: TaskTab) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("view", filter);
  if (tab === "board") params.set("tab", "board");
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}
