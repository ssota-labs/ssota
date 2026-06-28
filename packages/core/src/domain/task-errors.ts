export type TaskErrorCode =
  | "UNKNOWN_WORKFLOW_INSTRUCTION"
  | "ORG_MISMATCH"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "PRECONDITION_FAILED";

export class TaskError extends Error {
  constructor(
    public readonly code: TaskErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TaskError";
  }
}
