"use client";

import { useState, useTransition } from "react";
import { spawnTaskAction } from "@/app/actions";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { TASK_STATUS_LABELS } from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

export type WorkflowOption = {
  workflowKey: string;
  title: string;
};

type SpawnTaskDialogProps = {
  projectId: string;
  workflowOptions: WorkflowOption[];
  taskOptions?: TaskWorkspaceRow[];
};

export function SpawnTaskDialog({
  projectId,
  workflowOptions,
  taskOptions = [],
}: SpawnTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [workflowKey, setWorkflowKey] = useState(
    workflowOptions[0]?.workflowKey ?? "work.implement_feature",
  );
  const [assignee, setAssignee] = useState("");
  const [executorType, setExecutorType] = useState<"Agent" | "Human" | "System">(
    "Human",
  );
  const [blockedByTaskIds, setBlockedByTaskIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setAssignee("");
    setExecutorType("Human");
    setWorkflowKey(workflowOptions[0]?.workflowKey ?? "work.implement_feature");
    setBlockedByTaskIds([]);
    setError(null);
  }

  function toggleBlocker(taskId: string, checked: boolean) {
    setBlockedByTaskIds((current) =>
      checked
        ? [...current, taskId]
        : current.filter((id) => id !== taskId),
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await spawnTaskAction(projectId, {
          title: title.trim(),
          workflowKey,
          assignee: assignee.trim() || undefined,
          executorType,
          blockedByTaskIds:
            blockedByTaskIds.length > 0 ? blockedByTaskIds : undefined,
        });
        setOpen(false);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create task");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>New task</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>
              Add a work item to this project queue. Agents can also use MCP
              spawn_task.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to be done?"
                required
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-workflow">Workflow</Label>
              <Select
                value={workflowKey}
                onValueChange={(value) => value && setWorkflowKey(value)}
                disabled={isPending}
                items={workflowOptions.map((option) => ({
                  value: option.workflowKey,
                  label: option.title,
                }))}
              >
                <SelectTrigger id="task-workflow" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workflowOptions.map((option) => (
                    <SelectItem key={option.workflowKey} value={option.workflowKey}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-executor">Executor</Label>
              <Select
                value={executorType}
                onValueChange={(value) =>
                  value && setExecutorType(value as "Agent" | "Human" | "System")
                }
                disabled={isPending}
                items={[
                  { value: "Human", label: "Human" },
                  { value: "Agent", label: "Agent" },
                  { value: "System", label: "System" },
                ]}
              >
                <SelectTrigger id="task-executor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Human">Human</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-assignee">Assignee (optional)</Label>
              <Input
                id="task-assignee"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                placeholder="email or agent id"
                disabled={isPending}
              />
            </div>
            {taskOptions.length > 0 ? (
              <div className="grid gap-2">
                <Label>Depends on (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Select tasks that must finish before this one can run. Completed
                  tasks still count as valid predecessors.
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                  {taskOptions.map((task) => (
                    <li key={task.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`blocker-${task.id}`}
                        checked={blockedByTaskIds.includes(task.id)}
                        onCheckedChange={(checked) =>
                          toggleBlocker(task.id, checked === true)
                        }
                        disabled={isPending}
                      />
                      <label
                        htmlFor={`blocker-${task.id}`}
                        className="min-w-0 flex-1 cursor-pointer text-sm leading-snug"
                      >
                        <span className="font-medium">{task.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {TASK_STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
