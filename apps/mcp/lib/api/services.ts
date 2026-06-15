import {
  GraphError,
  TaskError,
  enrichTask,
  enrichTasks,
  spawnTask as spawnTaskUseCase,
  updateTask as updateTaskUseCase,
} from "@ssota/core";
import type {
  GetTaskInput,
  QueryTasksInput,
  SpawnTaskInput,
  UpdateTaskInput,
} from "@ssota/contracts";
import { getGraphReadPort, getTaskPort } from "@/lib/ports";
import { jsonError } from "@/lib/api/response";

function taskDeps(projectId: string) {
  return {
    tasks: getTaskPort(projectId),
    graphRead: getGraphReadPort(projectId),
  };
}

export function mapTaskError(error: unknown): Response | null {
  if (error instanceof TaskError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "UNKNOWN_WORKFLOW_KEY" ||
            error.code === "VALIDATION_FAILED" ||
            error.code === "DEPENDENCY_BLOCKED" ||
            error.code === "INVALID_DEPENDENCY"
          ? 422
          : error.code === "PROJECT_MISMATCH"
            ? 403
            : 400;
    return jsonError(error.code, error.message, status);
  }
  if (error instanceof GraphError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "PROJECT_MISMATCH"
          ? 403
          : 422;
    return jsonError(error.code, error.message, status);
  }
  return null;
}

export async function listTasks(projectId: string, limit?: number) {
  const port = getTaskPort(projectId);
  const tasks = await port.listTasks({ limit });
  return enrichTasks(port, tasks);
}

export async function getTask(projectId: string, input: GetTaskInput) {
  const port = getTaskPort(projectId);
  const task = await port.getTask(input.taskId);
  return task ? enrichTask(port, task) : null;
}

export async function queryTasks(projectId: string, input: QueryTasksInput) {
  const port = getTaskPort(projectId);
  const tasks = await port.queryTasks(input);
  return enrichTasks(port, tasks);
}

export async function spawnTask(projectId: string, input: SpawnTaskInput) {
  const port = getTaskPort(projectId);
  const task = await spawnTaskUseCase(taskDeps(projectId), projectId, input);
  return enrichTask(port, task);
}

export async function updateTask(projectId: string, input: UpdateTaskInput) {
  const port = getTaskPort(projectId);
  const task = await updateTaskUseCase(taskDeps(projectId), projectId, input);
  return enrichTask(port, task);
}
