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
  workflowInstructionKey: string,
): TaskWorkspaceRow {
  return {
    id,
    title,
    status,
    executorType: "human",
    assignee,
    workflowInstructionKey,
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
  row("a1f3c901", "Draft product roadmap for Q3", "pending", "Felix Han", "roadmap.draft"),
  row("b2e8d420", "Wire up MCP consent scopes", "pending", "Joowhan Yohn", "mcp.connect"),
  row("c3a7f188", "Review onboarding SDLC template", "ready", "Felix Han", "template.review"),
  row("d4b6e233", "Implement kanban board on tasks page", "running", "Joowhan Yohn", "ui.kanban"),
  row("e5c9a744", "Render agent markdown as rich blocks", "running", "Felix Han", "node.render"),
  row("f6d0b855", "Investigate flaky e2e dev server", "blocked", "Unassigned", "e2e.fix"),
  row("a7e1c966", "Ship chat history sidebar", "done", "Joowhan Yohn", "chat.history"),
  row("b8f2d077", "Seed dogfood roadmap node", "done", "Felix Han", "dogfood.seed"),
  row("c9a3e188", "Deprecate legacy auth provider", "cancelled", "Unassigned", "auth.legacy"),
  row("d0b4f299", "Migrate Postgres extension", "failed", "Joowhan Yohn", "db.migrate"),
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
          projectId="lab-preview"
          onOpenDetail={(task) =>
            setLastAction(`openDetail(${task.id.slice(0, 6)} · ${task.title})`)
          }
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}
