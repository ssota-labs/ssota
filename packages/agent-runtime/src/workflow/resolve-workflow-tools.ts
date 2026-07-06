import type { ToolBundle, SandboxAccessTier } from "@ssota/contracts";
import { SANDBOX_TOOLS_BY_ACCESS_TIER } from "@ssota/contracts";
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

const WORKER_TOOLS: WorkflowToolName[] = [
  "list_workers",
  "describe_worker",
  "run_worker",
];

const SKILL_TOOLS: WorkflowToolName[] = ["read_skill"];

export interface ResolveWorkflowToolsInput {
  toolBundles: ToolBundle[];
  isMain?: boolean;
  includeSandboxTools?: boolean;
  sandboxAccess?: SandboxAccessTier;
  /** When false, omit Composio meta-tools even if connectors bundle is present. */
  includeComposioTools?: boolean;
  /** Composio toolkit slugs enabled for this agent; composio tools only when non-empty. */
  enabledConnectorProviders?: string[];
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
  if (bundles.has("workers")) {
    for (const n of WORKER_TOOLS) names.add(n);
  }
  if (bundles.has("skills.read")) {
    for (const n of SKILL_TOOLS) names.add(n);
  }
  if (input.isMain || bundles.has("graph.write")) {
    for (const n of AGENT_DEF_TOOLS) names.add(n);
  }

  const composioOn =
    (input.includeComposioTools ?? Boolean(process.env.COMPOSIO_API_KEY?.trim())) &&
    bundles.has("connectors") &&
    (input.enabledConnectorProviders?.length ?? 0) > 0;
  if (composioOn) {
    for (const n of COMPOSIO_META_TOOL_NAMES) {
      names.add(n as WorkflowToolName);
    }
  }

  return [...names].filter((n) => n in workflowToolSchemas);
}

export function resolveSandboxToolNames(
  includeSandboxTools: boolean | undefined,
  sandboxAccess: SandboxAccessTier = "code",
): SandboxToolName[] {
  if (!includeSandboxTools || sandboxAccess === "none") return [];
  const allowed = SANDBOX_TOOLS_BY_ACCESS_TIER[sandboxAccess];
  return allowed.filter((name) => name in sandboxToolSchemas) as SandboxToolName[];
}
