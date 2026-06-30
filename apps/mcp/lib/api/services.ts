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
import { getGraphPortsForTeamspace, getTaskPort, getAgentDefinitionPort } from "@/lib/ports";
import { jsonError } from "@/lib/api/response";

async function taskDeps(teamspaceId: string) {
  const graphPorts = await getGraphPortsForTeamspace(teamspaceId);
  return {
    tasks: getTaskPort(teamspaceId),
    graphRead: graphPorts.graphRead,
    agentDefinitions: getAgentDefinitionPort(teamspaceId),
  };
}

export function mapTaskError(error: unknown): Response | null {
  if (error instanceof TaskError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "UNKNOWN_AGENT_DEFINITION" ||
            error.code === "UNKNOWN_AGENT_KEY" ||
            error.code === "VALIDATION_FAILED"
          ? 422
          : error.code === "ORG_MISMATCH"
            ? 403
            : 400;
    return jsonError(error.code, error.message, status);
  }
  if (error instanceof GraphError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "ORG_MISMATCH"
          ? 403
          : 422;
    return jsonError(error.code, error.message, status);
  }
  return null;
}

export async function listTasks(teamspaceId: string, limit?: number) {
  const tasks = await getTaskPort(teamspaceId).listTasks({ limit });
  return tasks.map(serializeTask);
}

export async function getTask(teamspaceId: string, input: GetTaskInput) {
  const task = await getTaskPort(teamspaceId).getTask(input.taskId);
  return task ? serializeTask(task) : null;
}

export async function queryTasks(teamspaceId: string, input: QueryTasksInput) {
  const tasks = await getTaskPort(teamspaceId).queryTasks(input);
  return tasks.map(serializeTask);
}

export async function spawnTask(teamspaceId: string, input: SpawnTaskInput) {
  const task = await spawnTaskUseCase(await taskDeps(teamspaceId), teamspaceId, input);
  return serializeTask(task);
}

export async function updateTask(teamspaceId: string, input: UpdateTaskInput) {
  const deps = await taskDeps(teamspaceId);
  const task = await updateTaskUseCase(
    { tasks: deps.tasks, graphRead: deps.graphRead },
    teamspaceId,
    input,
  );
  return serializeTask(task);
}
