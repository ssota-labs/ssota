"use client";

import { useEffect, useState } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { TASK_STATUS_LABELS } from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { RunDetailSheet } from "@/components/console/run-detail-sheet";
import {
  TRIGGER_BADGE_LABELS,
  runDurationLabel,
  runStatusBadgeVariant,
  type AgentRunRow,
} from "@/lib/console/agent-run-format";

type TasksDetailSheetProps = {
  teamspaceId: string;
  task: TaskWorkspaceRow | null;
  onClose: () => void;
};

export function TasksDetailSheet({
  teamspaceId,
  task,
  onClose,
}: TasksDetailSheetProps) {
  const [activeRun, setActiveRun] = useState<AgentRunRow | null>(null);

  return (
    <>
      <Sheet open={task !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          className="overflow-y-auto sm:max-w-xl"
          data-testid="tasks-detail-sheet"
        >
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
                    ["agent", task.agentDefinitionId],
                    ["subject_id", task.subjectId],
                  ]}
                />
                <TaskRunLogSection
                  teamspaceId={teamspaceId}
                  taskId={task.id}
                  onOpenRun={setActiveRun}
                />
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
                    <Badge variant="secondary">
                      completed {task.completedAt.slice(0, 10)}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <RunDetailSheet
        teamspaceId={teamspaceId}
        run={activeRun}
        onClose={() => setActiveRun(null)}
      />
    </>
  );
}

/**
 * 태스크에 연결된 에이전트 런 목록 (agent_runs.task_id). 행 클릭 시 공유
 * RunDetailSheet가 툴콜·에이전트 메시지 트랜스크립트를 연다.
 */
function TaskRunLogSection({
  teamspaceId,
  taskId,
  onOpenRun,
}: {
  teamspaceId: string;
  taskId: string;
  onOpenRun: (run: AgentRunRow) => void;
}) {
  const [runs, setRuns] = useState<AgentRunRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRuns(null);
    setError(null);
    const search = new URLSearchParams({ teamspaceId, taskId });
    fetch(`/api/agent-runs?${search.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load runs (${res.status})`);
        return res.json() as Promise<{ runs: AgentRunRow[] }>;
      })
      .then((data) => {
        if (!cancelled) setRuns(data.runs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [teamspaceId, taskId]);

  return (
    <div data-testid="task-run-log">
      <div className="mb-2 text-sm font-medium">Execution log</div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : runs === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> 실행 로그 불러오는 중…
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="task-run-log-empty">
          아직 실행 로그가 없습니다. 에이전트가 이 태스크를 실행하면 여기에
          기록됩니다.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-md border">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => onOpenRun(run)}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-muted/30"
              data-testid={`task-run-row-${run.id}`}
            >
              <Badge
                variant={runStatusBadgeVariant(run.status)}
                className="w-16 justify-center"
              >
                {run.status}
              </Badge>
              <Badge variant="outline" className="w-20 justify-center">
                {run.trigger
                  ? (TRIGGER_BADGE_LABELS[run.trigger] ?? run.trigger)
                  : run.runtimeKind}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {new Date(run.startedAt).toLocaleString()}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {runDurationLabel(run) ?? "실행 중"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
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
