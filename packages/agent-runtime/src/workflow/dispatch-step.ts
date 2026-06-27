/**
 * Node-side dispatcher for the WorkflowAgent main agent. Imported by the
 * apps/web `"use step"` (NOT the `"use workflow"` function), so it may freely
 * use Node-dependent code. It re-hydrates the per-step tool environment from the
 * serializable `ssota` scope:
 *
 * - plain SSOTA tools (graph/tasks/pages) need only `{ ssota }`.
 * - connector tools come from the active connector adapter (Composio by default,
 *   legacy Vercel Connect when `CONNECTORS=connect`). The adapter is rebuilt per
 *   step (live MCP/credential objects can't cross step boundaries) and any
 *   session is closed in a `finally`.
 * - sandbox tools re-attach to the run's sandbox by id.
 */
import { asSchema } from "ai";
import { createSsotaTools } from "../tools/index.js";
import { createSandboxTools } from "../tools/sandbox.js";
import { attachSandboxSession } from "../sandbox/session.js";
import { getConnectorAdapter } from "../connectors/adapter.js";
import type { AgentRunContext } from "../engine/types.js";

/** Sandbox tool names handled by the re-attach branch (dev-capable tasks). */
export const MAIN_WORKFLOW_SANDBOX_TOOL_NAMES = [
  "sandbox_exec",
  "sandbox_write_file",
  "sandbox_read_file",
] as const;

const SANDBOX_TOOLS = new Set<string>(MAIN_WORKFLOW_SANDBOX_TOOL_NAMES);

const toolCallId = (toolName: string) => `main-wf-${toolName}`;

/** Serializable connector tool definition handed to the workflow-safe agent. */
export interface ConnectorToolDef {
  name: string;
  description: string;
  /** JSON Schema for the tool input (rehydrated with `jsonSchema()`). */
  jsonSchema: unknown;
}

/**
 * Fetch the active connector adapter's tool definitions (name + description +
 * JSON schema) for this run. Runs as a `"use step"`; the returned defs are
 * serializable so the workflow can declare them on the WorkflowAgent.
 */
export async function fetchConnectorToolDefs(
  ssota: AgentRunContext,
): Promise<ConnectorToolDef[]> {
  const adapter = getConnectorAdapter();
  if (!adapter) return [];
  const bundle = await adapter.buildTools({
    projectId: ssota.projectId,
    accountId: ssota.accountId,
    profileId: ssota.profileId,
  });
  try {
    return Object.entries(bundle.tools).map(([name, tool]) => ({
      name,
      // Connector tool descriptions are static strings; ignore the rare
      // dynamic-description form (not used by Composio/legacy connectors).
      description: typeof tool.description === "string" ? tool.description : "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jsonSchema: asSchema((tool as any).inputSchema).jsonSchema,
    }));
  } finally {
    await bundle.connectionSessionManager?.close();
  }
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
  // 1. Plain SSOTA tools (graph/tasks/pages).
  const ssotaTools = createSsotaTools();
  const ssotaTool = ssotaTools[toolName];
  if (ssotaTool?.execute) {
    return ssotaTool.execute(input as never, {
      toolCallId: toolCallId(toolName),
      messages: [],
      context: { ssota },
    });
  }

  // 2. Sandbox tools (dev-capable task runs) — re-attach by id.
  if (SANDBOX_TOOLS.has(toolName)) {
    if (!ssota.sandboxId) {
      throw new Error(
        `Sandbox tool ${toolName} requires a sandbox, but none was provisioned for this run.`,
      );
    }
    const sandbox = await attachSandboxSession(ssota.sandboxId);
    const t = createSandboxTools()[toolName];
    if (!t?.execute) throw new Error(`Unknown sandbox tool: ${toolName}`);
    return await t.execute(input as never, {
      toolCallId: toolCallId(toolName),
      messages: [],
      context: { ssota, sandbox },
    });
  }

  // 3. Connector tools via the active adapter (Composio / legacy).
  const adapter = getConnectorAdapter();
  if (adapter) {
    const bundle = await adapter.buildTools({
      projectId: ssota.projectId,
      accountId: ssota.accountId,
      profileId: ssota.profileId,
    });
    try {
      const t = bundle.tools[toolName];
      if (t?.execute) {
        return await t.execute(input as never, {
          toolCallId: toolCallId(toolName),
          messages: [],
          context: {
            ssota,
            credentials: bundle.credentials,
            connectionState: bundle.connectionState,
          },
        });
      }
    } finally {
      await bundle.connectionSessionManager?.close();
    }
  }

  throw new Error(`Unknown or non-executable tool: ${toolName}`);
}
