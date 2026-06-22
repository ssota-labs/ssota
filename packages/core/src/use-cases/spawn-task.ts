import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { TaskError } from "../domain/task-errors.js";
import { assertGraphNodeInProject } from "../domain/graph-scope.js";
import type { GraphReadPort } from "../ports/graph-read-port.js";
import type { WorkflowInstructionReadPort } from "../ports/workflow-instruction-port.js";
import type { Task, TaskPort } from "../domain/types.js";
import type { SpawnTaskInput } from "@ssota/contracts";

export interface SpawnTaskDeps {
  tasks: TaskPort;
  graphRead?: GraphReadPort;
  workflowInstructions: WorkflowInstructionReadPort;
}

export async function spawnTask(
  deps: SpawnTaskDeps,
  projectId: string,
  input: SpawnTaskInput,
): Promise<Task> {
  let workflowInstructionId = input.workflowInstructionId ?? null;
  let workflowInstructionKey: string | null = input.workflowInstructionKey ?? null;

  if (workflowInstructionId) {
    const row = await deps.workflowInstructions.getById(workflowInstructionId);
    if (!row || row.projectId !== projectId) {
      throw new TaskError(
        "UNKNOWN_WORKFLOW_INSTRUCTION",
        `Workflow instruction '${workflowInstructionId}' not found in project`,
      );
    }
    workflowInstructionKey = row.key;
  } else if (workflowInstructionKey) {
    const row = await deps.workflowInstructions.getByKey(workflowInstructionKey);
    if (!row) {
      throw new TaskError(
        "UNKNOWN_WORKFLOW_INSTRUCTION",
        `Workflow instruction key '${workflowInstructionKey}' not found`,
      );
    }
    workflowInstructionId = row.id;
  } else {
    throw new TaskError(
      "PRECONDITION_FAILED",
      "workflowInstructionId or workflowInstructionKey is required",
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
    assertGraphNodeInProject(projectId, node, "Target node");
  }

  if (input.parentTaskId) {
    const parent = await deps.tasks.getTask(input.parentTaskId);
    if (!parent) {
      throw new TaskError("NOT_FOUND", `Parent task '${input.parentTaskId}' not found`);
    }
    if (parent.projectId !== projectId) {
      throw new TaskError(
        "PROJECT_MISMATCH",
        `Parent task '${input.parentTaskId}' belongs to a different project`,
      );
    }
  }

  return deps.tasks.createTask({
    title: input.title,
    workflowInstructionId,
    workflowInstructionKey,
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
