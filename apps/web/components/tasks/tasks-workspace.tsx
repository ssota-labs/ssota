"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { updateTaskStatusAction } from "@/app/actions";
import { TasksDetailSheet } from "@/components/tasks/tasks-detail-sheet";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import { TasksTable } from "@/components/tasks/tasks-table";
import { cn } from "@ssota/ui/lib/utils";

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

const tabLabels: Record<TaskTab, string> = {
  table: "Table",
  board: "Board",
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as TaskFilter[]).map((filter) => (
          <Button
            key={filter}
            render={
              <Link
                href={buildHref(filter, activeTab)}
                scroll={false}
              />
            }
            variant={activeFilter === filter ? "default" : "outline"}
            size="sm"
            nativeButton={false}
          >
            {filterLabels[filter]}{" "}
            <Badge variant="secondary">
              {rows.filter((row) => matchesFilter(row, filter)).length}
            </Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Work queue</CardTitle>
            <CardDescription>
              Runtime tasks from the tasks table — spawn via spawn_task, move on
              the board to update status.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(tabLabels) as TaskTab[]).map((tab) => (
              <Button
                key={tab}
                render={
                  <Link href={buildHref(activeFilter, tab)} scroll={false} />
                }
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                nativeButton={false}
              >
                {tabLabels[tab]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className={cn(activeTab === "table" ? "p-0" : "p-4")}>
          {filtered.length === 0 ? (
            <div className="space-y-3 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No runtime tasks match this view yet. Use spawn_task from MCP to
                add work items to this queue.
              </p>
            </div>
          ) : activeTab === "board" ? (
            <TasksKanbanBoard
              rows={filtered}
              projectId={projectId}
              onOpenDetail={setSelected}
              onStatusChange={handleStatusChange}
              motionReduced={motionReduced || isPending}
            />
          ) : (
            <TasksTable rows={filtered} onOpenDetail={setSelected} />
          )}
        </CardContent>
      </Card>

      <TasksDetailSheet task={selected} onClose={() => setSelected(null)} />
    </div>
  );
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
    return (
      row.executorType === "System" || assignee.includes("automation")
    );
  }
  return true;
}
