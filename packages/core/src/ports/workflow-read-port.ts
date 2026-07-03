import type { AgentDefinitionBuiltin } from "@ssota/contracts/agents";
import {
  getAgentDefinitionById,
  isKnownBuiltinAgentId,
} from "@ssota/contracts/agents";

export interface WorkflowReadPort {
  getWorkflowById(agentDefinitionId: string): AgentDefinitionBuiltin | null;
  isKnownWorkflowId(agentDefinitionId: string): boolean;
}

export function createContractsWorkflowReadPort(): WorkflowReadPort {
  return {
    getWorkflowById: getAgentDefinitionById,
    isKnownWorkflowId: isKnownBuiltinAgentId,
  };
}
