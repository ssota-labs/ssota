import {
  runMainAgentToolStep,
  fetchConnectorToolDefs,
  type AgentRunContext,
  type ConnectorToolDef,
} from "@ssota/agent-runtime";

/**
 * Durable `"use step"` that executes one real SSOTA tool. The Node-dependent
 * tool runtime is re-hydrated inside agent-runtime's `runMainAgentToolStep`
 * (graph/task/page tools, plus the active connector adapter's tools) — the WDK
 * strips these imports from the workflow bundle that references this step.
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

/**
 * Durable `"use step"` that resolves the active connector adapter's tool
 * definitions (Composio meta-tools or legacy Vercel Connect facade) for this
 * run. The serializable defs are declared on the WorkflowAgent so the model can
 * call them; dispatch routes back through {@link dispatchMainTool}.
 */
export async function fetchMainConnectorToolDefs(
  ssota: AgentRunContext,
): Promise<ConnectorToolDef[]> {
  "use step";
  return fetchConnectorToolDefs(ssota);
}
