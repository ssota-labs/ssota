import type { TaskIndex, TaskStatus } from "@ssota/contracts";

const TERMINAL_BLOCKER_STATUSES: ReadonlySet<TaskStatus> = new Set([
  "done",
  "cancelled",
]);

export function countOpenBlockers(blockedBy: TaskIndex[]): number {
  return blockedBy.filter(
    (blocker) => !TERMINAL_BLOCKER_STATUSES.has(blocker.status),
  ).length;
}
