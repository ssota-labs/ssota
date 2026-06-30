/**
 * Connector adapter — Composio Tool Router only. Legacy Vercel Connect is removed.
 *
 * Selection (env `CONNECTORS`):
 *   - `composio` → Composio Tool Router (needs COMPOSIO_API_KEY)
 *   - `none`     → no connector tools
 *   - unset      → composio when COMPOSIO_API_KEY is set, else none
 */
import type { ToolSet } from "ai";
import { isComposioEnabled } from "../composio/client.js";
import { createComposioOrgTools, createComposioTools } from "../composio/tools.js";
import { isComposioMetaToolName } from "../composio/meta-tool-schemas.js";
import { resolveOrgIdForProject } from "../ports.js";

export interface ConnectorToolsBundle {
  tools: ToolSet;
}

export interface BuildConnectorToolsInput {
  teamspaceId: string;
  accountId?: string;
  profileId?: string;
  /** Composio toolkit slugs enabled for this agent run. */
  enabledConnectorProviders?: string[];
}

export interface ConnectorAdapter {
  buildTools(input: BuildConnectorToolsInput): Promise<ConnectorToolsBundle>;
}

const EMPTY: ConnectorToolsBundle = { tools: {} };

function composioAdapter(): ConnectorAdapter {
  return {
    async buildTools({ teamspaceId, profileId, enabledConnectorProviders }) {
      const orgId = await resolveOrgIdForProject(teamspaceId);
      if (!orgId) return EMPTY;
      if (enabledConnectorProviders && enabledConnectorProviders.length === 0) {
        return EMPTY;
      }
      const enabledToolkits = enabledConnectorProviders?.length
        ? enabledConnectorProviders
        : undefined;
      const tools = profileId
        ? await createComposioTools({ orgId, profileId, enabledToolkits })
        : await createComposioOrgTools({ orgId, enabledToolkits });
      return { tools };
    },
  };
}

/** Resolve the active connector adapter, or null when connectors are disabled. */
export function getConnectorAdapter(): ConnectorAdapter | null {
  switch (process.env.CONNECTORS) {
    case "composio":
      return isComposioEnabled() ? composioAdapter() : null;
    case "none":
      return null;
  }
  return isComposioEnabled() ? composioAdapter() : null;
}

/** Execute a Composio meta-tool by name inside a freshly built session bundle. */
export async function executeComposioMetaTool(
  toolName: string,
  input: unknown,
  scope: BuildConnectorToolsInput,
): Promise<unknown> {
  if (!isComposioMetaToolName(toolName)) {
    throw new Error(`Not a Composio meta-tool: ${toolName}`);
  }
  const adapter = getConnectorAdapter();
  if (!adapter) {
    throw new Error("Composio connectors are not configured for this deployment.");
  }
  const bundle = await adapter.buildTools(scope);
  const tool = bundle.tools[toolName];
  if (!tool?.execute) {
    throw new Error(`Composio meta-tool unavailable: ${toolName}`);
  }
  return tool.execute(input as never, {
    toolCallId: `composio-${toolName}`,
    messages: [],
    context: {},
  });
}
