import type { WorkflowInstruction } from "@ssota/contracts";
import type { WorkflowInstructionReadPort } from "../../ports/workflow-instruction-port.js";

export interface ResolvedWorkflowInstruction {
  instruction: WorkflowInstruction;
  source: "db";
}

export async function readWorkflowInstructionByKey(
  port: WorkflowInstructionReadPort,
  key: string,
  accountId?: string | null,
): Promise<ResolvedWorkflowInstruction | null> {
  const row = await port.getByKey(key, accountId);
  return row ? { instruction: row, source: "db" } : null;
}

export async function readWorkflowInstructionById(
  port: WorkflowInstructionReadPort,
  id: string,
): Promise<ResolvedWorkflowInstruction | null> {
  const row = await port.getById(id);
  return row ? { instruction: row, source: "db" } : null;
}

export async function listWorkflowInstructions(
  port: WorkflowInstructionReadPort,
): Promise<ResolvedWorkflowInstruction[]> {
  const indices = await port.listInstructions();
  const resolved: ResolvedWorkflowInstruction[] = [];
  for (const index of indices) {
    const row = await port.getById(index.id);
    if (row) resolved.push({ instruction: row, source: "db" });
  }
  return resolved;
}
