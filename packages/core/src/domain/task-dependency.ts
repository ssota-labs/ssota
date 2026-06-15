import type { TaskStatus } from "@ssota/contracts";
import type { Task } from "./types.js";

const TERMINAL_BLOCKER_STATUSES: ReadonlySet<TaskStatus> = new Set([
  "done",
  "cancelled",
]);

export function isBlockerTerminal(status: TaskStatus): boolean {
  return TERMINAL_BLOCKER_STATUSES.has(status);
}

export function hasOpenBlockers(blockers: Task[]): boolean {
  return blockers.some((blocker) => !isBlockerTerminal(blocker.status));
}

export function computeIsRunnable(task: Task, blockers: Task[]): boolean {
  return task.status === "ready" && !hasOpenBlockers(blockers);
}
