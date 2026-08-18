/**
 * @deprecated Import from `./worker.js` instead. Kept for transitional imports.
 */
import {
  WorkerDefaultConfigSchema,
  WorkerPermissionsSchema,
  WorkerRuntimeSchema,
  WorkerSchema,
  WorkerIndexSchema,
  RunWorkerInputSchema,
  AgentDefinitionWorkerLinkSchema,
  type WorkerDefaultConfig,
  type WorkerPermissions,
  type WorkerRuntime,
  type Worker,
  type WorkerIndex,
  type RunWorkerInput,
  type AgentDefinitionWorkerLink,
} from "./worker.js";

export const ScriptToolRuntimeSchema = WorkerRuntimeSchema;
export type ScriptToolRuntime = WorkerRuntime;

export const ScriptToolPermissionsSchema = WorkerPermissionsSchema;
export type ScriptToolPermissions = WorkerPermissions;

export const ScriptToolDefaultConfigSchema = WorkerDefaultConfigSchema;
export type ScriptToolDefaultConfig = WorkerDefaultConfig;

export const ScriptToolSchema = WorkerSchema;
export type ScriptTool = Worker;

export const ScriptToolIndexSchema = WorkerIndexSchema;
export type ScriptToolIndex = WorkerIndex;

export const RunScriptToolInputSchema = RunWorkerInputSchema;
export type RunScriptToolInput = RunWorkerInput;

export const AgentDefinitionScriptToolLinkSchema = AgentDefinitionWorkerLinkSchema;
export type AgentDefinitionScriptToolLink = AgentDefinitionWorkerLink;
