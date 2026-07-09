export type GraphErrorCode =
  | "ORG_MISMATCH"
  | "UNKNOWN_NODE_TYPE"
  | "UNKNOWN_EDGE_TYPE"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "PRECONDITION_FAILED"
  | "FORBIDDEN"
  | "GATE_PENDING"
  | "GATE_REJECTED";

export class GraphError extends Error {
  constructor(
    public readonly code: GraphErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GraphError";
  }
}
