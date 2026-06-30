/**
 * Workflow-safe surface for the main (chat) agent.
 *
 * This module is imported by the `"use workflow"` function in apps/web, so it
 * MUST stay workflow-safe: import only `ai`, `@ai-sdk/workflow`, `zod`, and
 * other Node-free modules. All Node-dependent tool work (DB/MCP/sandbox) runs
 * in the injected `dispatch` `"use step"` function.
 *
 * The tool input schemas come from the single zod-only source
 * {@link workflowToolSchemas} (tool-schemas.ts); a drift-guard test asserts
 * they stay in sync with the real Node-backed tools, whose schemas can't cross
 * the workflow boundary. The injected dispatcher re-validates inside the step.
 */
import type { ModelMessage, SystemModelMessage } from "ai";
import type { ZodTypeAny } from "zod";
// `jsonSchema` is the same workflow-safe helper @ai-sdk/workflow uses internally
// to serialize tool schemas; it lets us declare connector tools whose schemas
// are only known at run time (JSON, not zod) — see ConnectorToolDef.
import { jsonSchema, type Schema } from "@ai-sdk/provider-utils";
import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import type { AgentRunContext } from "../engine/types.js";
import type { ConnectorToolDef } from "./dispatch-step.js";
import {
  workflowToolSchemas,
  sandboxToolSchemas,
  type WorkflowToolName,
  type SandboxToolName,
} from "./tool-schemas.js";

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
 * LLM-facing descriptions for the workflow-agent tools. The *validation
 * schemas* are the single source in {@link workflowToolSchemas}; descriptions
 * are presentation and may read differently from the real tool's own docs.
 */
const MAIN_WORKFLOW_TOOL_DESCRIPTIONS: Record<WorkflowToolName, string> = {
  list_node_types:
    "List the project's node type catalog (the kinds of records that exist). Check this before creating nodes or defining new types.",
  list_edge_types:
    "List the project's edge type catalog (the kinds of relationships).",
  search_catalog:
    "Search the project's type catalog (node + edge types) by keyword. Returns lightweight hits {kind,key,label,snippet,score}; fetch full detail with get_node_type / get_edge_type. Prefer this over list_node_types when the catalog is large or you only need types matching an intent (e.g. 'billing', '회고', 'metric').",
  get_node_type:
    "Fetch one node type's full detail (label, description, keywords, property schema) by key. Use after search_catalog / list_node_types to read the property schema before creating nodes.",
  get_edge_type:
    "Fetch one edge type's full detail (label, description, keywords) by key.",
  query_nodes:
    "List nodes of a catalog type in the current project. Use to read planning context (objectives, prds, features, tasks, pages…).",
  get_node: "Fetch a single node by id, including its content body.",
  traverse_edges:
    "Traverse edges from a node to discover related nodes (e.g. a feature's PRD or stories).",
  create_node:
    "Create a new node of a catalog type. Properties are validated against the type's schema.",
  update_node: "Update a node's title, properties, or content body.",
  create_edge: "Connect two nodes with a typed edge.",
  get_task: "Fetch a task by id (defaults to the current run's task).",
  query_tasks: "List tasks in the project, optionally filtered by status.",
  spawn_task:
    "Create a follow-up task with a full delegation directive. Required: title, agentKey (or agentDefinitionId), executionDirective (goal, background, steps), acceptanceCriteria.",
  update_task: "Update fields on a task (defaults to current run's task).",
  complete_task:
    "Mark the current run's task done. Call this once the task's goal and acceptance criteria are satisfied.",
  block_task:
    "Mark the current run's task blocked when a human decision or missing input prevents completion.",
  request_approval:
    "Pause for a human approval gate before a risky or irreversible action.",
  list_page_components:
    "List the page components available for building page specs (NodeTable, etc.).",
  get_page_component:
    "Get a page component's full descriptor: props (name, type, required) and a copy-paste example element. Use when authoring a page spec.",
  create_page: "Create a page in the Notion-style page tree (pages table).",
  update_page:
    "Update a page by id (title/parentId/subjectNodeId/spec/bindings/actions).",
  read_page: "Read a page by id (returns its full record, or found:false).",
  list_pages:
    "List all pages in the tree (id, title, parentId, position) for navigation/authoring.",
};

