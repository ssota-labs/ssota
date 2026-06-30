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
  const row = await deps.agentDefinitions.getById(input.agentDefinitionId);
  if (!row || row.teamspaceId !== teamspaceId) {
    throw new TaskError(
      "UNKNOWN_AGENT_DEFINITION",
      `Agent definition '${input.agentDefinitionId}' not found in project`,
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
    agentDefinitionId: row.id,
    assignee: input.assignee ?? null,
    subjectId: input.subjectId ?? null,
    targetNodeId: input.targetNodeId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    executorType: input.executorType ?? "Agent",
    context: input.context ?? {},
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    idempotencyKey: input.idempotencyKey ?? null,
    status: input.status ?? "pending",
  });
}
