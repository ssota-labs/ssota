import { ToolLoopAgent, isStepCount, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";
import type { AgentRunContext } from "../engine/types.js";
import { gateway } from "../models.js";
import { buildToolsContext } from "../tools/context.js";
import { createGraphTools } from "../tools/graph.js";
import { createPageTools } from "../tools/pages.js";
import { createTaskTools } from "../tools/tasks.js";
import { createAgentDefinitionTools } from "../tools/agent-definitions.js";
import {
  SUBAGENT_MODEL_ID,
  SUBAGENT_NO_QUESTIONS_RULES,
  SUBAGENT_RESPONSE_FORMAT,
  SUBAGENT_STEP_LIMIT,
} from "./constants.js";

function pickTools(set: ToolSet, keys: string[]): ToolSet {
  const out: ToolSet = {};
  for (const key of keys) if (set[key]) out[key] = set[key]!;
  return out;
}

/** Read-only view of the workspace: graph + catalog + pages + workflows + tasks. */
export function readOnlyWorkspaceTools(): ToolSet {
  const all: ToolSet = {
    ...createGraphTools(),
    ...createPageTools(),
    ...createAgentDefinitionTools(),
    ...createTaskTools(),
  };
  return pickTools(all, [
    // graph + catalog reads
    "query_nodes",
    "get_node",
    "traverse_edges",
    "list_node_types",
    "list_edge_types",
    // page reads
    "list_pages",
    "read_page",
    "list_page_components",
    "get_page_component",
    // agent definition reads
    "list_agent_definitions",
    "get_agent_instruction",
    // task reads
    "query_tasks",
    "get_task",
  ]);
}

const EXPLORER_SYSTEM_PROMPT = `You are an explorer subagent — a fast, READ-ONLY agent that investigates a SSOTA project's workspace and reports back.

The workspace is a typed graph: node types and edge types (the catalog), node/edge instances, pages (json-render UIs), workflows, and tasks. Investigate it to answer the parent agent's question.

## CRITICAL RULES

### READ-ONLY
You may ONLY read. You have no write tools. Never claim to have changed anything.

${SUBAGENT_NO_QUESTIONS_RULES}

${SUBAGENT_RESPONSE_FORMAT}

## How to explore
- Start broad: list_node_types / list_edge_types to learn the catalog, list_pages and list_agent_definitions to see what exists.
- Then drill in: query_nodes / get_node / traverse_edges for instances, read_page / get_agent_instruction for details, query_tasks / get_task for work in flight.
- Be efficient — gather what answers the task, then stop. Reference things by key/id so the parent can act.`;

const callOptionsSchema = z.object({
  task: z.string().describe("Short description of the exploration task"),
  instructions: z.string().describe("Detailed instructions for the exploration"),
  context: z.custom<AgentRunContext>().describe("Per-run SSOTA scope"),
  model: z.custom<LanguageModel>().optional().describe("Model override"),
});

export type ExplorerCallOptions = z.infer<typeof callOptionsSchema>;

export const explorerSubagent = new ToolLoopAgent({
  model: gateway(SUBAGENT_MODEL_ID),
  instructions: EXPLORER_SYSTEM_PROMPT,
  tools: readOnlyWorkspaceTools(),
  stopWhen: isStepCount(SUBAGENT_STEP_LIMIT),
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => {
    if (!options) {
      throw new Error("Explorer subagent requires task call options.");
    }
    return {
      ...settings,
      model: options.model ?? settings.model,
      instructions: `${EXPLORER_SYSTEM_PROMPT}

## Your Task
${options.task}

## Detailed Instructions
${options.instructions}

## REMINDER
- You CANNOT ask questions — no one will respond.
- This is READ-ONLY.
- Your final message MUST include both a **Summary** and an **Answer**.`,
      toolsContext: buildToolsContext(settings.tools, { ssota: options.context }),
    };
  },
});
