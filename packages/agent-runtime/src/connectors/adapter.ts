/**
 * Connector adapter — the seam that lets the agent's third-party tools come
 * from either Composio (default) or the legacy Vercel Connect MCP/REST stack.
 * The legacy path is preserved (not deleted) so we can revert, and so OSS
 * self-hosters can run their own connectors without Composio.
 *
 * Selection (env `CONNECTORS`):
 *   - `composio`        → Composio Tool Router (needs COMPOSIO_API_KEY + profileId)
 *   - `connect`/`own-app` → legacy createConnectionTools (Vercel Connect / env tokens)
 *   - `none`            → no connector tools
 *   - unset (auto)      → composio if COMPOSIO_API_KEY is set, else legacy
 */
import type { ToolSet } from "ai";
import type { ConnectionRunState } from "../connections/run-state.js";
import type { McpSessionManager } from "../connections/mcp-session.js";
import type { CredentialProvider } from "../credentials/provider.js";
import { ConnectionRunState as ConnectionRunStateImpl } from "../connections/run-state.js";
import { McpSessionManager as McpSessionManagerImpl } from "../connections/mcp-session.js";
import { createConnectionTools } from "../tools/connections.js";
import { resolveCredentialProvider } from "../credentials/provider.js";
import { isComposioEnabled } from "../composio/client.js";
import { createComposioOrgTools, createComposioTools } from "../composio/tools.js";
import { resolveOrgIdForProject } from "../ports.js";

export interface ConnectorToolsBundle {
  tools: ToolSet;
  /** Legacy only — injected into the engine's run context. */
  connectionState?: ConnectionRunState;
  connectionSessionManager?: McpSessionManager;
  credentials?: CredentialProvider;
}

export interface BuildConnectorToolsInput {
  teamspaceId: string;
  accountId?: string;
  /** Composio entity profile (acting user); absent → Composio attaches nothing. */
  profileId?: string;
}

export type ConnectorAdapterKind = "composio" | "legacy";

export interface ConnectorAdapter {
  readonly kind: ConnectorAdapterKind;
  buildTools(input: BuildConnectorToolsInput): Promise<ConnectorToolsBundle>;
}

const EMPTY: ConnectorToolsBundle = { tools: {} };

function composioAdapter(): ConnectorAdapter {
  return {
    kind: "composio",
    async buildTools({ teamspaceId, profileId }) {
      const orgId = await resolveOrgIdForProject(teamspaceId);
      if (!orgId) return EMPTY;
      // With an acting user → their personal entity (which also sees
      // ACL-accessible org-shared connections). Without one (inbound chat,
      // scheduler, task) → the org-shared entity, so the org's connections
      // are still available.
      const tools = profileId
        ? await createComposioTools({ orgId, profileId })
        : await createComposioOrgTools({ orgId });
      return { tools };
    },
  };
}

function legacyAdapter(): ConnectorAdapter {
  return {
    kind: "legacy",
    async buildTools({ teamspaceId, accountId }) {
      const credentials = resolveCredentialProvider();
      if (!credentials) return EMPTY;
      const connectionState = new ConnectionRunStateImpl();
      const connectionSessionManager = new McpSessionManagerImpl(credentials);
      const bundle = await createConnectionTools({
        credentials,
        accountId,
        teamspaceId,
        connectionState,
        sessionManager: connectionSessionManager,
      });
      return {
        tools: bundle.tools,
        connectionState,
        connectionSessionManager,
        credentials,
      };
    },
  };
}

/** Resolve the active connector adapter, or null when connectors are disabled. */
export function getConnectorAdapter(): ConnectorAdapter | null {
  switch (process.env.CONNECTORS) {
    case "composio":
      return composioAdapter();
    case "connect":
    case "own-app":
      return legacyAdapter();
    case "none":
      return null;
  }
  // Auto: Composio when configured, otherwise the legacy stack.
  return isComposioEnabled() ? composioAdapter() : legacyAdapter();
}
