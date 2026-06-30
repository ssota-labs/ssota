import { GraphError, TaskError } from "@ssota/core";

export function throwMcpToolError(error: unknown): never {
  if (error instanceof TaskError || error instanceof GraphError) {
    throw new Error(`${error.code}: ${error.message}`);
  }
  throw error;
}

export function throwUnknownAgentDefinitionId(agentDefinitionId: string): never {
  throw new Error(
    `UNKNOWN_AGENT_DEFINITION: Agent '${agentDefinitionId}' is not in the registry`,
  );
}

/** @deprecated Use throwUnknownAgentDefinitionId */
export const throwUnknownAgentKey = throwUnknownAgentDefinitionId;

/** @deprecated Use throwUnknownAgentDefinitionId */
export const throwUnknownWorkflowKey = throwUnknownAgentDefinitionId;
