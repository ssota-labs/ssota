/**
 * Workflow-safe surface for the main (chat) agent.
 *
 * This module is imported by the `"use workflow"` function in apps/web, so it
 * MUST stay workflow-safe: import only `ai`, `@ai-sdk/workflow`, `zod`, and
 * other Node-free modules. All Node-dependent tool work (DB/MCP/sandbox) runs
 * in the injected `dispatch` `"use step"` function.
 *
 * The tool schemas below mirror the LLM-facing contract of the real SSOTA tools
 * (see tools/graph.ts). They are intentionally duplicated here because the real
 * tool modules import Node-only code and cannot cross the workflow boundary;
 * the injected dispatcher re-validates against the real schemas inside the step.
 */
import type { ModelMessage } from "ai";
import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { z } from "zod";
import type { AgentRunContext } from "../engine/types.js";

/**
 * Local step-count stop condition. We cannot import `isStepCount` from `ai`
 * here: this module is loaded inside `"use workflow"` functions and the full
 * `ai` package depends on Node modules (the WDK rejects it). `@ai-sdk/workflow`
 * (workflow-safe) does not re-export `isStepCount`, so we inline the predicate.
 */
function stepCountAtLeast(n: number) {
  return ({ steps }: { steps: readonly unknown[] }) => steps.length >= n;
}

export type { ModelCallStreamPart };
export type { AgentRunContext };

/** Default model id (AI Gateway "provider/model" string — workflow-safe). */
export const MAIN_WORKFLOW_MODEL_ID = "anthropic/claude-sonnet-4.6";

/** High safety ceiling on tool-loop iterations (mirrors the inline engine). */
const DEFAULT_MAX_STEPS = 200;

/**
 * Workflow-safe mirror of the SSOTA read-tool contract. KEEP IN SYNC with the
 * matching `tool({ inputSchema })` definitions in tools/graph.ts until the
 * schemas are extracted to a shared zod-only source.
 */
export const MAIN_WORKFLOW_TOOL_SCHEMAS = {
  list_node_types: {
    description:
      "List the project's node type catalog (the kinds of records that exist). Check this before creating nodes or defining new types.",
    inputSchema: z.object({}),
  },
  list_edge_types: {
    description:
      "List the project's edge type catalog (the kinds of relationships).",
    inputSchema: z.object({}),
  },
  search_catalog: {
    description:
      "Search the project's type catalog (node + edge types) by keyword. Returns lightweight hits {kind,key,label,snippet,score}; fetch full detail with get_node_type / get_edge_type. Prefer this over list_node_types when the catalog is large or you only need types matching an intent (e.g. 'billing', '회고', 'metric').",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe("Search text — matches key, label, keywords, description."),
      kind: z
        .enum(["node", "edge"])
        .optional()
        .describe("Restrict to node types or edge types. Omit to search both."),
      limit: z.number().int().positive().max(50).optional(),
    }),
  },
  get_node_type: {
    description:
      "Fetch one node type's full detail (label, description, keywords, property schema) by key. Use after search_catalog / list_node_types to read the property schema before creating nodes.",
    inputSchema: z.object({ key: z.string() }),
  },
  get_edge_type: {
    description:
      "Fetch one edge type's full detail (label, description, keywords) by key.",
    inputSchema: z.object({ key: z.string() }),
  },
  query_nodes: {
    description:
      "List nodes of a catalog type in the current project. Use to read planning context (objectives, prds, features, tasks, pages…).",
    inputSchema: z.object({
      catalogKey: z
        .string()
        .describe("Node catalog key, e.g. 'feature', 'prd', 'objective'."),
      limit: z.number().int().positive().max(100).optional(),
    }),
  },
  get_node: {
    description: "Fetch a single node by id, including its content body.",
    inputSchema: z.object({ nodeId: z.string().uuid() }),
  },
  traverse_edges: {
    description:
      "Traverse edges from a node to discover related nodes (e.g. a feature's PRD or stories).",
    inputSchema: z.object({
      nodeId: z.string().uuid(),
      direction: z.enum(["out", "in", "both"]).optional(),
      edgeType: z.string().optional(),
    }),
  },
  create_node: {
    description:
      "Create a new node of a catalog type. Properties are validated against the type's schema.",
    inputSchema: z.object({
      catalogKey: z.string(),
      title: z.string(),
      properties: z.record(z.unknown()).optional(),
      content: z.string().optional(),
    }),
  },
  update_node: {
    description: "Update a node's title, properties, or content body.",
    inputSchema: z.object({
      nodeId: z.string().uuid(),
      title: z.string().optional(),
      properties: z.record(z.unknown()).optional(),
      content: z.string().optional(),
    }),
  },
  create_edge: {
    description: "Connect two nodes with a typed edge.",
    inputSchema: z.object({
      catalogKey: z.string(),
      sourceNodeId: z.string().uuid(),
      targetNodeId: z.string().uuid(),
      properties: z.record(z.unknown()).optional(),
    }),
  },

  // --- Tasks ---
  get_task: {
    description: "Fetch a task by id (defaults to the current run's task).",
    inputSchema: z.object({ taskId: z.string().uuid().optional() }),
  },
  query_tasks: {
    description: "List tasks in the project, optionally filtered by status.",
    inputSchema: z.object({
      status: z
        .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
        .optional(),
      limit: z.number().int().positive().max(100).optional(),
    }),
  },
  spawn_task: {
    description:
      "Create a follow-up task with a full delegation directive. Required: title, workflowInstructionKey (or id), executionDirective (goal, background, steps), acceptanceCriteria.",
    inputSchema: z.object({
      title: z.string(),
      workflowInstructionId: z.string().uuid().optional(),
      workflowInstructionKey: z.string().optional(),
      targetNodeId: z.string().uuid().optional(),
      executionDirective: z.record(z.unknown()),
      acceptanceCriteria: z.array(z.unknown()).min(1),
      idempotencyKey: z.string().optional(),
      status: z
        .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
        .optional(),
    }),
  },
  update_task: {
    description: "Update fields on a task (defaults to current run's task).",
    inputSchema: z.object({
      taskId: z.string().uuid().optional(),
      title: z.string().optional(),
      status: z
        .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
        .optional(),
      context: z.record(z.unknown()).optional(),
      acceptanceCriteria: z.array(z.unknown()).optional(),
      result: z.record(z.unknown()).optional(),
    }),
  },
  complete_task: {
    description:
      "Mark the current run's task done. Call this once the task's goal and acceptance criteria are satisfied.",
    inputSchema: z.object({
      summary: z.string().describe("Short summary of what was accomplished."),
      result: z.record(z.unknown()).optional(),
    }),
  },
  block_task: {
    description:
      "Mark the current run's task blocked when a human decision or missing input prevents completion.",
    inputSchema: z.object({
      reason: z.string().describe("Why the task is blocked."),
    }),
  },
  request_approval: {
    description:
      "Pause for a human approval gate before a risky or irreversible action.",
    inputSchema: z.object({
      reason: z.string().describe("What needs approval and why."),
      summary: z.string().optional(),
    }),
  },

  // --- Pages ---
  list_page_components: {
    description:
      "List the page components available for building page specs (NodeTable, etc.).",
    inputSchema: z.object({}),
  },
  get_page_component: {
    description:
      "Get a page component's full descriptor: props (name, type, required) and a copy-paste example element. Use when authoring a page spec.",
    inputSchema: z.object({
      key: z.string().describe("Component key, e.g. 'NodeTable'."),
    }),
  },
  create_page: {
    description:
      "Create a page in the Notion-style page tree (pages table).",
    inputSchema: z.object({
      title: z.string().describe("Page title (shown in the sidebar tree)."),
      parentId: z.string().uuid().nullable().optional(),
      subjectNodeId: z.string().uuid().nullable().optional(),
      spec: z.record(z.unknown()).describe("JSON-render spec { root, elements }."),
      bindings: z.record(z.unknown()).optional(),
      actions: z.record(z.unknown()).optional(),
    }),
  },
  update_page: {
    description:
      "Update a page by id (title/parentId/subjectNodeId/spec/bindings/actions).",
    inputSchema: z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      parentId: z.string().uuid().nullable().optional(),
      subjectNodeId: z.string().uuid().nullable().optional(),
      spec: z.record(z.unknown()).optional(),
      bindings: z.record(z.unknown()).optional(),
      actions: z.record(z.unknown()).optional(),
    }),
  },
  read_page: {
    description: "Read a page by id (returns its full record, or found:false).",
    inputSchema: z.object({ id: z.string().uuid() }),
  },
  list_pages: {
    description:
      "List all pages in the tree (id, title, parentId, position) for navigation/authoring.",
    inputSchema: z.object({}),
  },
} as const;

