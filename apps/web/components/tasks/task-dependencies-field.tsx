"use client";

import { GitBranchIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Label } from "@ssota/ui/components/ui/label";
import { cn } from "@ssota/ui/lib/utils";
import { countOpenBlockers } from "@/components/tasks/task-blockers";
import { TASK_STATUS_LABELS } from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TaskDependenciesFieldProps = {
  selectedTaskIds: string[];
  taskOptions: TaskWorkspaceRow[];
  onSelectedTaskIdsChange: (taskIds: string[]) => void;
  onAddDependency: () => void;
  disabled?: boolean;
  className?: string;
};

export function TaskDependenciesField({
  selectedTaskIds,
  taskOptions,
  onSelectedTaskIdsChange,
  onAddDependency,
  disabled = false,
  className,
}: TaskDependenciesFieldProps) {
  const selectedTasks = selectedTaskIds
    .map((id) => taskOptions.find((task) => task.id === id))
    .filter((task): task is TaskWorkspaceRow => task !== undefined);

  function removeDependency(taskId: string) {
    if (disabled) return;
    onSelectedTaskIdsChange(selectedTaskIds.filter((id) => id !== taskId));
  }

  return (
    <div className={cn("space-y-3 px-6", className)}>
      <div className="space-y-1">
        <Label className="text-sm font-medium">Depends on</Label>
        <p className="text-xs text-muted-foreground">
          Tasks that must finish before this one can run. Completed tasks still
          count as valid predecessors.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {selectedTasks.length > 0 ? (
          <ul className="divide-y">
            {selectedTasks.map((task) => {
              const openBlockers = countOpenBlockers(task.blockedBy);
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-3"
                  data-testid={`task-dependency-row-${task.id}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                    <GitBranchIcon className="size-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {task.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                      <span className="font-mono">{task.workflowKey}</span>
                      {openBlockers > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          Blocked by {openBlockers}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                    disabled={disabled}
                    onClick={() => removeDependency(task.id)}
                    aria-label={`Remove ${task.title}`}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No dependencies yet. Add tasks that must complete first.
          </div>
        )}

        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            data-testid="add-task-dependency"
            disabled={disabled || taskOptions.length === 0}
            onClick={onAddDependency}
          >
            <PlusIcon className="size-3.5" />
            Add dependency
          </Button>
        </div>
      </div>
    </div>
  );
}
