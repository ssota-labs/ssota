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
  isMain: z.boolean().default(false),
  referenceOnly: z.boolean().default(false),
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
    isMain: true,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
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
    isMain: false,
    referenceOnly: false,
    toolBundles: ["graph.read", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.report_builder.md",
  },
  {
    id: BUILTIN_AGENT_IDS.guideAgentAuthoring,
    title: "Guide: agent authoring",
    description:
      "Reference for writing good agent definitions (description, body). Load when authoring agents.",
    isMain: false,
    referenceOnly: true,
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    instructionFile: "guide.agent_authoring.md",
  },
  {
    id: BUILTIN_AGENT_IDS.guidePageAuthoring,
    title: "Guide: page authoring",
    description:
      "Reference for the json-render page format (spec, bindings, actions). Load when authoring pages.",
    isMain: false,
    referenceOnly: true,
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    instructionFile: "guide.page_authoring.md",
  },
  {
    id: BUILTIN_AGENT_IDS.guideScriptToolAuthoring,
    title: "Guide: script tool authoring",
    description:
      "Reference for authoring Script Tools (stored TypeScript workers). Load when defining reusable batch logic.",
    isMain: false,
    referenceOnly: true,
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    instructionFile: "guide.script_tool_authoring.md",
  },
  {
    id: BUILTIN_AGENT_IDS.guideTaskDelegation,
    title: "Guide: task delegation",
    description:
      "Reference for how the Main Agent creates and assigns tasks. Load when designing delegation patterns.",
    isMain: false,
    referenceOnly: true,
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    instructionFile: "guide.task_delegation.md",
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

/** Lightweight routing-manifest row for Main Agent delegation. */
export interface AgentManifestEntry {
  id: string;
  name: string;
  description: string;
}

/**
 * Task-runnable agents for Main Agent routing. Excludes main and reference guides.
 */
export function listRoutableAgentIndex(): AgentManifestEntry[] {
  return Object.values(AGENT_DEFINITION_REGISTRY)
    .filter((a) => !a.isMain && !a.referenceOnly)
    .map((a) => ({
      id: a.id,
      name: a.title,
      description: a.description,
    }));
}

/** Main agent builtin definition. */
export function getMainAgentDefinition(): AgentDefinitionBuiltin {
  const main = AGENT_DEFINITION_REGISTRY[MAIN_AGENT_ID];
  if (!main) {
    throw new Error("Main agent builtin definition is missing from registry");
  }
  return main;
}

/** DB seeds for teamspace bootstrap — stable ids from {@link BUILTIN_AGENT_IDS}. */
export const AGENT_DEFINITION_SEEDS: AgentDefinitionSeed[] = Object.values(
  AGENT_DEFINITION_REGISTRY,
).map((entry) => ({
  id: entry.id,
  name: entry.title,
  description: entry.description,
  instructions: textToBlockNoteContent(entry.instruction),
  isMain: entry.isMain,
  referenceOnly: entry.referenceOnly,
  toolBundles: entry.toolBundles,
  nodeScopes: entry.nodeScopes,
  runPolicy: entry.runPolicy,
}));

export { BUILTIN_AGENT_IDS, MAIN_AGENT_ID, isBuiltinAgentId, type BuiltinAgentId } from "./builtin-ids.js";
