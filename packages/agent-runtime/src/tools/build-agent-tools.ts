import type { ToolSet } from "ai";
import type { ToolBundle } from "@ssota/contracts";
import { mergeAgentToolBundles } from "@ssota/contracts";
import { getAgentDefinitionById } from "@ssota/contracts/agents";
import { createGraphTools } from "./graph.js";
import { createTaskTools } from "./tasks.js";
import { createPageTools } from "./pages.js";
import { createAgentDefinitionTools } from "./agent-definitions.js";
import { createDelegateTools } from "./delegate.js";
import { createSandboxTools } from "./sandbox.js";
import { createWorkerTools } from "./worker-tools.js";
import { createSkillTools } from "./skills.js";

const GRAPH_READ = new Set([
  "list_node_types",
  "list_edge_types",
  "search_catalog",
  "get_node_type",
  "get_edge_type",
  "query_nodes",
  "get_node",
  "traverse_edges",
]);

const GRAPH_WRITE = new Set([
  "create_node_type",
  "create_edge_type",
  "create_node",
  "update_node",
  "create_edge",
]);

const AGENT_DEF_TOOLS = new Set([
  "list_agent_definitions",
  "get_agent_instruction",
  "write_agent_definition",
]);

function pickTools(source: ToolSet, names: Set<string>): ToolSet {
  const out: ToolSet = {};
  for (const name of names) {
    if (source[name]) out[name] = source[name];
  }
  return out;
}

function mergeTools(...sets: ToolSet[]): ToolSet {
  return Object.assign({}, ...sets);
}

/**
 * Build a scoped tool set from an agent definition's `toolBundles`. Connector
 * tools are resolved separately by the active adapter at run time.
 */
export function buildAgentTools(definition: {
  toolBundles: ToolBundle[];
  isMain: boolean;
}): ToolSet {
  const bundles = new Set(mergeAgentToolBundles(definition.toolBundles));
  const graph = createGraphTools();
  const tasks = createTaskTools();
  const pages = createPageTools();
  const agents = createAgentDefinitionTools();
  const delegate = createDelegateTools();
  const sandbox = createSandboxTools();
  const workerTools = createWorkerTools();
  const skills = createSkillTools();

  let tools: ToolSet = {};

  if (bundles.has("graph.read")) {
    tools = mergeTools(tools, pickTools(graph, GRAPH_READ));
  }
  if (bundles.has("graph.write")) {
    tools = mergeTools(tools, pickTools(graph, GRAPH_WRITE));
    if (!bundles.has("graph.read")) {
      tools = mergeTools(tools, pickTools(graph, GRAPH_READ));
    }
  }
  if (bundles.has("tasks.manage")) {
    tools = mergeTools(tools, tasks);
  }
  if (bundles.has("pages.author")) {
    tools = mergeTools(tools, pages);
  }
  if (bundles.has("delegate")) {
    tools = mergeTools(tools, delegate);
  }
  if (bundles.has("sandbox.code")) {
    tools = mergeTools(tools, sandbox);
  }
  if (bundles.has("workers")) {
    tools = mergeTools(tools, workerTools);
  }
  if (bundles.has("skills.read")) {
    tools = mergeTools(tools, skills);
  }

  // Agent-authoring tools are a privilege (see resolve-workflow-tools) — gate to
  // the main agent, not the now-universal graph.write baseline.
  if (definition.isMain) {
    tools = mergeTools(tools, pickTools(agents, AGENT_DEF_TOOLS));
  }

  return tools;
}

/** Resolve tool bundles from a task's agent definition id (builtin or DB-backed). */
export function toolBundlesForAgentDefinitionId(
  agentDefinitionId: string | null | undefined,
): ToolBundle[] {
  if (!agentDefinitionId) return [];
  const builtin = getAgentDefinitionById(agentDefinitionId);
  return builtin?.toolBundles ?? [];
}
