import { runMainAgentToolStep, type AgentRunContext } from "@ssota/agent-runtime";

/**
 * Durable `"use step"` that executes one real SSOTA tool. The Node-dependent
 * tool runtime is re-hydrated inside agent-runtime's `runMainAgentToolStep`
 * (graph/task/page tools, plus credential/MCP-aware connection tools) — the
 * WDK strips these imports from the workflow bundle that references this step.
 * `context.ssota` is the serializable per-run scope.
 */
export async function dispatchMainTool(
  toolName: string,
  input: unknown,
  context: { ssota: AgentRunContext },
): Promise<unknown> {
  "use step";
  return runMainAgentToolStep(toolName, input, context.ssota);
}
