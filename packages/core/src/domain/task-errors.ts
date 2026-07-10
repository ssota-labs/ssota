export type TaskErrorCode =
  | "UNKNOWN_AGENT_DEFINITION"
  | "ORG_MISMATCH"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "PRECONDITION_FAILED"
  | "GATE_PENDING"
  | "GATE_REJECTED";

export class TaskError extends Error {
  constructor(
    public readonly code: TaskErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TaskError";
  }
}
