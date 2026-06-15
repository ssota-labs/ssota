"use client";

import { useMemo, useState } from "react";
import { GitBranchIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ssota/ui/components/ui/input-group";
import { cn } from "@ssota/ui/lib/utils";
import { TASK_STATUS_LABELS } from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

const DIALOG_CONTENT_CLASS =
  "!flex h-[min(640px,calc(100vh-3rem))] w-[min(760px,calc(100vw-2rem))] !max-w-[760px] flex-col !gap-0 overflow-hidden !p-0 !sm:max-w-[760px] bg-popover shadow-lg";

type AddTaskDependencyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTaskIds: string[];
  taskOptions: TaskWorkspaceRow[];
  onAddDependency: (taskId: string) => void;
};

export function AddTaskDependencyDialog({
  open,
  onOpenChange,
  existingTaskIds,
  taskOptions,
  onAddDependency,
}: AddTaskDependencyDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const availableTasks = useMemo(
    () => taskOptions.filter((task) => !existingTaskIds.includes(task.id)),
    [existingTaskIds, taskOptions],
  );

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return availableTasks;
    return availableTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(normalized) ||
        task.workflowKey.toLowerCase().includes(normalized) ||
        task.assignee.toLowerCase().includes(normalized),
    );
  }, [availableTasks, query]);

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ??
    filteredTasks[0] ??
    null;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
      setSelectedTaskId(null);
    }
    onOpenChange(nextOpen);
  }

  function handleAddDependency() {
    if (!selectedTask) return;
    onAddDependency(selectedTask.id);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} forceBackdrop className={DIALOG_CONTENT_CLASS}>
        <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-popover px-2.5">
          <DialogTitle className="text-sm font-medium leading-none">
            Add dependency
          </DialogTitle>
          <InputGroup className="ml-auto h-7 max-w-[11rem]">
            <InputGroupAddon>
              <MagnifyingGlassIcon className="size-3 shrink-0 opacity-50" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search tasks"
            />
          </InputGroup>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            onClick={() => handleOpenChange(false)}
          >
            <XIcon className="size-3.5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)]">
          <nav className="overflow-y-auto border-r bg-muted/10 p-1.5">
            {filteredTasks.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                {availableTasks.length === 0
                  ? "All project tasks are already selected."
                  : "No tasks match your search."}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filteredTasks.map((task) => {
                  const active = selectedTask?.id === task.id;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-muted/60",
                        )}
                      >
                        <GitBranchIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {task.title}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {TASK_STATUS_LABELS[task.status] ?? task.status}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <div className="min-h-0 overflow-y-auto bg-background">
            {selectedTask ? (
              <div className="flex min-h-[240px] flex-col px-5 py-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <GitBranchIcon className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">{selectedTask.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {TASK_STATUS_LABELS[selectedTask.status] ?? selectedTask.status}
                      {" · "}
                      {selectedTask.workflowKey}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-muted-foreground">
                  <p>
                    Assignee:{" "}
                    <span className="text-foreground">{selectedTask.assignee}</span>
                  </p>
                  <p>
                    Task id:{" "}
                    <span className="font-mono text-foreground">
                      {selectedTask.id.slice(0, 8)}
                    </span>
                  </p>
                </div>

                <div className="mt-auto rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    This task must reach a terminal state before the new task can
                    move to ready or running.
                  </p>
                  {selectedTask.status === "done" ||
                  selectedTask.status === "cancelled" ? (
                    <Badge variant="secondary" className="mt-3">
                      Already terminal
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-xs text-muted-foreground">
                Select a task to add as a dependency.
              </div>
            )}
          </div>
        </div>

        <div className="flex h-11 shrink-0 items-center justify-end border-t bg-popover px-2.5">
          <Button
            type="button"
            size="sm"
            disabled={!selectedTask}
            onClick={handleAddDependency}
          >
            Add dependency
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
