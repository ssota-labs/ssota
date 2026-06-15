import type { TaskStatus, TaskIndex } from "@ssota/contracts";

export type TaskTab = "table" | "board";

export type TaskWorkspaceRow = {
  id: string;
  title: string;
  status: TaskStatus;
  executorType: string;
  assignee: string;
  workflowKey: string;
  subjectId: string;
  acceptanceCriteria: string[];
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  completedAt: string;
  updatedAt: string;
  createdAt: string;
  blockedBy: TaskIndex[];
  isRunnable: boolean;
};
