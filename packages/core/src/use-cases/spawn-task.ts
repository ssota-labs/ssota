import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { TaskError } from "../domain/task-errors.js";
import { assertGraphNodeInProject } from "../domain/graph-scope.js";
import type { GraphReadPort } from "../ports/graph-read-port.js";
import type { AgentDefinitionReadPort } from "../ports/agent-definition-port.js";
import type { Task, TaskPort } from "../domain/types.js";
import type { SpawnTaskInput } from "@ssota/contracts";

export interface SpawnTaskDeps {
  tasks: TaskPort;
  graphRead?: GraphReadPort;
  agentDefinitions: AgentDefinitionReadPort;
}

export async function spawnTask(
  deps: SpawnTaskDeps,
  teamspaceId: string,
  input: SpawnTaskInput,
): Promise<Task> {
  let agentDefinitionId = input.agentDefinitionId ?? null;
  let agentKey: string | null = input.agentKey ?? null;

  if (agentDefinitionId) {
    const row = await deps.agentDefinitions.getById(agentDefinitionId);
    if (!row || row.teamspaceId !== teamspaceId) {
      throw new TaskError(
        "UNKNOWN_AGENT_DEFINITION",
        `Agent definition '${agentDefinitionId}' not found in project`,
      );
    }
    agentKey = row.key;
  } else if (agentKey) {
    const row = await deps.agentDefinitions.getByKey(agentKey);
    if (!row) {
      throw new TaskError(
        "UNKNOWN_AGENT_DEFINITION",
        `Agent key '${agentKey}' not found`,
      );
    }
    agentDefinitionId = row.id;
  } else {
    throw new TaskError(
      "PRECONDITION_FAILED",
      "agentDefinitionId or agentKey is required",
    );
  }

  if (input.context?.executionDirective) {
    ExecutionDirectiveSchema.parse(input.context.executionDirective);
  }

  if (input.idempotencyKey) {
    const existing = await deps.tasks.getTaskByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) {
      return existing;
    }
  }

  if (input.targetNodeId) {
    if (!deps.graphRead) {
      throw new TaskError(
        "PRECONDITION_FAILED",
        "targetNodeId requires graph read access for validation",
      );
    }
    const node = await deps.graphRead.getNodeById(input.targetNodeId);
    assertGraphNodeInProject(teamspaceId, node, "Target node");
  }

  if (input.parentTaskId) {
    const parent = await deps.tasks.getTask(input.parentTaskId);
    if (!parent) {
      throw new TaskError("NOT_FOUND", `Parent task '${input.parentTaskId}' not found`);
    }
    if (parent.teamspaceId !== teamspaceId) {
      throw new TaskError(
        "ORG_MISMATCH",
        `Parent task '${input.parentTaskId}' belongs to a different project`,
      );
    }
  }

  return deps.tasks.createTask({
    title: input.title,
    agentDefinitionId,
    agentKey,
    status: input.status ?? "pending",
    executorType: input.executorType ?? "Agent",
    assignee: input.assignee ?? null,
    subjectId: input.subjectId ?? null,
    targetNodeId: input.targetNodeId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    context: input.context ?? {},
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    idempotencyKey: input.idempotencyKey ?? null,
  });
}
