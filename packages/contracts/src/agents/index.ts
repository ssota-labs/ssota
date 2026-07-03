import { z } from "zod";
import { ExecutorTypeSchema } from "../definitions.js";
import {
  ToolBundleSchema,
  NodeScopeSchema,
  RunPolicySchema,
  textToBlockNoteContent,
  type AgentDefinitionSeed,
} from "../agent-definition.js";
import { TaskStatusSchema } from "../task.js";
import { BUILTIN_AGENT_IDS, MAIN_AGENT_ID, type BuiltinAgentId } from "./builtin-ids.js";
import { loadAgentInstruction } from "./load-instruction.js";

export const AgentCadenceHintSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "on_demand",
]);

export type AgentCadenceHint = z.infer<typeof AgentCadenceHintSchema>;

export const AgentDefinitionBuiltinSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  /**
   * Skill-style "when to use" line. Injected into the main agent's prompt as a
   * routing manifest so the agent self-selects an executor and loads its full
   * playbook on demand.
   */
  description: z.string().min(1),
  toolBundles: z.array(ToolBundleSchema).default([]),
  nodeScopes: z.array(NodeScopeSchema).default([]),
  runPolicy: RunPolicySchema.default({}),
  cadenceHint: AgentCadenceHintSchema.optional(),
  defaultExecutorType: ExecutorTypeSchema.optional(),
  defaultStatus: TaskStatusSchema.optional(),
  instruction: z.string().min(1),
});

export type AgentDefinitionBuiltin = z.infer<typeof AgentDefinitionBuiltinSchema>;

type AgentMeta = Omit<AgentDefinitionBuiltin, "instruction"> & {
  instructionFile: string;
};

