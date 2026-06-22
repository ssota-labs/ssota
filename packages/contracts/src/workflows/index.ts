import { z } from "zod";
import { ExecutorTypeSchema } from "../definitions.js";
import { TaskStatusSchema } from "../task.js";
import { loadWorkflowInstruction } from "./load-instruction.js";

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
  /**
   * Skill-style "when to use" line. Injected into the main agent's prompt as a
   * routing manifest so the agent self-selects the workflow and loads its full
   * playbook on demand. This is the single source of truth for routing.
   */
  description: z.string().min(1),
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
    workflowKey: "orchestrator.bootstrap",
    title: "Orchestrator bootstrap",
    description:
      "First-time project automation setup. Use once when a project's agent automation is first configured or reconfigured.",
    category: "orchestrator",
    cadenceHint: "on_demand",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.bootstrap.md",
  },
  {
    workflowKey: "orchestrator.daily",
    title: "Daily orchestrator",
    description:
      "Daily backlog review. Use on a daily cadence (or manual trigger) to review the task backlog and spawn today's work items.",
    category: "orchestrator",
    cadenceHint: "daily",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.daily.md",
  },
  {
    workflowKey: "orchestrator.weekly",
    title: "Weekly orchestrator",
    description:
      "Weekly planning. Use on a weekly cadence to align tasks with initiatives, schedule larger work, and close stale items.",
    category: "orchestrator",
    cadenceHint: "weekly",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.weekly.md",
  },
  {
    workflowKey: "orchestrator.monthly",
    title: "Monthly orchestrator",
    description:
      "Monthly retrospective. Use on a monthly cadence to summarize throughput and groom long-lived backlog items.",
    category: "orchestrator",
    cadenceHint: "monthly",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.monthly.md",
  },
  {
    workflowKey: "orchestrator.watchdog",
    title: "Task watchdog",
    description:
      "Stalled-task recovery. Use when tasks have stalled (running >24h, ready >48h, or blocked) to spawn recovery or escalation work.",
    category: "orchestrator",
    cadenceHint: "on_demand",
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "orchestrator.watchdog.md",
  },
  {
    workflowKey: "work.implement_feature",
    title: "Implement feature",
    description:
      "Implement a single scoped feature or fix. Use when executing a concrete, well-specified coding task with clear acceptance criteria.",
    category: "work",
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "work.implement_feature.md",
  },
  {
    workflowKey: "work.write_document",
    title: "Write document",
    description:
      "Create or update a graph document node. Use when the deliverable is written content/documentation in the SSOTA graph.",
    category: "work",
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "work.write_document.md",
  },
  {
    workflowKey: "work.unblock",
    title: "Unblock stalled task",
    description:
      "Recover a stalled or blocked task. Use when a parent task is blocked and needs nudging, re-queuing, or escalation to a human.",
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
