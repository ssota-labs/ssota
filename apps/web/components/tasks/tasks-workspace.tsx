import type { TaskStatus } from "@ssota/contracts";

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