const AGENT_META: AgentMeta[] = [
  {
    id: BUILTIN_AGENT_IDS.main,
    title: "SSOTA Main Agent",
    description:
      "Default SSOTA conversational agent. Handles web chat, chatbots, project orchestration, heartbeat planning, and first-time setup.",
    toolBundles: [
      "graph.read",
      "graph.write",
      "tasks.manage",
      "pages.author",
      "connectors",
      "delegate",
      "skills.read",
    ],
    nodeScopes: [],
    runPolicy: {
      allowedTriggers: ["chat", "chatbot", "heartbeat", "schedule", "manual"],
    },
    cadenceHint: "on_demand",
    instructionFile: "main.ssota.md",
  },
  {
    id: BUILTIN_AGENT_IDS.implementFeature,
    title: "Implement feature",
    description:
      "Implement a single scoped feature or fix. Use when executing a concrete, well-specified coding task with clear acceptance criteria.",
    toolBundles: ["graph.read", "tasks.manage", "sandbox.code", "skills.read"],
    nodeScopes: [],
    runPolicy: { sandboxPolicy: "required", allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.implement_feature.md",
  },
  {
    id: BUILTIN_AGENT_IDS.reviewChanges,
    title: "Review changes",
    description:
      "Review code or graph changes against acceptance criteria. Use after implementation or before merge.",
    toolBundles: ["graph.read", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.review_changes.md",
  },
  {
    id: BUILTIN_AGENT_IDS.research,
    title: "Research",
    description:
      "Research a topic and produce structured findings. Use when information gathering is the primary deliverable.",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "connectors"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.research.md",
  },
  {
    id: BUILTIN_AGENT_IDS.writeDocument,
    title: "Write document",
    description:
      "Create or update a graph document node. Use when the deliverable is written content/documentation in the SSOTA graph.",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "pages.author"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.write_document.md",
  },
  {
    id: BUILTIN_AGENT_IDS.unblockTask,
    title: "Unblock stalled task",
    description:
      "Recover a stalled or blocked task. Use when a parent task is blocked and needs nudging, re-queuing, or escalation to a human.",
    toolBundles: ["graph.read", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule", "heartbeat", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "specialist.unblock_task.md",
  },
  {
    id: BUILTIN_AGENT_IDS.qa,
    title: "QA verification",
    description:
      "Run QA checks against acceptance criteria. Use for post-implementation verification work orders.",
    toolBundles: ["graph.read", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.qa.md",
  },
  {
    id: BUILTIN_AGENT_IDS.workerNotion,
    title: "Notion worker",
    description:
      "Batch sync or transform Notion content. Use for connector-backed Notion operations.",
    toolBundles: ["connectors", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.notion.md",
  },
  {
    id: BUILTIN_AGENT_IDS.workerGraphBatch,
    title: "Graph batch worker",
    description:
      "Batch graph read/write operations. Use for bulk node/edge updates with bounded concurrency.",
    toolBundles: ["graph.read", "graph.write", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.graph_batch.md",
  },
  {
    id: BUILTIN_AGENT_IDS.workerConnectorSync,
    title: "Connector sync worker",
    description:
      "Sync data from external connectors into the graph. Use for scheduled or on-demand connector batch jobs.",
    toolBundles: ["connectors", "graph.write", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.connector_sync.md",
  },
  {
    id: BUILTIN_AGENT_IDS.workerReportBuilder,
    title: "Report builder worker",
    description:
      "Build structured reports from graph data. Use when output is a compact summary or export artifact.",
    toolBundles: ["graph.read", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.report_builder.md",
  },
];

function buildRegistry(
  meta: AgentMeta[],
): Record<string, AgentDefinitionBuiltin> {
  const registry: Record<string, AgentDefinitionBuiltin> = {};
  for (const entry of meta) {
    if (entry.id in registry) {
      throw new Error(`Duplicate builtin agent id: ${entry.id}`);
    }
    const { instructionFile, ...rest } = entry;
    registry[entry.id] = AgentDefinitionBuiltinSchema.parse({
      ...rest,
      instruction: loadAgentInstruction(instructionFile),
    });
  }
  return registry;
}

export const AGENT_DEFINITION_REGISTRY: Record<string, AgentDefinitionBuiltin> =
  buildRegistry(AGENT_META);

export const BUILTIN_AGENT_ID_LIST = Object.keys(
  AGENT_DEFINITION_REGISTRY,
) as BuiltinAgentId[];

export function listBuiltinAgentIds(): BuiltinAgentId[] {
  return [...BUILTIN_AGENT_ID_LIST];
}

export function getAgentDefinitionById(
  agentDefinitionId: string,
): AgentDefinitionBuiltin | null {
  return AGENT_DEFINITION_REGISTRY[agentDefinitionId] ?? null;
}

export function isKnownBuiltinAgentId(
  agentDefinitionId: string,
): agentDefinitionId is BuiltinAgentId {
  return agentDefinitionId in AGENT_DEFINITION_REGISTRY;
}

/** Builtin specialists and workers seeded into agent_definitions (not main). */
export function listRunnableBuiltinAgentIds(): BuiltinAgentId[] {
  return listBuiltinAgentIds().filter((id) => id !== MAIN_AGENT_ID);
}

/** Lightweight routing-manifest row for Main Agent delegation. */
export interface AgentManifestEntry {
  id: string;
  name: string;
  description: string;
}

/** Task-runnable agents for Main Agent routing. Excludes main orchestrator. */
export function listRoutableAgentIndex(): AgentManifestEntry[] {
  return listRunnableBuiltinAgentIds().map((id) => {
    const a = AGENT_DEFINITION_REGISTRY[id]!;
    return {
      id: a.id,
      name: a.title,
      description: a.description,
    };
  });
}

/** Main agent builtin definition. */
export function getMainAgentDefinition(): AgentDefinitionBuiltin {
  const main = AGENT_DEFINITION_REGISTRY[MAIN_AGENT_ID];
  if (!main) {
    throw new Error("Main agent builtin definition is missing from registry");
  }
  return main;
}

/** DB seeds for teamspace bootstrap — runnable specialists/workers only. */
export const AGENT_DEFINITION_SEEDS: AgentDefinitionSeed[] =
  listRunnableBuiltinAgentIds().map((id) => {
    const entry = AGENT_DEFINITION_REGISTRY[id]!;
    return {
      id: entry.id,
      name: entry.title,
      description: entry.description,
      instructions: textToBlockNoteContent(entry.instruction),
      toolBundles: entry.toolBundles,
      nodeScopes: entry.nodeScopes,
      runPolicy: entry.runPolicy,
    };
  });

export { BUILTIN_AGENT_IDS, MAIN_AGENT_ID, isBuiltinAgentId, type BuiltinAgentId } from "./builtin-ids.js";
