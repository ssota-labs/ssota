/**
 * Workflow-safe surface for the main (chat) agent.
 *
 * This module is imported by the `"use workflow"` function in apps/web, so it
 * MUST stay workflow-safe: import only `ai`, `@ai-sdk/workflow`, `zod`, and
 * other Node-free modules. All Node-dependent tool work (DB/MCP/sandbox) runs
 * in the injected `dispatch` `"use step"` function.
 */
import type { ModelMessage, SystemModelMessage } from "ai";
import type { ZodTypeAny } from "zod";
import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import type { AgentRunContext } from "../engine/types.js";
import type { AgentRuntimeDefinition } from "../runtime-definition.js";
import { COMPOSIO_META_TOOL_DESCRIPTIONS } from "../composio/meta-tool-schemas.js";
import {
  workflowToolSchemas,
  sandboxToolSchemas,
  type WorkflowToolName,
  type SandboxToolName,
} from "./tool-schemas.js";
import {
  resolveSandboxToolNames,
  resolveWorkflowToolNames,
} from "./resolve-workflow-tools.js";

function stepCountAtLeast(n: number) {
  return ({ steps }: { steps: readonly unknown[] }) => steps.length >= n;
}

export type { ModelCallStreamPart };
export type { AgentRunContext };

export const MAIN_WORKFLOW_MODEL_ID = "anthropic/claude-sonnet-4.6";

const DEFAULT_MAX_STEPS = 200;

const MAIN_WORKFLOW_TOOL_DESCRIPTIONS: Partial<Record<WorkflowToolName, string>> = {
  list_node_types:
    "List the project's node type catalog (the kinds of records that exist). Check this before creating nodes or defining new types.",
  list_edge_types:
    "List the project's edge type catalog (the kinds of relationships).",
  search_catalog:
    "Search the project's type catalog (node + edge types) by keyword. Returns lightweight hits {kind,key,label,snippet,score}; fetch full detail with get_node_type / get_edge_type.",
  get_node_type:
    "Fetch one node type's full detail (label, description, keywords, property schema) by key.",
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
    "Create a follow-up task with a full delegation directive. Required: title, agentDefinitionId, executionDirective, acceptanceCriteria.",
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
    "Get a page component's full descriptor: props and a copy-paste example element.",
  create_page: "Create a page in the Notion-style page tree (pages table).",
  update_page:
    "Update a page by id (title/parentId/subjectNodeId/spec/bindings/actions).",
  read_page: "Read a page by id (returns its full record, or found:false).",
  list_pages:
    "List all pages in the tree (id, title, parentId, position) for navigation/authoring.",
  list_agent_definitions:
    "List agent definitions for this project (metadata only).",
  get_agent_instruction:
    "Fetch an agent definition playbook by id. Load on demand before acting.",
  write_agent_definition:
    "Create or update an agent definition (upsert by id). Write the playbook as markdown in body.",
  delegate:
    "Launch a specialized read-only subagent for focused exploration; returns only a summary.",
  list_workers: "List tool-kind workers available to this agent in this project.",
  describe_worker: "Describe a worker by key (schemas + kind config).",
  run_worker:
    "Execute a stored tool-kind worker in an isolated sandbox with a scoped SDK.",
  read_skill:
    "Load the full body of a bound skill by key when the task matches its description. Optional file path (default SKILL.md).",
  ...COMPOSIO_META_TOOL_DESCRIPTIONS,
};

export type MainWorkflowDispatch = (
  toolName: string,
  input: unknown,
  context: { ssota: AgentRunContext },
  /** AI SDK tool call id — run-transcript 기록의 idempotency 키. */
  toolCallId?: string,
) => Promise<unknown>;

export interface BuildMainWorkflowAgentInput {
  ssota: AgentRunContext;
  /** Tool bundles + agent kind from the active agent definition. */
  definition: AgentRuntimeDefinition;
  dispatch: MainWorkflowDispatch;
  instructions?: string | SystemModelMessage | SystemModelMessage[];
  modelId?: string;
  maxSteps?: number;
  includeSandboxTools?: boolean;
  sandboxAccess?: import("@ssota/contracts").SandboxAccessTier;
  /** Override Composio availability (defaults to env check at build time). */
  includeComposioTools?: boolean;
}

const SANDBOX_TOOL_DESCRIPTIONS: Record<SandboxToolName, string> = {
  sandbox_shell:
    "Run a shell command inside the sandbox VM. Use detached mode for long-running processes.",
  sandbox_await:
    "Wait for a detached sandbox_shell process and return its output.",
  sandbox_read: "Read a UTF-8 file from the sandbox.",
  sandbox_write: "Write a file in the sandbox (creates or overwrites).",
  sandbox_str_replace: "Replace a unique string inside a sandbox file.",
  sandbox_delete: "Delete a file in the sandbox.",
  sandbox_glob: "Find files in the sandbox matching a glob pattern.",
  sandbox_grep: "Search file contents in the sandbox with ripgrep or grep.",
  sandbox_read_lints:
    "Run a lightweight lint check on paths in the sandbox (best-effort).",
};

export function buildMainWorkflowAgent(
  input: BuildMainWorkflowAgentInput,
): WorkflowAgent {
  const ctx = { ssota: input.ssota };
  const toolNames = resolveWorkflowToolNames({
    toolBundles: input.definition.toolBundles,
    isMain: input.definition.isMain,
    includeComposioTools: input.includeComposioTools,
    enabledConnectorProviders: input.definition.enabledConnectorProviders,
  });

  const sandboxNames = resolveSandboxToolNames(
    input.includeSandboxTools,
    input.sandboxAccess ?? input.ssota.sandboxAccess ?? "code",
  );

  const tools: Record<
    string,
    {
      description: string;
      inputSchema: ZodTypeAny;
      execute: (
        i: unknown,
        options?: { toolCallId?: string },
      ) => Promise<unknown>;
    }
  > = {};

  for (const name of toolNames) {
    const schema = workflowToolSchemas[name];
    const description = MAIN_WORKFLOW_TOOL_DESCRIPTIONS[name];
    if (!schema || !description) continue;
    tools[name] = {
      description,
      inputSchema: schema,
      execute: (i: unknown, options?: { toolCallId?: string }) =>
        input.dispatch(name, i, ctx, options?.toolCallId),
    };
  }

  for (const name of sandboxNames) {
    tools[name] = {
      description: SANDBOX_TOOL_DESCRIPTIONS[name],
      inputSchema: sandboxToolSchemas[name],
      execute: (i: unknown, options?: { toolCallId?: string }) =>
        input.dispatch(name, i, ctx, options?.toolCallId),
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
