import type { AgentKind, ToolBundle } from "@ssota/contracts";
import { isComposioEnabled } from "../composio/client.js";
import { COMPOSIO_META_TOOL_NAMES } from "../composio/meta-tool-schemas.js";
import {
  workflowToolSchemas,
  sandboxToolSchemas,
  type WorkflowToolName,
  type SandboxToolName,
} from "./tool-schemas.js";

const GRAPH_READ: WorkflowToolName[] = [
  "list_node_types",
  "list_edge_types",
  "search_catalog",
  "get_node_type",
  "get_edge_type",
  "query_nodes",
  "get_node",
  "traverse_edges",
];

const GRAPH_WRITE: WorkflowToolName[] = [
  "create_node",
  "update_node",
  "create_edge",
];

const TASK_TOOLS: WorkflowToolName[] = [
  "get_task",
  "query_tasks",
  "spawn_task",
  "update_task",
  "complete_task",
  "block_task",
  "request_approval",
];

const PAGE_TOOLS: WorkflowToolName[] = [
  "list_page_components",
  "get_page_component",
  "create_page",
  "update_page",
  "read_page",
  "list_pages",
];

const AGENT_DEF_TOOLS: WorkflowToolName[] = [
  "list_agent_definitions",
  "get_agent_instruction",
  "write_agent_definition",
];

const DELEGATE_TOOLS: WorkflowToolName[] = ["delegate"];

const SCRIPT_TOOLS: WorkflowToolName[] = [
  "list_script_tools",
  "describe_script_tool",
  "run_script_tool",
];

export interface ResolveWorkflowToolsInput {
  toolBundles: ToolBundle[];
  agentKind: AgentKind;
  includeSandboxTools?: boolean;
  /** When false, omit Composio meta-tools even if connectors bundle is present. */
  includeComposioTools?: boolean;
}

export function resolveWorkflowToolNames(
  input: ResolveWorkflowToolsInput,
): WorkflowToolName[] {
  const bundles = new Set(input.toolBundles);
  const names = new Set<WorkflowToolName>();

  if (bundles.has("graph.read")) {
    for (const n of GRAPH_READ) names.add(n);
  }
  if (bundles.has("graph.write")) {
    for (const n of GRAPH_WRITE) names.add(n);
    if (!bundles.has("graph.read")) {
      for (const n of GRAPH_READ) names.add(n);
    }
  }
  if (bundles.has("tasks.manage")) {
    for (const n of TASK_TOOLS) names.add(n);
  }
  if (bundles.has("pages.author")) {
    for (const n of PAGE_TOOLS) names.add(n);
  }
  if (bundles.has("delegate")) {
    for (const n of DELEGATE_TOOLS) names.add(n);
  }
  if (bundles.has("script_tools")) {
    for (const n of SCRIPT_TOOLS) names.add(n);
  }
  if (input.agentKind === "main" || bundles.has("graph.write")) {
    for (const n of AGENT_DEF_TOOLS) names.add(n);
  }

  const composioOn =
    (input.includeComposioTools ?? isComposioEnabled()) && bundles.has("connectors");
  if (composioOn) {
    for (const n of COMPOSIO_META_TOOL_NAMES) {
      names.add(n as WorkflowToolName);
    }
  }

  return [...names].filter((n) => n in workflowToolSchemas);
}

export function resolveSandboxToolNames(
  includeSandboxTools: boolean | undefined,
): SandboxToolName[] {
  if (!includeSandboxTools) return [];
  return Object.keys(sandboxToolSchemas) as SandboxToolName[];
}
