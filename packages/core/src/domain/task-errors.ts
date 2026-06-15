export type TaskErrorCode =
  | "UNKNOWN_WORKFLOW_KEY"
  | "PROJECT_MISMATCH"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "PRECONDITION_FAILED"
  | "DEPENDENCY_BLOCKED"
  | "INVALID_DEPENDENCY";

export class TaskError extends Error {
  constructor(
    public readonly code: TaskErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TaskError";
  }
}
