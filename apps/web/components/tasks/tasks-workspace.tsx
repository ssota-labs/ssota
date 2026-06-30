import type { TaskStatus } from "@ssota/contracts";

export type TaskWorkspaceRow = {
  id: string;
  title: string;
  status: TaskStatus;
  executorType: string;
  assignee: string;
  agentDefinitionId: string;
  subjectId: string;
  acceptanceCriteria: string[];
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  completedAt: string;
  updatedAt: string;
  createdAt: string;
};
