import type { WorkflowInstructionDefinition } from "@ssota/contracts/workflows";
import {
  getWorkflowByKey,
  listWorkflowKeys,
  WORKFLOW_REGISTRY,
} from "@ssota/contracts/workflows";

export type WorkflowSummary = Omit<WorkflowInstructionDefinition, "instruction">;

function serializeWorkflowSummary(
  entry: WorkflowInstructionDefinition,
): WorkflowSummary {
  const { instruction: _instruction, ...summary } = entry;
  return summary;
}

export function listWorkflowsForMcp() {
  const workflows = listWorkflowKeys().map((key) =>
    serializeWorkflowSummary(WORKFLOW_REGISTRY[key]!),
  );
  return { workflows };
}

export function getWorkflowForMcp(workflowKey: string) {
  const entry = getWorkflowByKey(workflowKey);
  if (!entry) return null;
  return serializeWorkflowSummary(entry);
}

export function getWorkflowInstructionForMcp(workflowKey: string) {
  const entry = getWorkflowByKey(workflowKey);
  if (!entry) return null;
  return {
    workflowKey: entry.workflowKey,
    instruction: entry.instruction,
  };
}
