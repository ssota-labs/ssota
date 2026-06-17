import { GraphError, TaskError } from "@ssota/core";

export function throwMcpToolError(error: unknown): never {
  if (error instanceof TaskError || error instanceof GraphError) {
    throw new Error(`${error.code}: ${error.message}`);
  }
  throw error;
}

export function throwUnknownWorkflowKey(workflowKey: string): never {
  throw new Error(
    `UNKNOWN_WORKFLOW_KEY: Workflow '${workflowKey}' is not in the registry`,
  );
}
