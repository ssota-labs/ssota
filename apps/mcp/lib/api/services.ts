import {
  GraphError,
  TaskError,
  serializeTask,
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
            error.code === "VALIDATION_FAILED"
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
  const tasks = await getTaskPort(projectId).listTasks({ limit });
  return tasks.map(serializeTask);
}

export async function getTask(projectId: string, input: GetTaskInput) {
  const task = await getTaskPort(projectId).getTask(input.taskId);
  return task ? serializeTask(task) : null;
}

export async function queryTasks(projectId: string, input: QueryTasksInput) {
  const tasks = await getTaskPort(projectId).queryTasks(input);
  return tasks.map(serializeTask);
}

export async function spawnTask(projectId: string, input: SpawnTaskInput) {
  const task = await spawnTaskUseCase(taskDeps(projectId), projectId, input);
  return serializeTask(task);
}

export async function updateTask(projectId: string, input: UpdateTaskInput) {
  const task = await updateTaskUseCase(taskDeps(projectId), projectId, input);
  return serializeTask(task);
}
