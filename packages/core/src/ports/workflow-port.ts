import type { WorkflowInstructionDefinition } from "@ssota/contracts/workflows";

/**
 * Async, DB-backed workflow store (per-project, bound at construction like
 * {@link TaskPort}). Distinct from the sync registry-based {@link WorkflowReadPort}:
 * this reads/writes the `workflows` table so definitions are tenant-editable and
 * agent-authorable. Resolution with embedded-registry fallback lives in the
 * `readWorkflowByKey` / `listWorkflows` use-cases.
 */
export interface WorkflowPort {
  listWorkflows(): Promise<WorkflowInstructionDefinition[]>;
  getWorkflowByKey(
    workflowKey: string,
  ): Promise<WorkflowInstructionDefinition | null>;
  upsertWorkflow(
    def: WorkflowInstructionDefinition,
  ): Promise<WorkflowInstructionDefinition>;
  deleteWorkflow(workflowKey: string): Promise<void>;
}
