"use client";

import { useMemo, useState } from "react";
import { TasksDetail } from "@/components/tasks/tasks-detail";
import {
  SpawnTaskDialog,
  type AgentOption,
} from "@/components/tasks/spawn-task-dialog";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExecutorFilter = "all" | "Human" | "Agent" | "System";

const EXECUTOR_FILTERS: { value: ExecutorFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Human", label: "Human" },
  { value: "Agent", label: "Agent" },
  { value: "System", label: "System" },
];

type TasksExplorerProps = {
  rows: TaskWorkspaceRow[];
  teamspaceId: string;
  agentOptions: AgentOption[];
};

export function TasksExplorer({
  rows,
  teamspaceId,
  agentOptions,
}: TasksExplorerProps) {
  const [executorFilter, setExecutorFilter] = useState<ExecutorFilter>("all");

  const filteredRows = useMemo(
    () =>
      executorFilter === "all"
        ? rows
        : rows.filter((row) => row.executorType === executorFilter),
    [rows, executorFilter],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">Tasks</h1>
            <p className="text-xs text-muted-foreground">
              Runtime work queue for humans, agents, and automation. Status changes go
              through update_task.
            </p>
          </div>
          <SpawnTaskDialog teamspaceId={teamspaceId} agentOptions={agentOptions} />
        </div>
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Executor filter"
        >
          {EXECUTOR_FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={executorFilter === option.value ? "secondary" : "ghost"}
              className={cn("h-7 px-2 text-xs")}
              onClick={() => setExecutorFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <TasksDetail
        rows={filteredRows}
        teamspaceId={teamspaceId}
        agentOptions={agentOptions}
      />
    </div>
  );
}
