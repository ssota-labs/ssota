import { GraphError, TaskError } from "@ssota/core";

export function throwMcpToolError(error: unknown): never {
  if (error instanceof TaskError || error instanceof GraphError) {
    throw new Error(`${error.code}: ${error.message}`);
  }
  throw error;
}

export function throwUnknownAgentKey(agentKey: string): never {
  throw new Error(
    `UNKNOWN_AGENT_KEY: Agent '${agentKey}' is not in the registry`,
  );
}

/** @deprecated Use throwUnknownAgentKey */
export const throwUnknownWorkflowKey = throwUnknownAgentKey;
