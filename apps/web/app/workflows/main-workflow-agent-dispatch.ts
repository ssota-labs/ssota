import {
  runMainAgentToolStep,
  type AgentRunContext,
} from "@ssota/agent-runtime";

/**
 * Durable `"use step"` that executes one real SSOTA / Composio / sandbox tool.
 */
export async function dispatchMainTool(
  toolName: string,
  input: unknown,
  context: { ssota: AgentRunContext },
): Promise<unknown> {
  "use step";
  return runMainAgentToolStep(toolName, input, context.ssota);
}
