"use client";

import { useState, useTransition } from "react";
import { spawnTaskAction } from "@/app/actions";
import { AddTaskDependencyDialog } from "@/components/tasks/add-task-dependency-dialog";
import { TaskDependenciesField } from "@/components/tasks/task-dependencies-field";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

export type WorkflowOption = {
  workflowKey: string;
  title: string;
};

const formRowClassName =
  "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-start gap-x-8 gap-y-5 px-6";

function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Label htmlFor={htmlFor} className="pt-2.5 text-sm font-normal">
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </>
  );
}

type SpawnTaskSheetProps = {
  projectId: string;
  workflowOptions: WorkflowOption[];
  taskOptions?: TaskWorkspaceRow[];
};

export function SpawnTaskSheet({
  projectId,
  workflowOptions,
  taskOptions = [],
}: SpawnTaskSheetProps) {
  const [open, setOpen] = useState(false);
  const [addDependencyOpen, setAddDependencyOpen] = useState(false);
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
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <SheetTrigger render={<Button size="sm" />}>New task</SheetTrigger>
        <SheetContent
          side="right"
          size="half"
          className="flex h-full flex-col gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="sticky top-0 z-10 shrink-0 border-b border-border bg-popover px-6 py-5">
            <SheetTitle>Create task</SheetTitle>
            <SheetDescription>
              Add a work item to this project queue. Agents can also use MCP
              spawn_task.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-y-auto py-5">
              <section className="border-b border-border pb-6">
                <div className={formRowClassName}>
                  <FormRow label="Title" htmlFor="task-title">
                    <Input
                      id="task-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="What needs to be done?"
                      required
                      disabled={isPending}
                    />
                  </FormRow>

                  <FormRow label="Workflow" htmlFor="task-workflow">
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
                          <SelectItem
                            key={option.workflowKey}
                            value={option.workflowKey}
                          >
                            {option.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormRow>

                  <FormRow label="Executor" htmlFor="task-executor">
                    <Select
                      value={executorType}
                      onValueChange={(value) =>
                        value &&
                        setExecutorType(value as "Agent" | "Human" | "System")
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
                  </FormRow>

                  <FormRow label="Assignee" htmlFor="task-assignee">
                    <Input
                      id="task-assignee"
                      value={assignee}
                      onChange={(event) => setAssignee(event.target.value)}
                      placeholder="email or agent id (optional)"
                      disabled={isPending}
                    />
                  </FormRow>
                </div>
              </section>

              <section className="pt-6">
                <TaskDependenciesField
                  selectedTaskIds={blockedByTaskIds}
                  taskOptions={taskOptions}
                  onSelectedTaskIdsChange={setBlockedByTaskIds}
                  onAddDependency={() => setAddDependencyOpen(true)}
                  disabled={isPending}
                />
              </section>

              {error ? (
                <p className="px-6 pt-4 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <SheetFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 border-t border-border bg-popover px-6 py-4">
              <SheetClose render={<Button type="button" variant="outline" />}>
                Cancel
              </SheetClose>
              <Button type="submit" disabled={isPending || !title.trim()}>
                {isPending ? "Creating…" : "Create task"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AddTaskDependencyDialog
        open={addDependencyOpen}
        onOpenChange={setAddDependencyOpen}
        existingTaskIds={blockedByTaskIds}
        taskOptions={taskOptions}
        onAddDependency={(taskId) => {
          setBlockedByTaskIds((current) =>
            current.includes(taskId) ? current : [...current, taskId],
          );
        }}
      />
    </>
  );
}

/** @deprecated Use SpawnTaskSheet */
export { SpawnTaskSheet as SpawnTaskDialog };
