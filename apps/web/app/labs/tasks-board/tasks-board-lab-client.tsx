"use client";

import { useState } from "react";
import type { TaskStatus } from "@ssota/contracts";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

const now = "2026-06-24T09:00:00.000Z";

function row(
  id: string,
  title: string,
  status: TaskStatus,
  assignee: string,
  agentDefinitionId: string,
): TaskWorkspaceRow {
  return {
    id,
    title,
    status,
    executorType: "human",
    assignee,
    agentDefinitionId,
    subjectId: "",
    acceptanceCriteria: [],
    context: {},
    result: {},
    completedAt: "",
    updatedAt: now,
    createdAt: now,
  };
}

const SEED_ROWS: TaskWorkspaceRow[] = [
  row("a1f3c901-0000-4000-8000-000000000001", "Draft product roadmap for Q3", "pending", "Felix Han", "b0000000-0000-4000-8000-000000000001"),
  row("b2e8d420-0000-4000-8000-000000000002", "Wire up MCP consent scopes", "pending", "Joowhan Yohn", "b0000000-0000-4000-8000-000000000002"),
  row("c3a7f188-0000-4000-8000-000000000003", "Review onboarding SDLC template", "ready", "Felix Han", "b0000000-0000-4000-8000-000000000003"),
  row("d4b6e233-0000-4000-8000-000000000004", "Implement kanban board on tasks page", "running", "Joowhan Yohn", "b0000000-0000-4000-8000-000000000004"),
  row("e5c9a744-0000-4000-8000-000000000005", "Render agent markdown as rich blocks", "running", "Felix Han", "b0000000-0000-4000-8000-000000000005"),
  row("f6d0b855-0000-4000-8000-000000000006", "Investigate flaky e2e dev server", "blocked", "Unassigned", "b0000000-0000-4000-8000-000000000006"),
  row("a7e1c966-0000-4000-8000-000000000007", "Ship chat history sidebar", "done", "Joowhan Yohn", "b0000000-0000-4000-8000-000000000007"),
  row("b8f2d077-0000-4000-8000-000000000008", "Seed dogfood roadmap node", "done", "Felix Han", "b0000000-0000-4000-8000-000000000008"),
  row("c9a3e188-0000-4000-8000-000000000009", "Deprecate legacy auth provider", "cancelled", "Unassigned", "b0000000-0000-4000-8000-000000000009"),
  row("d0b4f299-0000-4000-8000-00000000000a", "Migrate Postgres extension", "failed", "Joowhan Yohn", "b0000000-0000-4000-8000-00000000000a"),
];

export function TasksBoardLabClient() {
  const [rows, setRows] = useState<TaskWorkspaceRow[]>(SEED_ROWS);
  const [lastAction, setLastAction] = useState<string | null>(null);

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === taskId ? { ...r, status } : r)),
    );
    setLastAction(`updateTaskStatus(${taskId.slice(0, 6)} → ${status})`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4">
      <p className="text-muted-foreground text-xs">
        {lastAction ? (
          <>
            Last action: <code className="font-mono">{lastAction}</code>
          </>
        ) : (
          "Drag a card to another column to change its status. Click a card to open its detail."
        )}
      </p>
      <div className="border-border bg-background relative min-h-[36rem] flex-1 overflow-auto rounded-lg border p-4">
        <TasksKanbanBoard
          rows={rows}
          teamspaceId="lab-preview"
          onOpenDetail={(task) =>
            setLastAction(`openDetail(${task.id.slice(0, 6)} · ${task.title})`)
          }
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}
