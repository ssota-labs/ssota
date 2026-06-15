import type { WorkflowInstructionDefinition } from "@ssota/contracts/workflows";
import { getWorkflowByKey, isKnownWorkflowKey } from "@ssota/contracts/workflows";

export interface WorkflowReadPort {
  getWorkflowByKey(workflowKey: string): WorkflowInstructionDefinition | null;
  isKnownWorkflowKey(workflowKey: string): boolean;
}

export function createContractsWorkflowReadPort(): WorkflowReadPort {
  return {
    getWorkflowByKey,
    isKnownWorkflowKey,
  };
}
