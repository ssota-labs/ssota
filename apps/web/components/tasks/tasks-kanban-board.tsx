"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { TaskStatus } from "@ssota/contracts";
import { Avatar, AvatarFallback } from "@ssota/ui/components/ui/avatar";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/kibo-ui/kanban";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksKanbanBoardProps = {
  rows: TaskWorkspaceRow[];
  teamspaceId: string;
  onOpenDetail: (row: TaskWorkspaceRow) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  motionReduced?: boolean;
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "#6B7280",
  ready: "#3B82F6",
  running: "#F59E0B",
  blocked: "#EF4444",
  done: "#10B981",
  cancelled: "#9CA3AF",
  failed: "#DC2626",
};

const columns: { id: TaskStatus; name: string }[] = TASK_STATUSES.map(
  (status) => ({
    id: status,
    name: TASK_STATUS_LABELS[status] ?? status,
  }),
);

type KanbanFeature = TaskWorkspaceRow & {
  name: string;
  column: TaskStatus;
};

function toFeatures(rows: TaskWorkspaceRow[]): KanbanFeature[] {
  return rows.map((row) => ({
    ...row,
    name: row.title,
    column: row.status,
  }));
}

function initials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function TasksKanbanBoard({
  rows,
  onOpenDetail,
  onStatusChange,
  motionReduced = false,
}: TasksKanbanBoardProps) {
  const [features, setFeatures] = useState<KanbanFeature[]>(() =>
    toFeatures(rows),
  );

  // Re-sync optimistic board state whenever the server rows change. Adjusting
  // state during render (the React-recommended pattern) avoids the cascading
  // re-render an effect would cause.
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setFeatures(toFeatures(rows));
  }

  // A pointer activation distance keeps card clicks (open detail) distinct
  // from drags, and disables dragging entirely when motion is reduced.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: motionReduced ? 9999 : 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: motionReduced
        ? { delay: 100000, tolerance: 0 }
        : { delay: 120, tolerance: 8 },
    }),
  );

  // By drag-end the latest onDragOver has already committed the card's new
  // column into `features`, so this closure sees the final assignment. Persist
  // only when the dragged card actually crossed into a different status column.
  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const moved = features.find((feature) => feature.id === id);
    if (moved && moved.column !== moved.status) {
      void onStatusChange(moved.id, moved.column);
    }
  }

  const countByColumn = useMemo(() => {
    const counts = new Map<TaskStatus, number>();
    for (const status of TASK_STATUSES) counts.set(status, 0);
    for (const feature of features)
      counts.set(feature.column, (counts.get(feature.column) ?? 0) + 1);
    return counts;
  }, [features]);

  // dnd-kit generates non-deterministic ids during SSR, so render the drag
  // tree only on the client. useSyncExternalStore keeps server and first
  // client render in sync (both false) without an effect-driven setState.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <div
        aria-hidden
        className="grid auto-cols-[260px] grid-flow-col gap-4"
      >
        {columns.map((column) => (
          <div
            key={column.id}
            className="min-h-40 rounded-md border bg-secondary"
          />
        ))}
      </div>
    );
  }

  return (
    <KanbanProvider
      id="tasks-kanban-board"
      className="auto-cols-[260px]"
      columns={columns}
      data={features}
      onDataChange={setFeatures}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      {(column) => (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[column.id as TaskStatus],
                  }}
                />
                <span>{column.name}</span>
              </div>
              <Badge variant="secondary">
                {countByColumn.get(column.id as TaskStatus) ?? 0}
              </Badge>
            </div>
          </KanbanHeader>
          <KanbanCards id={column.id}>
            {(feature: KanbanFeature) => (
              <KanbanCard
                column={column.id}
                id={feature.id}
                key={feature.id}
                name={feature.name}
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 text-left"
                  onClick={() => onOpenDetail(feature)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="m-0 flex-1 font-medium text-sm leading-snug">
                      {feature.name}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {feature.id.slice(0, 6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {feature.agentDefinitionId ? (
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {feature.agentDefinitionId.slice(0, 8)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {feature.assignee && feature.assignee !== "Unassigned" ? (
                      <Avatar className="size-5 shrink-0">
                        <AvatarFallback className="text-[9px]">
                          {initials(feature.assignee)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                </button>
              </KanbanCard>
            )}
          </KanbanCards>
        </KanbanBoard>
      )}
    </KanbanProvider>
  );
}
