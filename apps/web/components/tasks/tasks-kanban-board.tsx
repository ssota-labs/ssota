"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TaskStatus } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksKanbanBoardProps = {
  rows: TaskWorkspaceRow[];
  projectId: string;
  onOpenDetail: (row: TaskWorkspaceRow) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  motionReduced?: boolean;
};

export function TasksKanbanBoard({
  rows,
  onOpenDetail,
  onStatusChange,
  motionReduced = false,
}: TasksKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: motionReduced ? 9999 : 6 },
    }),
  );

  const rowsByStatus = useMemo(() => {
    const grouped = Object.fromEntries(
      TASK_STATUSES.map((status) => [status, [] as TaskWorkspaceRow[]]),
    ) as Record<TaskStatus, TaskWorkspaceRow[]>;
    for (const row of rows) {
      grouped[row.status].push(row);
    }
    return grouped;
  }, [rows]);

  const activeTask = activeId
    ? rows.find((row) => row.id === activeId) ?? null
    : null;

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (motionReduced) return;

    const taskId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId || !TASK_STATUSES.includes(overId as TaskStatus)) return;

    const nextStatus = overId as TaskStatus;
    const current = rows.find((row) => row.id === taskId);
    if (!current || current.status === nextStatus) return;

    await onStatusChange(taskId, nextStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={rowsByStatus[status]}
            onOpenDetail={onOpenDetail}
            onStatusChange={onStatusChange}
            motionReduced={motionReduced}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  onOpenDetail,
  onStatusChange,
  motionReduced,
}: {
  status: TaskStatus;
  tasks: TaskWorkspaceRow[];
  onOpenDetail: (row: TaskWorkspaceRow) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  motionReduced: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-lg border bg-muted/20",
        isOver && "border-primary/40 bg-muted/40",
      )}
    >
      <header className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </header>
      <div className="flex min-h-28 flex-col gap-2 p-2">
        {tasks.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onOpenDetail={onOpenDetail}
              onStatusChange={onStatusChange}
              motionReduced={motionReduced}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DraggableTaskCard({
  task,
  onOpenDetail,
  onStatusChange,
  motionReduced,
}: {
  task: TaskWorkspaceRow;
  onOpenDetail: (row: TaskWorkspaceRow) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  motionReduced: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { status: task.status },
      disabled: motionReduced,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <TaskCard
        task={task}
        dragHandleProps={motionReduced ? undefined : { ...attributes, ...listeners }}
        onOpenDetail={onOpenDetail}
        onStatusChange={onStatusChange}
        motionReduced={motionReduced}
      />
    </div>
  );
}

function TaskCard({
  task,
  dragHandleProps,
  onOpenDetail,
  onStatusChange,
  motionReduced,
  isOverlay = false,
}: {
  task: TaskWorkspaceRow;
  dragHandleProps?: Record<string, unknown>;
  onOpenDetail?: (row: TaskWorkspaceRow) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void>;
  motionReduced?: boolean;
  isOverlay?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-md border bg-background p-3 shadow-xs transition-colors hover:bg-muted/40",
        isOverlay && "shadow-md",
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className={cn(
              "text-left text-sm font-medium leading-snug",
              dragHandleProps && "cursor-grab active:cursor-grabbing",
            )}
            onClick={() => onOpenDetail?.(task)}
            {...dragHandleProps}
          >
            {task.title}
          </button>
          <span className="font-mono text-[10px] text-muted-foreground">
            {task.id.slice(0, 6)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{task.workflowKey}</span>
          {task.assignee ? <span>{task.assignee}</span> : null}
        </div>
        {motionReduced && onStatusChange ? (
          <select
            className="w-full rounded-md border bg-background px-2 py-1 text-xs"
            value={task.status}
            onChange={(event) =>
              void onStatusChange(task.id, event.target.value as TaskStatus)
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </article>
  );
}
