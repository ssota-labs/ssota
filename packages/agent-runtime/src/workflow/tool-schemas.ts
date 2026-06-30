/**
 * Single source of truth for the LLM-facing input schemas of the main-agent
 * tools. zod-only (workflow-safe): imported both by the workflow-safe agent
 * surface (buildMainWorkflowAgent) AND by the real Node-backed tool factories
 * (tools/graph.ts, tools/tasks.ts, tools/pages.ts, tools/connections.ts) so the
 * schema is defined exactly once.
 */
import { z } from "zod";
import {
  ExecutionDirectiveSchema,
  RunScriptToolInputSchema,
  SandboxAwaitInputSchema,
  SandboxDeleteInputSchema,
  SandboxGlobInputSchema,
  SandboxGrepInputSchema,
  SandboxReadInputSchema,
  SandboxReadLintsInputSchema,
  SandboxShellInputSchema,
  SandboxStrReplaceInputSchema,
  SandboxWriteInputSchema,
  SANDBOX_PRIMITIVE_TOOL_NAMES,
} from "@ssota/contracts";
import { SUBAGENT_TYPES } from "../subagents/constants.js";
import { composioMetaToolSchemas } from "../composio/meta-tool-schemas.js";

const taskStatus = z.enum([
  "pending",
  "ready",
  "running",
  "blocked",
  "done",
  "cancelled",
  "failed",
]);

export const workflowToolSchemas = {
  // --- Graph: catalog ---
  list_node_types: z.object({}),
  list_edge_types: z.object({}),
  search_catalog: z.object({
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
  get_node_type: z.object({ key: z.string() }),
  get_edge_type: z.object({ key: z.string() }),

  // --- Graph: nodes / edges ---
  query_nodes: z.object({
    catalogKey: z
      .string()
      .describe("Node catalog key, e.g. 'feature', 'prd', 'objective'."),
    limit: z.number().int().positive().max(100).optional(),
  }),
  get_node: z.object({ nodeId: z.string().uuid() }),
  traverse_edges: z.object({
    nodeId: z.string().uuid(),
    direction: z.enum(["out", "in", "both"]).optional(),
    edgeType: z.string().optional(),
  }),
  create_node: z.object({
    catalogKey: z.string(),
    title: z.string(),
    properties: z.record(z.unknown()).optional(),
    content: z.string().optional(),
  }),
  update_node: z.object({
    nodeId: z.string().uuid(),
    title: z.string().optional(),
    properties: z.record(z.unknown()).optional(),
    content: z.string().optional(),
  }),
  create_edge: z.object({
    catalogKey: z.string(),
    sourceNodeId: z.string().uuid(),
    targetNodeId: z.string().uuid(),
    properties: z.record(z.unknown()).optional(),
  }),

  // --- Tasks ---
  get_task: z.object({ taskId: z.string().uuid().optional() }),
  query_tasks: z.object({
    status: taskStatus.optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
  spawn_task: z.object({
    title: z.string(),
    agentDefinitionId: z.string().uuid(),
    targetNodeId: z.string().uuid().optional(),
    executionDirective: ExecutionDirectiveSchema,
    acceptanceCriteria: z.array(z.unknown()).min(1),
    idempotencyKey: z.string().optional(),
    status: taskStatus.optional(),
  }),
  update_task: z.object({
    taskId: z.string().uuid().optional(),
    title: z.string().optional(),
    status: taskStatus.optional(),
    context: z.record(z.unknown()).optional(),
    acceptanceCriteria: z.array(z.unknown()).optional(),
    result: z.record(z.unknown()).optional(),
  }),
  complete_task: z.object({
    summary: z.string().describe("Short summary of what was accomplished."),
    result: z.record(z.unknown()).optional(),
  }),
  block_task: z.object({
    reason: z.string().describe("Why the task is blocked."),
  }),
  request_approval: z.object({
    reason: z.string().describe("What needs approval and why."),
    summary: z.string().optional(),
  }),

  // --- Pages ---
  list_page_components: z.object({}),
  get_page_component: z.object({
    key: z.string().describe("Component key, e.g. 'NodeTable'."),
  }),
  create_page: z.object({
    title: z.string().describe("Page title (shown in the sidebar tree)."),
    parentId: z.string().uuid().nullable().optional(),
    subjectNodeId: z.string().uuid().nullable().optional(),
    spec: z.record(z.unknown()).describe("JSON-render spec { root, elements }."),
    bindings: z.record(z.unknown()).optional(),
    actions: z.record(z.unknown()).optional(),
  }),
  update_page: z.object({
    id: z.string().uuid(),
    title: z.string().optional(),
    parentId: z.string().uuid().nullable().optional(),
    subjectNodeId: z.string().uuid().nullable().optional(),
    spec: z.record(z.unknown()).optional(),
    bindings: z.record(z.unknown()).optional(),
    actions: z.record(z.unknown()).optional(),
  }),
  read_page: z.object({ id: z.string().uuid() }),
  list_pages: z.object({}),

  // --- Agent definitions ---
  list_agent_definitions: z.object({}),
  get_agent_instruction: z.object({
    id: z.string().uuid(),
  }),
  write_agent_definition: z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    description: z.string(),
    body: z.string(),
    isMain: z.boolean().optional(),
    referenceOnly: z.boolean().optional(),
  }),

  // --- Delegate (subagents) ---
  delegate: z.object({
    subagentType: z.enum(SUBAGENT_TYPES),
    task: z.string(),
    instructions: z.string(),
  }),

  // --- Script tools ---
  list_script_tools: z.object({}),
  describe_script_tool: z.object({ key: z.string().min(1) }),
  run_script_tool: RunScriptToolInputSchema,

  // --- Composio Tool Router meta-tools (fixed; not per-toolkit defs) ---
  ...composioMetaToolSchemas,
} as const;

export type WorkflowToolName = keyof typeof workflowToolSchemas;

/**
 * Sandbox primitive tool schemas — SSOT in @ssota/contracts, re-exported here
 * for workflow agent surface. Exposed only for dev-capable task runs.
 */
export const sandboxToolSchemas = {
  sandbox_shell: SandboxShellInputSchema,
  sandbox_await: SandboxAwaitInputSchema,
  sandbox_read: SandboxReadInputSchema,
  sandbox_write: SandboxWriteInputSchema,
  sandbox_str_replace: SandboxStrReplaceInputSchema,
  sandbox_delete: SandboxDeleteInputSchema,
  sandbox_glob: SandboxGlobInputSchema,
  sandbox_grep: SandboxGrepInputSchema,
  sandbox_read_lints: SandboxReadLintsInputSchema,
} as const satisfies Record<
  (typeof SANDBOX_PRIMITIVE_TOOL_NAMES)[number],
  z.ZodTypeAny
>;

export type SandboxToolName = keyof typeof sandboxToolSchemas;
