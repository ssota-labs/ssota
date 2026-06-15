import type { SpawnTaskInput } from "@ssota/contracts";
import { getWorkflowByKey } from "@ssota/contracts/workflows";
import { TaskError } from "../domain/task-errors.js";
import { isBlockerTerminal } from "../domain/task-dependency.js";
import { assertGraphNodeInProject } from "../domain/graph-scope.js";
import type { GraphReadPort } from "../ports/graph-read-port.js";
import type { Task, TaskPort } from "../domain/types.js";

export interface SpawnTaskDeps {
  tasks: TaskPort;
  graphRead?: GraphReadPort;
}

export async function spawnTask(
  deps: SpawnTaskDeps,
  projectId: string,
  input: SpawnTaskInput,
): Promise<Task> {
  const workflow = getWorkflowByKey(input.workflowKey);
  if (!workflow) {
    throw new TaskError(
      "UNKNOWN_WORKFLOW_KEY",
      `Workflow key '${input.workflowKey}' is not in the registry`,
    );
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

  const blockerIds = uniqueIds(input.blockedByTaskIds ?? []);
  const blockers: Task[] = [];
  for (const blockerId of blockerIds) {
    const blocker = await deps.tasks.getTask(blockerId);
    if (!blocker) {
      throw new TaskError(
        "INVALID_DEPENDENCY",
        `Blocker task '${blockerId}' not found`,
      );
    }
    if (blocker.projectId !== projectId) {
      throw new TaskError(
        "PROJECT_MISMATCH",
        `Blocker task '${blockerId}' belongs to a different project`,
      );
    }
    blockers.push(blocker);
  }

  const defaultStatus =
    workflow.defaultStatus ?? defaultStatusForCategory(workflow.category);
  const status =
    blockers.some((blocker) => !isBlockerTerminal(blocker.status))
      ? "pending"
      : defaultStatus;

  return deps.tasks.createTask(
    {
      title: input.title,
      workflowKey: input.workflowKey,
      status,
      executorType: input.executorType ?? workflow.defaultExecutorType ?? "Agent",
      assignee: input.assignee ?? null,
      subjectId: input.subjectId ?? null,
      targetNodeId: input.targetNodeId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      context: input.context ?? {},
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      idempotencyKey: input.idempotencyKey ?? null,
    },
    blockerIds,
  );
}

function defaultStatusForCategory(
  category: NonNullable<ReturnType<typeof getWorkflowByKey>>["category"],
): Task["status"] {
  if (category === "orchestrator") return "ready";
  return "pending";
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
