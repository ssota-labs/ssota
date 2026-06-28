import type { UpdateTaskInput } from "@ssota/contracts";
import { TaskError } from "../domain/task-errors.js";
import { assertGraphNodeInProject } from "../domain/graph-scope.js";
import type { GraphReadPort } from "../ports/graph-read-port.js";
import type { Task, TaskPort } from "../domain/types.js";

export interface UpdateTaskDeps {
  tasks: TaskPort;
  graphRead?: GraphReadPort;
}

export async function updateTask(
  deps: UpdateTaskDeps,
  teamspaceId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const { taskId, ...patch } = input;
  const hasPatch = Object.keys(patch).length > 0;
  if (!hasPatch) {
    throw new TaskError(
      "VALIDATION_FAILED",
      "At least one field to update is required",
    );
  }

  const existing = await deps.tasks.getTask(taskId);
  if (!existing) {
    throw new TaskError("NOT_FOUND", `Task '${taskId}' not found`);
  }
  if (existing.teamspaceId !== teamspaceId) {
    throw new TaskError(
      "ORG_MISMATCH",
      `Task '${taskId}' belongs to a different project`,
    );
  }

  if (patch.targetNodeId) {
    if (!deps.graphRead) {
      throw new TaskError(
        "PRECONDITION_FAILED",
        "targetNodeId requires graph read access for validation",
      );
    }
    const node = await deps.graphRead.getNodeById(patch.targetNodeId);
    assertGraphNodeInProject(teamspaceId, node, "Target node");
  }

  const updated = await deps.tasks.updateTask(taskId, patch);
  if (!updated) {
    throw new TaskError("NOT_FOUND", `Task '${taskId}' not found`);
  }
  return updated;
}
