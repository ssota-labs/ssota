import { z } from "zod";
import { ExecutorTypeSchema } from "../definitions.js";
import {
  AgentKindSchema,
  ToolBundleSchema,
  NodeScopeSchema,
  RunPolicySchema,
} from "../agent-definition.js";
import { TaskStatusSchema } from "../task.js";
import { loadAgentInstruction } from "./load-instruction.js";

export const AgentCadenceHintSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "on_demand",
]);

export type AgentCadenceHint = z.infer<typeof AgentCadenceHintSchema>;

export const AgentDefinitionBuiltinSchema = z.object({
  agentKey: z.string().min(1),
  title: z.string().min(1),
  /**
   * Skill-style "when to use" line. Injected into the main agent's prompt as a
   * routing manifest so the agent self-selects the specialist and loads its full
   * playbook on demand.
   */
  description: z.string().min(1),
  agentKind: AgentKindSchema,
  toolBundles: z.array(ToolBundleSchema).default([]),
  nodeScopes: z.array(NodeScopeSchema).default([]),
  runPolicy: RunPolicySchema.default({}),
  cadenceHint: AgentCadenceHintSchema.optional(),
  defaultExecutorType: ExecutorTypeSchema.optional(),
  defaultStatus: TaskStatusSchema.optional(),
  /**
   * Reference-only guides are loadable by key but hidden from the routing manifest.
   */
  reference: z.boolean().optional(),
  instruction: z.string().min(1),
});

export type AgentDefinitionBuiltin = z.infer<typeof AgentDefinitionBuiltinSchema>;

type AgentMeta = Omit<AgentDefinitionBuiltin, "instruction"> & {
  instructionFile: string;
};