/** Tool names exposed to the workflow agent. */
export const MAIN_WORKFLOW_TOOL_NAMES = Object.keys(
  MAIN_WORKFLOW_TOOL_SCHEMAS,
) as Array<keyof typeof MAIN_WORKFLOW_TOOL_SCHEMAS>;

/**
 * Runs a named SSOTA tool inside a durable `"use step"` and returns its result.
 * Injected by the caller (apps/web) so the Node-dependent tool implementations
 * stay out of the workflow bundle. `context` carries the serializable per-tool
 * bag (`{ ssota }`).
 */
export type MainWorkflowDispatch = (
  toolName: string,
  input: unknown,
  context: { ssota: AgentRunContext },
) => Promise<unknown>;

export interface BuildMainWorkflowAgentInput {
  /** Serializable per-run SSOTA scope (routed to every tool as its context). */
  ssota: AgentRunContext;
  /** `"use step"` dispatcher that executes the real Node-backed tool. */
  dispatch: MainWorkflowDispatch;
  instructions?: string;
  modelId?: string;
  maxSteps?: number;
}

/**
 * Build a {@link WorkflowAgent} for the main chat agent. The agent loop and each
 * tool execution become durable steps via the injected dispatcher. Call
 * `.stream({ messages, writable: getWritable<ModelCallStreamPart>() })` inside a
 * `"use workflow"` function.
 */
export function buildMainWorkflowAgent(
  input: BuildMainWorkflowAgentInput,
): WorkflowAgent {
  // The per-tool execute closes over the serializable `ctx`, so the injected
  // `"use step"` dispatcher receives the SSOTA scope without needing a
  // (schema-gated) `toolsContext` channel.
  const ctx = { ssota: input.ssota };
  const tools: Record<
    string,
    { description: string; inputSchema: z.ZodTypeAny; execute: (i: unknown) => Promise<unknown> }
  > = {};

  for (const name of MAIN_WORKFLOW_TOOL_NAMES) {
    const def = MAIN_WORKFLOW_TOOL_SCHEMAS[name];
    tools[name] = {
      description: def.description,
      inputSchema: def.inputSchema,
      execute: (i: unknown) => input.dispatch(name, i, ctx),
    };
  }

  return new WorkflowAgent({
    model: input.modelId ?? MAIN_WORKFLOW_MODEL_ID,
    instructions: input.instructions ?? "You are SSOTA, a helpful agent.",
    tools,
    stopWhen: stepCountAtLeast(input.maxSteps ?? DEFAULT_MAX_STEPS),
  });
}

export type { ModelMessage };
