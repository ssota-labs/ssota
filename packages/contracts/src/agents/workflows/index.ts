import { z } from "zod";
import { ExecutorTypeSchema } from "../../shared/definitions.js";
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
  /**
   * Reference-only built-ins (guides/know-how) are loadable by key via
   * get_workflow_instruction but hidden from the routing manifest — they are
   * knowledge, not tasks to route.
   */
  reference: z.boolean().optional(),
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

function buildRegistry(
  meta: WorkflowMeta[],
): Record<string, WorkflowInstructionDefinition> {
  const registry: Record<string, WorkflowInstructionDefinition> = {};
  for (const entry of meta) {
    if (entry.workflowKey in registry) {
      throw new Error(`Duplicate workflow key: ${entry.workflowKey}`);
    }
    const { instructionFile, ...rest } = entry;
    registry[entry.workflowKey] = WorkflowInstructionDefinitionSchema.parse({
      ...rest,
      instruction: loadWorkflowInstruction(instructionFile),
    });
  }
  return registry;
}

export const WORKFLOW_REGISTRY: Record<string, WorkflowInstructionDefinition> =
  buildRegistry(WORKFLOW_META);

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

/**
 * Built-in workflows ship in code and are available in EVERY project without
 * being seeded into the DB. Kept OUT of {@link WORKFLOW_INSTRUCTION_SEEDS}.
 * (Currently empty — teamspace setup is handled by the main agent runtime.)
 */
const BUILTIN_WORKFLOW_META: WorkflowMeta[] = [];

export const BUILTIN_WORKFLOW_REGISTRY: Record<
  string,
  WorkflowInstructionDefinition
> = buildRegistry(BUILTIN_WORKFLOW_META);

/** Lightweight routing-manifest row (no DB id — built-ins have none). */
export interface WorkflowManifestEntry {
  key: string;
  name: string;
  description: string;
}

/**
 * Built-in workflows as manifest rows (key + name + when-to-use). Excludes
 * reference-only guides — those are loadable by key but not routed.
 */
export function listBuiltinWorkflowIndex(): WorkflowManifestEntry[] {
  return Object.values(BUILTIN_WORKFLOW_REGISTRY)
    .filter((w) => !w.reference)
    .map((w) => ({
      key: w.workflowKey,
      name: w.title,
      description: w.description,
    }));
}

/** Full built-in definition (with instruction text) by key, or null. */
export function getBuiltinWorkflowByKey(
  workflowKey: string,
): WorkflowInstructionDefinition | null {
  return BUILTIN_WORKFLOW_REGISTRY[workflowKey] ?? null;
}

import type { WorkflowInstructionSeed } from "../workflow-instruction.js";

/**
 * DB seeds for project bootstrap — intentionally EMPTY. WORKFLOW_META and the
 * registry are kept in code for metadata/reference, but workflows are no longer
 * seeded into each project's DB. A project starts empty and the agent authors
 * workflows on demand via write tools and the main agent runtime.
 * `buildWorkflowInstructionSeeds` (./seed.js) stays available if explicit
 * seeding is ever needed again.
 */
export const WORKFLOW_INSTRUCTION_SEEDS: WorkflowInstructionSeed[] = [];
