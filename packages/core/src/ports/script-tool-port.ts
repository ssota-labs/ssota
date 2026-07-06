/**
 * @deprecated Import from `./worker-port.js` instead.
 */
import type { Worker, WorkerIndex } from "@ssota/contracts";
import type { WorkerPort } from "./worker-port.js";

export type ScriptTool = Worker;
export type ScriptToolIndex = WorkerIndex;
export type ScriptToolPort = WorkerPort;

export type ScriptToolReadPort = Pick<
  WorkerPort,
  | "listWorkers"
  | "getByKey"
  | "listForAgentDefinition"
  | "listLinkedWorkerIds"
>;
export type ScriptToolWritePort = Pick<WorkerPort, "setAgentWorkers">;
