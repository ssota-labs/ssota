import type { TaskStatus } from "@ssota/contracts";

export const TASK_STATUSES: TaskStatus[] = [
  "pending",
  "ready",
  "running",
  "blocked",
  "done",
  "cancelled",
  "failed",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  running: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
  failed: "Failed",
};
