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
