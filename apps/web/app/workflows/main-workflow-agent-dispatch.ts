import { createSsotaTools, type AgentRunContext } from "@ssota/agent-runtime";

/**
 * Durable `"use step"` that executes one real SSOTA tool. It imports
 * Node-dependent agent-runtime code freely — the WDK strips these imports from
 * the workflow bundle that references this step. `context` carries the
 * serializable `{ ssota }` bag the v7 tools read via `getRunContext`.
 */
export async function dispatchMainTool(
  toolName: string,
  input: unknown,
  context: { ssota: AgentRunContext },
): Promise<unknown> {
  "use step";
  const tools = createSsotaTools();
  const t = tools[toolName];
  if (!t?.execute) {
    throw new Error(`dispatchMainTool: unknown or non-executable tool ${toolName}`);
  }
  return t.execute(input as never, {
    toolCallId: `main-wf-${toolName}`,
    messages: [],
    context,
  });
}
