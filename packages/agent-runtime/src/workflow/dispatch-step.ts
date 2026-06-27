/**
 * Node-side dispatcher for the WorkflowAgent main agent. This module is
 * imported by the apps/web `"use step"` (NOT by the `"use workflow"` function),
 * so it may freely use Node-dependent code. It re-hydrates the per-step tool
 * environment from the serializable `ssota` scope:
 *
 * - plain SSOTA tools (graph/tasks/pages) need only `{ ssota }`.
 * - connection facade tools (MCP/REST) additionally re-create the credential
 *   provider + a fresh `McpSessionManager` inside the step, because live
 *   provider/session objects cannot cross workflow step boundaries. The MCP
 *   protocol is stateless, so a per-step session is correct; it is always
 *   closed in a `finally`.
 */
import { createSsotaTools } from "../tools/index.js";
import { createConnectionTools } from "../tools/connections.js";
import { resolveCredentialProvider } from "../credentials/provider.js";
import { McpSessionManager } from "../connections/mcp-session.js";
import {
  ConnectionRunState,
  CONNECTION_SEARCH_TOOL,
  CONNECTION_CALL_TOOL,
  REQUEST_CONNECTION_TOOL,
} from "../connections/run-state.js";
import type { AgentRunContext } from "../engine/types.js";

/** Connection facade tool names handled by the credential/MCP-aware branch. */
export const MAIN_WORKFLOW_CONNECTION_TOOL_NAMES = [
  CONNECTION_SEARCH_TOOL,
  CONNECTION_CALL_TOOL,
  REQUEST_CONNECTION_TOOL,
] as const;

const CONNECTION_TOOLS = new Set<string>(MAIN_WORKFLOW_CONNECTION_TOOL_NAMES);

const toolCallId = (toolName: string) => `main-wf-${toolName}`;

/**
 * Execute a single named main-agent tool inside a durable step and return its
 * result. `ssota` is the serializable per-run scope; live credential/MCP
 * objects are re-hydrated here, never carried across the workflow boundary.
 */
export async function runMainAgentToolStep(
  toolName: string,
  input: unknown,
  ssota: AgentRunContext,
): Promise<unknown> {
  if (CONNECTION_TOOLS.has(toolName)) {
    const credentials = resolveCredentialProvider();
    if (!credentials) {
      throw new Error(
        `Connection tool ${toolName} requires a credential provider, but none is configured.`,
      );
    }
    const connectionState = new ConnectionRunState();
    const sessionManager = new McpSessionManager(credentials);
    try {
      const { tools } = await createConnectionTools({
        credentials,
        connectionState,
        sessionManager,
        projectId: ssota.projectId,
        accountId: ssota.accountId,
      });
      const t = tools[toolName];
      if (!t?.execute) {
        throw new Error(`Unknown connection tool: ${toolName}`);
      }
      return await t.execute(input as never, {
        toolCallId: toolCallId(toolName),
        messages: [],
        context: { ssota, credentials, connectionState },
      });
    } finally {
      await sessionManager.close();
    }
  }

  const tools = createSsotaTools();
  const t = tools[toolName];
  if (!t?.execute) {
    throw new Error(`Unknown or non-executable tool: ${toolName}`);
  }
  return t.execute(input as never, {
    toolCallId: toolCallId(toolName),
    messages: [],
    context: { ssota },
  });
}
