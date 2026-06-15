"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { updateTaskStatusAction } from "@/app/actions";
import { TasksDetailSheet } from "@/components/tasks/tasks-detail-sheet";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import { TasksTable } from "@/components/tasks/tasks-table";

export type TaskFilter = "all" | "human" | "agent" | "automation" | "blocked" | "review";
export type TaskTab = "table" | "board";

export type TaskWorkspaceRow = {
  id: string;
  title: string;
  status: TaskStatus;
  executorType: string;
  assignee: string;
  workflowKey: string;
  targetNodeId: string;
  subjectId: string;
  acceptanceCriteria: string[];
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  sourceActionLogId: string;
  completedAt: string;
  updatedAt: string;
  createdAt: string;
};

type TasksWorkspaceProps = {
  rows: TaskWorkspaceRow[];
  activeFilter: TaskFilter;
  activeTab: TaskTab;
  baseHref: string;
  projectId: string;
};

const filterLabels: Record<TaskFilter, string> = {
  all: "All",
  human: "Human",
  agent: "Agent",
  automation: "Automation",
  blocked: "Blocked",
  review: "Ready",
};

export function TasksWorkspace({
  rows,
  activeFilter,
  activeTab,
  baseHref,
  projectId,
}: TasksWorkspaceProps) {
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
    () => rows.filter((row) => matchesFilter(row, activeFilter)),
    [rows, activeFilter],
  );

  function buildHref(filter: TaskFilter, tab: TaskTab) {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("view", filter);
    if (tab !== "table") params.set("tab", tab);
    const query = params.toString();
    return query ? `${baseHref}?${query}` : baseHref;
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      await updateTaskStatusAction(projectId, taskId, status);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-background">
      <div className="shrink-0 border-b">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-1">
            <TabLink href={tabHref(baseHref, activeFilter, "table")} active={activeTab === "table"}>
              Table
            </TabLink>
            <TabLink href={tabHref(baseHref, activeFilter, "board")} active={activeTab === "board"}>
              Board
            </TabLink>
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} tasks
            {activeFilter !== "all" ? ` · ${filterLabels[activeFilter]} view` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 overflow-x-auto px-4 pb-2">
          {(Object.keys(filterLabels) as TaskFilter[]).map((filter) => (
            <Button
              key={filter}
              render={<Link href={buildHref(filter, activeTab)} scroll={false} />}
              variant={activeFilter === filter ? "secondary" : "ghost"}
              size="sm"
              nativeButton={false}
              className="h-7"
            >
              {filterLabels[filter]}{" "}
              <Badge variant="secondary" className="ml-1">
                {rows.filter((row) => matchesFilter(row, filter)).length}
              </Badge>
            </Button>
          ))}
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

function matchesFilter(row: TaskWorkspaceRow, filter: TaskFilter) {
  if (filter === "all") return true;
  if (filter === "blocked") return row.status === "blocked";
  if (filter === "review") return row.status === "ready";
  const assignee = row.assignee.toLowerCase();
  if (filter === "human") {
    return row.executorType === "Human" || assignee.includes("human");
  }
  if (filter === "agent") {
    return row.executorType === "Agent" || assignee.includes("agent");
  }
  if (filter === "automation") {
    return row.executorType === "System" || assignee.includes("automation");
  }
  return true;
}
