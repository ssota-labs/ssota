import type { AgentDefinitionBuiltin } from "@ssota/contracts/agents";
import {
  getAgentDefinitionByKey,
  isKnownAgentKey,
} from "@ssota/contracts/agents";

export interface WorkflowReadPort {
  getWorkflowByKey(workflowKey: string): AgentDefinitionBuiltin | null;
  isKnownWorkflowKey(workflowKey: string): boolean;
}

export function createContractsWorkflowReadPort(): WorkflowReadPort {
  return {
    getWorkflowByKey: getAgentDefinitionByKey,
    isKnownWorkflowKey: isKnownAgentKey,
  };
}
