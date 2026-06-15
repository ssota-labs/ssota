"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { countOpenBlockers } from "@/components/tasks/task-blockers";
import { TASK_STATUS_LABELS } from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksDetailSheetProps = {
  task: TaskWorkspaceRow | null;
  rows: TaskWorkspaceRow[];
  onClose: () => void;
  onSelectTask: (row: TaskWorkspaceRow) => void;
};

export function TasksDetailSheet({
  task,
  rows,
  onClose,
  onSelectTask,
}: TasksDetailSheetProps) {
  const openBlockerCount = task ? countOpenBlockers(task.blockedBy) : 0;

  return (
    <Sheet open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {task ? (
          <>
            <SheetHeader>
              <SheetTitle>{task.title}</SheetTitle>
              <SheetDescription>
                Development workflow task detail — routing, context, and result.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              <DetailGroup
                title="Routing"
                rows={[
                  ["status", TASK_STATUS_LABELS[task.status] ?? task.status],
                  ["executor", task.executorType],
                  ["assignee", task.assignee],
                  ["workflow_key", task.workflowKey],
                  ["subject_id", task.subjectId],
                  ["runnable", task.isRunnable ? "yes" : "no"],
                ]}
              />
              {task.blockedBy.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <span>Blocked by</span>
                    {openBlockerCount > 0 ? (
                      <Badge variant="outline">
                        {openBlockerCount} open
                      </Badge>
                    ) : (
                      <Badge variant="secondary">all complete</Badge>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {task.blockedBy.map((blocker) => {
                      const row = rows.find((item) => item.id === blocker.id);
                      return (
                        <li key={blocker.id}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto w-full justify-start px-2 py-2 text-left"
                            onClick={() => {
                              if (row) onSelectTask(row);
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {blocker.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {TASK_STATUS_LABELS[blocker.status] ??
                                  blocker.status}
                              </div>
                            </div>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              <div>
                <div className="mb-2 text-sm font-medium">Acceptance criteria</div>
                {task.acceptanceCriteria.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {task.acceptanceCriteria.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No acceptance criteria declared.
                  </p>
                )}
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Context</div>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(task.context, null, 2)}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Result</div>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.completedAt ? (
                  <Badge variant="secondary">completed {task.completedAt}</Badge>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailGroup({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-all">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