const AGENT_META: AgentMeta[] = [
  {
    agentKey: "main.ssota",
    title: "SSOTA Main Agent",
    description:
      "Default SSOTA conversational agent. Handles web chat, chatbots, project orchestration, heartbeat planning, and first-time setup.",
    agentKind: "main",
    toolBundles: [
      "graph.read",
      "graph.write",
      "tasks.manage",
      "pages.author",
      "connectors",
      "delegate",
    ],
    nodeScopes: [],
    runPolicy: {
      allowedTriggers: ["chat", "chatbot", "heartbeat", "schedule", "manual"],
    },
    cadenceHint: "on_demand",
    instructionFile: "main.ssota.md",
  },
  {
    agentKey: "specialist.implement_feature",
    title: "Implement feature",
    description:
      "Implement a single scoped feature or fix. Use when executing a concrete, well-specified coding task with clear acceptance criteria.",
    agentKind: "specialist",
    toolBundles: ["graph.read", "tasks.manage", "sandbox.code"],
    nodeScopes: [],
    runPolicy: { sandboxPolicy: "required", allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.implement_feature.md",
  },
  {
    agentKey: "specialist.review_changes",
    title: "Review changes",
    description:
      "Review code or graph changes against acceptance criteria. Use after implementation or before merge.",
    agentKind: "specialist",
    toolBundles: ["graph.read", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.review_changes.md",
  },
  {
    agentKey: "specialist.research",
    title: "Research",
    description:
      "Research a topic and produce structured findings. Use when information gathering is the primary deliverable.",
    agentKind: "specialist",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "connectors"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.research.md",
  },
  {
    agentKey: "specialist.write_document",
    title: "Write document",
    description:
      "Create or update a graph document node. Use when the deliverable is written content/documentation in the SSOTA graph.",
    agentKind: "specialist",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "pages.author"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.write_document.md",
  },
  {
    agentKey: "specialist.unblock_task",
    title: "Unblock stalled task",
    description:
      "Recover a stalled or blocked task. Use when a parent task is blocked and needs nudging, re-queuing, or escalation to a human.",
    agentKind: "specialist",
    toolBundles: ["graph.read", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule", "heartbeat", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "specialist.unblock_task.md",
  },
  {
    agentKey: "specialist.qa",
    title: "QA verification",
    description:
      "Run QA checks against acceptance criteria. Use for post-implementation verification work orders.",
    agentKind: "specialist",
    toolBundles: ["graph.read", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "manual"] },
    defaultExecutorType: "Agent",
    defaultStatus: "pending",
    instructionFile: "specialist.qa.md",
  },
  {
    agentKey: "worker.notion",
    title: "Notion worker",
    description:
      "Batch sync or transform Notion content. Use for connector-backed Notion operations.",
    agentKind: "worker",
    toolBundles: ["connectors", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.notion.md",
  },
  {
    agentKey: "worker.graph_batch",
    title: "Graph batch worker",
    description:
      "Batch graph read/write operations. Use for bulk node/edge updates with bounded concurrency.",
    agentKind: "worker",
    toolBundles: ["graph.read", "graph.write", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.graph_batch.md",
  },
  {
    agentKey: "worker.connector_sync",
    title: "Connector sync worker",
    description:
      "Sync data from external connectors into the graph. Use for scheduled or on-demand connector batch jobs.",
    agentKind: "worker",
    toolBundles: ["connectors", "graph.write", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.connector_sync.md",
  },
  {
    agentKey: "worker.report_builder",
    title: "Report builder worker",
    description:
      "Build structured reports from graph data. Use when output is a compact summary or export artifact.",
    agentKind: "worker",
    toolBundles: ["graph.read", "script_tools", "tasks.manage"],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["task", "schedule"] },
    defaultExecutorType: "Agent",
    defaultStatus: "ready",
    instructionFile: "worker.report_builder.md",
  },
  {
    agentKey: "guide.agent_authoring",
    title: "Guide: agent authoring",
    description:
      "Reference for writing good agent definitions (key naming, description, body). Load when authoring agents.",
    agentKind: "guide",
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    reference: true,
    instructionFile: "guide.agent_authoring.md",
  },
  {
    agentKey: "guide.page_authoring",
    title: "Guide: page authoring",
    description:
      "Reference for the json-render page format (spec, bindings, actions). Load when authoring pages.",
    agentKind: "guide",
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    reference: true,
    instructionFile: "guide.page_authoring.md",
  },
  {
    agentKey: "guide.script_tool_authoring",
    title: "Guide: script tool authoring",
    description:
      "Reference for authoring Script Tools (stored TypeScript workers). Load when defining reusable batch logic.",
    agentKind: "guide",
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    reference: true,
    instructionFile: "guide.script_tool_authoring.md",
  },
  {
    agentKey: "guide.task_delegation",
    title: "Guide: task delegation",
    description:
      "Reference for how the Main Agent creates and assigns tasks to specialists. Load when designing delegation patterns.",
    agentKind: "guide",
    toolBundles: [],
    nodeScopes: [],
    runPolicy: {},
    reference: true,
    instructionFile: "guide.task_delegation.md",
  },
];

function buildRegistry(
  meta: AgentMeta[],
): Record<string, AgentDefinitionBuiltin> {
  const registry: Record<string, AgentDefinitionBuiltin> = {};
  for (const entry of meta) {
    if (entry.agentKey in registry) {
      throw new Error(`Duplicate agent key: ${entry.agentKey}`);
    }
    const { instructionFile, ...rest } = entry;
    registry[entry.agentKey] = AgentDefinitionBuiltinSchema.parse({
      ...rest,
      instruction: loadAgentInstruction(instructionFile),
    });
  }
  return registry;
}

export const AGENT_DEFINITION_REGISTRY: Record<string, AgentDefinitionBuiltin> =
  buildRegistry(AGENT_META);

export const AGENT_DEFINITION_KEYS = Object.keys(
  AGENT_DEFINITION_REGISTRY,
) as AgentDefinitionKey[];

export type AgentDefinitionKey = (typeof AGENT_META)[number]["agentKey"];

export function listAgentDefinitionKeys(): AgentDefinitionKey[] {
  return [...AGENT_DEFINITION_KEYS];
}

export function getAgentDefinitionByKey(
  agentKey: string,
): AgentDefinitionBuiltin | null {
  return AGENT_DEFINITION_REGISTRY[agentKey] ?? null;
}

export function isKnownAgentKey(
  agentKey: string,
): agentKey is AgentDefinitionKey {
  return agentKey in AGENT_DEFINITION_REGISTRY;
}

export function listAgentsByKind(
  agentKind: z.infer<typeof AgentKindSchema>,
): AgentDefinitionBuiltin[] {
  return Object.values(AGENT_DEFINITION_REGISTRY).filter(
    (a) => a.agentKind === agentKind,
  );
}

/** Lightweight routing-manifest row (no DB id — built-ins have none). */
export interface AgentManifestEntry {
  key: string;
  name: string;
  description: string;
  agentKind: z.infer<typeof AgentKindSchema>;
}

/**
 * Specialist and worker agents as manifest rows for Main Agent routing.
 * Excludes main, guides, and reference-only entries.
 */
export function listRoutableAgentIndex(): AgentManifestEntry[] {
  return Object.values(AGENT_DEFINITION_REGISTRY)
    .filter(
      (a) =>
        !a.reference &&
        (a.agentKind === "specialist" || a.agentKind === "worker"),
    )
    .map((a) => ({
      key: a.agentKey,
      name: a.title,
      description: a.description,
      agentKind: a.agentKind,
    }));
}

/** Main agent manifest entry. */
export function getMainAgentDefinition(): AgentDefinitionBuiltin {
  const main = AGENT_DEFINITION_REGISTRY["main.ssota"];
  if (!main) {
    throw new Error("main.ssota agent definition is missing from registry");
  }
  return main;
}

import type { AgentDefinitionSeed } from "../agent-definition.js";

/**
 * DB seeds for project bootstrap — intentionally EMPTY. Built-in agents ship in
 * code via {@link AGENT_DEFINITION_REGISTRY}. Projects may override by writing
 * DB rows with the same key.
 */
export const AGENT_DEFINITION_SEEDS: AgentDefinitionSeed[] = [];
