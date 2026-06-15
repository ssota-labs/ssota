import {
  GetTaskInputSchema,
  QueryTasksInputSchema,
} from "@ssota/contracts";
import {
  serializeTask,
} from "@ssota/core";
import { getTaskPort } from "@/lib/ports";

export async function listTasks(projectId: string, limit?: number) {
  const tasks = await getTaskPort(projectId).listTasks({ limit });
  return tasks.map(serializeTask);
}

export async function getTask(
  projectId: string,
  input: ReturnType<typeof GetTaskInputSchema.parse>,
) {
  const task = await getTaskPort(projectId).getTask(input.taskId);
  return task ? serializeTask(task) : null;
}

export async function queryTasks(
  projectId: string,
  input: ReturnType<typeof QueryTasksInputSchema.parse>,
) {
  const tasks = await getTaskPort(projectId).queryTasks(input);
  return tasks.map(serializeTask);
}
