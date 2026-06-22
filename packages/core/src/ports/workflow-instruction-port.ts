import type {
  UpsertWorkflowInstructionInput,
  WorkflowInstruction,
  WorkflowInstructionIndex,
} from "@ssota/contracts";

/**
 * Async, DB-backed workflow instruction store (per-project, bound at
 * construction like {@link TaskPort}). Instructions are BlockNote jsonb
 * documents — no embedded registry fallback at runtime.
 */
export interface WorkflowInstructionReadPort {
  listInstructions(): Promise<WorkflowInstructionIndex[]>;
  getById(id: string): Promise<WorkflowInstruction | null>;
  getByKey(key: string, accountId?: string | null): Promise<WorkflowInstruction | null>;
}

export interface WorkflowInstructionWritePort {
  upsertInstruction(
    input: UpsertWorkflowInstructionInput & { accountId?: string | null },
  ): Promise<WorkflowInstruction>;
  deleteByKey(key: string, accountId?: string | null): Promise<void>;
}

export type WorkflowInstructionPort = WorkflowInstructionReadPort &
  WorkflowInstructionWritePort;

export interface MainInstructionPointerPort {
  getMainInstructionId(params: {
    projectId: string;
    accountId?: string | null;
  }): Promise<string | null>;
  setMainInstructionId(params: {
    projectId: string;
    accountId?: string | null;
    instructionId: string;
  }): Promise<void>;
}
