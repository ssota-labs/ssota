import type { AgentDefinition } from "@ssota/contracts";
import type { AgentDefinitionReadPort } from "../../ports/agent-definition-port.js";

export type {
  AgentDefinitionPort as WorkflowInstructionPort,
  AgentDefinitionReadPort as WorkflowInstructionReadPort,
  AgentDefinitionWritePort as WorkflowInstructionWritePort,
} from "../../ports/agent-definition-port.js";

export interface ResolvedWorkflowInstruction {
  instruction: AgentDefinition;
  source: "db";
}

/** @deprecated Use readAgentDefinitionById from use-cases/agent */
export async function readWorkflowInstructionById(
  port: AgentDefinitionReadPort,
  id: string,
): Promise<ResolvedWorkflowInstruction | null> {
  const row = await port.getById(id);
  return row ? { instruction: row, source: "db" } : null;
}

/** @deprecated Use listAgentDefinitions from use-cases/agent */
export async function listWorkflowInstructions(
  port: AgentDefinitionReadPort,
): Promise<ResolvedWorkflowInstruction[]> {
  const indices = await port.listDefinitions();
  const resolved: ResolvedWorkflowInstruction[] = [];
  for (const index of indices) {
    const row = await port.getById(index.id);
    if (row) resolved.push({ instruction: row, source: "db" });
  }
  return resolved;
}
