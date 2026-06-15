import type { TaskStatus } from "@ssota/contracts";

export type TaskFilter = "all" | "human" | "agent" | "automation" | "blocked" | "review";
export type TaskTab = "table" | "board";

export type TaskWorkspaceRow = {
  id: string;
  title: string;
  status: TaskStatus;
  executorType: string;
  assignee: string;
  workflowKey: string;
  targetNodeId: string;
  subjectId: string;
  acceptanceCriteria: string[];
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  sourceActionLogId: string;
  completedAt: string;
  updatedAt: string;
  createdAt: string;
};

export function matchesTaskFilter(row: TaskWorkspaceRow, filter: TaskFilter) {
  if (filter === "all") return true;
  if (filter === "blocked") return row.status === "blocked";
  if (filter === "review") return row.status === "ready";
  const assignee = row.assignee.toLowerCase();
  if (filter === "human") {
    return row.executorType === "Human" || assignee.includes("human");
  }
  if (filter === "agent") {
    return row.executorType === "Agent" || assignee.includes("agent");
  }
  if (filter === "automation") {
    return row.executorType === "System" || assignee.includes("automation");
  }
  return true;
}
