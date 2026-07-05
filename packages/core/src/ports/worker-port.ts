import type {
  CreateWorkerInput,
  UpdateWorkerInput,
  Worker,
  WorkerIndex,
  WorkerKind,
} from "@ssota/contracts";

export interface WorkerReadPort {
  listWorkers(kind?: WorkerKind): Promise<WorkerIndex[]>;
  getByKey(key: string): Promise<Worker | null>;
  getById(id: string): Promise<Worker | null>;
  listForAgentDefinition(agentDefinitionId: string): Promise<Worker[]>;
  listLinkedWorkerIds(agentDefinitionId: string): Promise<string[]>;
}

export interface WorkerWritePort {
  createWorker(input: CreateWorkerInput): Promise<Worker>;
  updateWorker(id: string, patch: UpdateWorkerInput): Promise<Worker>;
  deleteWorker(id: string): Promise<void>;
  setAgentWorkers(
    agentDefinitionId: string,
    workerIds: string[],
  ): Promise<void>;
}

export type WorkerPort = WorkerReadPort & WorkerWritePort;
