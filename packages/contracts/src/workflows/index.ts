import { z } from "zod";
import { ExecutorTypeSchema } from "../definitions.js";
import { TaskStatusSchema } from "../task.js";
import { loadWorkflowInstruction } from "./load-instruction.js";

/** Reserved key for the main orchestration/router instruction. */
export const RESERVED_MAIN_WORKFLOW_KEY = "agent.main" as const;

export const WorkflowCategorySchema = z.enum([
  "orchestrator",
  "recurring",
  "work",
  "initiative",
]);

export type WorkflowCategory = z.infer<typeof WorkflowCategorySchema>;

export const WorkflowCadenceHintSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "on_demand",
]);

export type WorkflowCadenceHint = z.infer<typeof WorkflowCadenceHintSchema>;

export const WorkflowInstructionDefinitionSchema = z.object({
  workflowKey: z.string().min(1),
  title: z.string().min(1),
  category: WorkflowCategorySchema,
  cadenceHint: WorkflowCadenceHintSchema.optional(),
  defaultExecutorType: ExecutorTypeSchema.optional(),
  defaultStatus: TaskStatusSchema.optional(),
  instruction: z.string().min(1),
});

export type WorkflowInstructionDefinition = z.infer<
  typeof WorkflowInstructionDefinitionSchema
>;

type WorkflowMeta = Omit<WorkflowInstructionDefinition, "instruction"> & {
  instructionFile: string;
};

const WORKFLOW_META: WorkflowMeta[] = [
  {
    workflowKey: "agent.main",
    title: "Agent main router",
    category: "orchestrator",
    cadenceHint: "on_demand",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "agent.main.md",
  },
  {
    workflowKey: "orchestrator.bootstrap",
    title: "Orchestrator bootstrap",
    category: "orchestrator",
    cadenceHint: "on_demand",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.bootstrap.md",
  },
  {
    workflowKey: "orchestrator.daily",
    title: "Daily orchestrator",
    category: "orchestrator",
    cadenceHint: "daily",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.daily.md",
  },
  {
    workflowKey: "orchestrator.weekly",
    title: "Weekly orchestrator",
    category: "orchestrator",
    cadenceHint: "weekly",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.weekly.md",
  },
  {
    workflowKey: "orchestrator.monthly",
    title: "Monthly orchestrator",
    category: "orchestrator",
    cadenceHint: "monthly",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.monthly.md",
  },
  {
    workflowKey: "orchestrator.watchdog",
    title: "Task watchdog",
    category: "orchestrator",
    cadenceHint: "on_demand",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.watchdog.md",
  },
  {
    workflowKey: "work.implement_feature",
    title: "Implement feature",
    category: "work",
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "work.implement_feature.md",
  },
  {
    workflowKey: "work.write_document",
    title: "Write document",
    category: "work",
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "work.write_document.md",
  },
  {
    workflowKey: "work.unblock",
    title: "Unblock stalled task",
    category: "work",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "work.unblock.md",
  },
];

function buildRegistry(): Record<string, WorkflowInstructionDefinition> {
  const registry: Record<string, WorkflowInstructionDefinition> = {};
  for (const meta of WORKFLOW_META) {
    if (meta.workflowKey in registry) {
      throw new Error(`Duplicate workflow key: ${meta.workflowKey}`);
    }
    const { instructionFile, ...rest } = meta;
    registry[meta.workflowKey] = WorkflowInstructionDefinitionSchema.parse({
      ...rest,
      instruction: loadWorkflowInstruction(instructionFile),
    });
  }
  return registry;
}

export const WORKFLOW_REGISTRY: Record<string, WorkflowInstructionDefinition> =
  buildRegistry();

export const WORKFLOW_KEYS = Object.keys(WORKFLOW_REGISTRY) as WorkflowInstructionKey[];

export type WorkflowInstructionKey = (typeof WORKFLOW_META)[number]["workflowKey"];

export function listWorkflowKeys(): WorkflowInstructionKey[] {
  return [...WORKFLOW_KEYS];
}

export function getWorkflowByKey(
  workflowKey: string,
): WorkflowInstructionDefinition | null {
  const entry = WORKFLOW_REGISTRY[workflowKey];
  return entry ?? null;
}

export function isKnownWorkflowKey(
  workflowKey: string,
): workflowKey is WorkflowInstructionKey {
  return workflowKey in WORKFLOW_REGISTRY;
}

import { buildWorkflowInstructionSeeds } from "./seed.js";

export const WORKFLOW_INSTRUCTION_SEEDS =
  buildWorkflowInstructionSeeds(WORKFLOW_REGISTRY);
