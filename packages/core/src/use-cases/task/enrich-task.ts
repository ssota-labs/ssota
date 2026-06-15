import type { TaskDetail } from "@ssota/contracts";
import {
  computeIsRunnable,
  hasOpenBlockers,
} from "../../domain/task-dependency.js";
import type { Task, TaskPort } from "../../domain/types.js";
import {
  serializeTask,
  serializeTaskDetail,
  serializeTaskIndex,
} from "../../domain/wire.js";

export async function enrichTask(
  tasks: TaskPort,
  task: Task,
): Promise<TaskDetail> {
  const blockers = await tasks.getBlockers(task.id);
  return serializeTaskDetail(task, blockers);
}

export async function enrichTasks(
  tasks: TaskPort,
  items: Task[],
): Promise<TaskDetail[]> {
  if (items.length === 0) return [];
  const blockerMap = await tasks.listBlockersByBlockedTaskIds(
    items.map((task) => task.id),
  );
  return items.map((task) => {
    const blockers = blockerMap.get(task.id) ?? [];
    return serializeTaskDetail(task, blockers);
  });
}

export { computeIsRunnable, hasOpenBlockers, serializeTask, serializeTaskIndex };