/** Tool names exposed to the workflow agent. */
export const MAIN_WORKFLOW_TOOL_NAMES = Object.keys(
  workflowToolSchemas,
) as WorkflowToolName[];

/** Workflow-agent tool defs: shared input schema + LLM-facing description. */
export const MAIN_WORKFLOW_TOOL_SCHEMAS = Object.fromEntries(
  MAIN_WORKFLOW_TOOL_NAMES.map((name) => [
    name,
    {
      description: MAIN_WORKFLOW_TOOL_DESCRIPTIONS[name],
      inputSchema: workflowToolSchemas[name],
    },
  ]),
) as {
  [K in WorkflowToolName]: {
    description: string;
    inputSchema: (typeof workflowToolSchemas)[K];
  };
};

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
  /**
   * Run instructions. Pass the `SystemModelMessage[]` from `buildRunPrompt`
   * (carries Anthropic cache breakpoints) or a plain string.
   */
  instructions?: string | SystemModelMessage | SystemModelMessage[];
  modelId?: string;
  maxSteps?: number;
  /**
   * Expose the sandbox tools (dev-capable task runs). Requires `ssota.sandboxId`
   * — the dispatcher re-attaches to it per step.
   */
  includeSandboxTools?: boolean;
  /**
   * Connector tools (Composio meta-tools or legacy Vercel Connect facade) for
   * the active adapter, fetched via `fetchConnectorToolDefs` in a `"use step"`.
   * Declared dynamically because their names/schemas are only known at run time.
   * Dispatched through the same injected `dispatch` (connector branch).
   */
  connectorToolDefs?: ConnectorToolDef[];
}

/** LLM-facing descriptions for the sandbox tools (schemas in tool-schemas.ts). */
const SANDBOX_TOOL_DESCRIPTIONS: Record<SandboxToolName, string> = {
  sandbox_exec:
    "Run a shell command inside the sandbox VM and return exit code, stdout, stderr.",
  sandbox_write_file: "Write a file in the sandbox (creates or overwrites).",
  sandbox_read_file: "Read a UTF-8 file from the sandbox.",
};

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
    {
      description: string;
      inputSchema: ZodTypeAny | Schema;
      execute: (i: unknown) => Promise<unknown>;
    }
  > = {};

  for (const name of MAIN_WORKFLOW_TOOL_NAMES) {
    const def = MAIN_WORKFLOW_TOOL_SCHEMAS[name];
    tools[name] = {
      description: def.description,
      inputSchema: def.inputSchema,
      execute: (i: unknown) => input.dispatch(name, i, ctx),
    };
  }

  if (input.includeSandboxTools) {
    for (const name of Object.keys(sandboxToolSchemas) as SandboxToolName[]) {
      tools[name] = {
        description: SANDBOX_TOOL_DESCRIPTIONS[name],
        inputSchema: sandboxToolSchemas[name],
        execute: (i: unknown) => input.dispatch(name, i, ctx),
      };
    }
  }

  // Connector tools (Composio / legacy) — names + JSON schemas resolved at run
  // time by fetchConnectorToolDefs. Their static names (graph/task/page/sandbox)
  // can't collide because the adapter namespaces them (e.g. COMPOSIO_*).
  for (const def of input.connectorToolDefs ?? []) {
    tools[def.name] = {
      description: def.description,
      inputSchema: jsonSchema(def.jsonSchema as Parameters<typeof jsonSchema>[0]),
      execute: (i: unknown) => input.dispatch(def.name, i, ctx),
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
