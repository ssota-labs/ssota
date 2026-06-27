/**
 * Input for the WorkflowAgent task runner reached via the agent run/gate
 * routes (see ssota-agent.ee.ts). The run lifecycle now lives entirely in the
 * WorkflowAgent workflow; only the input shape is shared here.
 */
export interface RunSsotaAgentInput {
  projectId: string;
  taskId: string;
  /** End-user data partition (Phase 5). Undefined = builder/shared scope. */
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}
