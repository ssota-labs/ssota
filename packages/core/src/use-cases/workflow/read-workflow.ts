import {
  getWorkflowByKey,
  WORKFLOW_REGISTRY,
  type WorkflowInstructionDefinition,
} from "@ssota/contracts/workflows";
import type { WorkflowPort } from "../../ports/workflow-port.js";

export interface ResolvedWorkflow {
  definition: WorkflowInstructionDefinition;
  /** "db" = tenant-editable row; "registry" = embedded default fallback. */
  source: "db" | "registry";
}

/**
 * Resolve a single workflow, preferring the per-project DB row and falling back
 * to the embedded {@link WORKFLOW_REGISTRY} so un-seeded/older projects and tests
 * keep working.
 */
export async function readWorkflowByKey(
  workflows: WorkflowPort,
  workflowKey: string,
): Promise<ResolvedWorkflow | null> {
  const row = await workflows.getWorkflowByKey(workflowKey);
  if (row) return { definition: row, source: "db" };
  const fallback = getWorkflowByKey(workflowKey);
  return fallback ? { definition: fallback, source: "registry" } : null;
}

/** List workflows: DB rows take precedence, registry fills any missing keys. */
export async function listWorkflows(
  workflows: WorkflowPort,
): Promise<ResolvedWorkflow[]> {
  const byKey = new Map<string, ResolvedWorkflow>();
  for (const def of await workflows.listWorkflows()) {
    byKey.set(def.workflowKey, { definition: def, source: "db" });
  }
  for (const [key, def] of Object.entries(WORKFLOW_REGISTRY)) {
    if (!byKey.has(key)) byKey.set(key, { definition: def, source: "registry" });
  }
  return [...byKey.values()];
}
