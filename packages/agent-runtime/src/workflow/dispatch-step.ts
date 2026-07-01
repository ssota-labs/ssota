/**
 * Node-side dispatcher for the WorkflowAgent main agent. Imported by the
 * apps/web `"use step"` (NOT the `"use workflow"` function), so it may freely
 * use Node-dependent code. It re-hydrates the per-step tool environment from the
 * serializable `ssota` scope:
 *
 * - SSOTA tools (graph/tasks/pages/delegate/script/agent-def) via createSsotaTools
 * - Composio meta-tools via executeComposioMetaTool (fixed names, session per step)
 * - sandbox tools re-attach to the run's sandbox session by id
 */
import {
  SANDBOX_PRIMITIVE_TOOL_NAMES,
  SANDBOX_TOOLS_BY_ACCESS_TIER,
  type SandboxPrimitiveToolName,
} from "@ssota/contracts";
import { createSsotaTools } from "../tools/index.js";
import { createSandboxTools } from "../tools/sandbox.js";
import { getSandboxSessionPort } from "../ports.js";
import {
  executeComposioMetaTool,
  getConnectorAdapter,
} from "../connectors/adapter.js";
import { isComposioMetaToolName } from "../composio/meta-tool-schemas.js";
import type { AgentRunContext } from "../engine/types.js";
import {
  assertCatalogKeyInScope,
  assertNodeIdInScope,
  resolveNodeScopes,
} from "../node-scopes.js";

/** Sandbox tool names handled by the re-attach branch (dev-capable tasks). */
export const MAIN_WORKFLOW_SANDBOX_TOOL_NAMES = SANDBOX_PRIMITIVE_TOOL_NAMES;

const SANDBOX_TOOLS = new Set<string>(SANDBOX_PRIMITIVE_TOOL_NAMES);

const toolCallId = (toolName: string) => `main-wf-${toolName}`;

function assertGraphToolNodeScope(
  toolName: string,
  input: unknown,
  ssota: AgentRunContext,
): void {
  const scope = resolveNodeScopes(ssota.nodeScopes);
  if (!scope) return;

  const data = (input ?? {}) as Record<string, unknown>;

  switch (toolName) {
    case "query_nodes":
    case "create_node":
      if (typeof data.catalogKey === "string") {
        assertCatalogKeyInScope(scope, data.catalogKey, toolName);
      }
      break;
    case "get_node":
    case "update_node":
    case "traverse_edges":
      if (typeof data.nodeId === "string") {
        assertNodeIdInScope(scope, data.nodeId, toolName);
      }
      break;
    case "create_edge":
      if (typeof data.sourceNodeId === "string") {
        assertNodeIdInScope(scope, data.sourceNodeId, `${toolName} source`);
      }
      if (typeof data.targetNodeId === "string") {
        assertNodeIdInScope(scope, data.targetNodeId, `${toolName} target`);
      }
      break;
    default:
      break;
  }
}

function isSandboxToolAllowed(
  toolName: string,
  ssota: AgentRunContext,
): toolName is SandboxPrimitiveToolName {
  const tier = ssota.sandboxAccess ?? "code";
  if (tier === "none") return false;
  return SANDBOX_TOOLS_BY_ACCESS_TIER[tier].includes(
    toolName as SandboxPrimitiveToolName,
  );
}

/**
 * Execute a single named main-agent tool inside a durable step and return its
 * result. `ssota` is the serializable per-run scope; live credential/MCP/sandbox
 * objects are re-hydrated here, never carried across the workflow boundary.
 */
export async function runMainAgentToolStep(
  toolName: string,
  input: unknown,
  ssota: AgentRunContext,
): Promise<unknown> {
  if (isComposioMetaToolName(toolName)) {
    if (!getConnectorAdapter()) {
      throw new Error(
        `Connector tool ${toolName} requires Composio (COMPOSIO_API_KEY).`,
      );
    }
    return executeComposioMetaTool(toolName, input, {
      teamspaceId: ssota.teamspaceId,
      accountId: ssota.accountId,
      profileId: ssota.profileId,
      enabledConnectorProviders: ssota.enabledConnectorProviders,
    });
  }

  assertGraphToolNodeScope(toolName, input, ssota);

  const ssotaTools = createSsotaTools();
  const ssotaTool = ssotaTools[toolName];
  if (ssotaTool?.execute) {
    return ssotaTool.execute(input as never, {
      toolCallId: toolCallId(toolName),
      messages: [],
      context: { ssota },
    });
  }

  if (SANDBOX_TOOLS.has(toolName)) {
    if (!ssota.sandboxSessionId) {
      throw new Error(
        `Sandbox tool ${toolName} requires a sandbox session, but none was provisioned for this run.`,
      );
    }
    if (!isSandboxToolAllowed(toolName, ssota)) {
      throw new Error(
        `Sandbox tool ${toolName} is not allowed for access tier '${ssota.sandboxAccess ?? "code"}'.`,
      );
    }
    const sessionPort = getSandboxSessionPort(ssota.teamspaceId);
    const sandbox = await sessionPort.attach(ssota.sandboxSessionId);
    const t = createSandboxTools()[toolName];
    if (!t?.execute) throw new Error(`Unknown sandbox tool: ${toolName}`);
    return await t.execute(input as never, {
      toolCallId: toolCallId(toolName),
      messages: [],
      context: { ssota, sandbox },
    });
  }

  throw new Error(`Unknown or non-executable tool: ${toolName}`);
}
