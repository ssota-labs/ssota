import type {
  UpsertAgentDefinitionInput,
  AgentDefinition,
  AgentDefinitionIndex,
} from "@ssota/contracts";

/**
 * Async, DB-backed agent definition store (per-teamspace, bound at
 * construction like {@link TaskPort}).
 */
export interface AgentDefinitionReadPort {
  listDefinitions(): Promise<AgentDefinitionIndex[]>;
  getById(id: string): Promise<AgentDefinition | null>;
}

export interface AgentDefinitionWritePort {
  upsertDefinition(
    input: UpsertAgentDefinitionInput & { accountId?: string | null },
  ): Promise<AgentDefinition>;
  deleteById(id: string, accountId?: string | null): Promise<void>;
}

export type AgentDefinitionPort = AgentDefinitionReadPort &
  AgentDefinitionWritePort;

/** @deprecated Use AgentDefinitionPort */
export type WorkflowInstructionPort = AgentDefinitionPort;

/** @deprecated Use AgentDefinitionReadPort */
export type WorkflowInstructionReadPort = AgentDefinitionReadPort;

/** @deprecated Use AgentDefinitionWritePort */
export type WorkflowInstructionWritePort = AgentDefinitionWritePort;
