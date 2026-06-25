// Import from the dependency-free subpath, NOT the package barrel: this module
// is pulled into client components (connections-list.tsx), and the barrel would
// drag the DB/runtime (Node built-ins) into the browser bundle.
import { mcpScopesForConnector } from "@ssota/agent-runtime/connect-scopes";

/**
 * The connectors the in-app Connections page can manage. Auth model per the
 * providers' official docs determines whether multiple workspaces can be
 * connected (one row per installation) or just one:
 *
 *  - Slack   — token per team        → multiple workspaces
 *  - Notion  — token per workspace    → multiple workspaces (re-auth each)
 *  - GitHub  — per-installation (org) → multiple installations
 *  - Discord — per-guild (server)     → multiple servers
 *  - Linear  — token scoped to one workspace → single
 *
 * The actual connector uid (`provider/config-name`) is configured per
 * deployment via env (Vercel Connect); when unset the provider is shown as
 * "not configured" rather than offering a broken Connect link.
 */
export type ConnectorProvider =
  | "slack"
  | "notion"
  | "github"
  | "linear"
  | "discord"
  | "twitter";

export interface ConnectorDef {
  provider: ConnectorProvider;
  label: string;
  /** Whether several workspaces/installations can be connected at once. */
  multiWorkspace: boolean;
  /**
   * The connector the agent uses to reach the hosted MCP server — resolved from
   * `<PROVIDER>_MCP_CONNECTOR`, falling back to the legacy
   * `<PROVIDER>_CONNECT_CONNECTOR`. Null if unconfigured. This is the connector
   * the Connections card connects/disconnects.
   */
  connectorUid: string | null;
  /**
   * The provider API/OAuth connector, resolved from `<PROVIDER>_API_CONNECTOR`.
   * In Vercel Connect the MCP and API connectors are separate records, so this
   * is a distinct slot from {@link connectorUid}. Reserved for REST enrichment
   * and future direct-API features — not consumed by the agent yet. Null if
   * unconfigured.
   */
  apiConnectorUid: string | null;
  /**
   * Whether the configured connector is a Vercel Connect **MCP-type** connector
   * (its own OAuth via the hosted MCP server's authorization server, e.g.
   * `mcp.notion.com/ssota`) rather than a provider API OAuth connector
   * (`notion/ssota`). Derived from the connector uid — MCP connectors mint a
   * single user-subject grant with no per-workspace installation id, so the UI
   * renders them as a single "MCP Connected" state instead of the
   * per-workspace install list.
   */
  isMcp: boolean;
}

// MCP and API are separate Vercel Connect connectors, so each provider has its
// own env slot. `*_CONNECT_CONNECTOR` is the legacy single slot, kept as a
// fallback for the MCP connector so existing deployments keep working.
const MCP_ENV_KEYS: Partial<Record<ConnectorProvider, string>> = {
  slack: "SLACK_MCP_CONNECTOR",
  notion: "NOTION_MCP_CONNECTOR",
  github: "GITHUB_MCP_CONNECTOR",
  linear: "LINEAR_MCP_CONNECTOR",
  discord: "DISCORD_MCP_CONNECTOR",
  // twitter has no hosted MCP server — omitted intentionally
};

const API_ENV_KEYS: Record<ConnectorProvider, string> = {
  slack: "SLACK_API_CONNECTOR",
  notion: "NOTION_API_CONNECTOR",
  github: "GITHUB_API_CONNECTOR",
  linear: "LINEAR_API_CONNECTOR",
  discord: "DISCORD_API_CONNECTOR",
  twitter: "TWITTER_API_CONNECTOR",
};

const LEGACY_ENV_KEYS: Partial<Record<ConnectorProvider, string>> = {
  slack: "SLACK_CONNECT_CONNECTOR",
  notion: "NOTION_CONNECT_CONNECTOR",
  github: "GITHUB_CONNECT_CONNECTOR",
  linear: "LINEAR_CONNECT_CONNECTOR",
  discord: "DISCORD_CONNECT_CONNECTOR",
  // twitter has no legacy slot — it uses TWITTER_API_CONNECTOR as its primary
};

const REGISTRY: Omit<
  ConnectorDef,
  "connectorUid" | "apiConnectorUid" | "isMcp"
>[] = [
  {
    provider: "slack",
    label: "Slack",
    multiWorkspace: true,
  },
  {
    provider: "notion",
    label: "Notion",
    multiWorkspace: true,
  },
  {
    provider: "github",
    label: "GitHub",
    multiWorkspace: true,
  },
  {
    provider: "discord",
    label: "Discord",
    multiWorkspace: true,
  },
  {
    provider: "linear",
    label: "Linear",
    multiWorkspace: false,
  },
  {
    provider: "twitter",
    label: "X",
    multiWorkspace: false,
  },
];

/**
 * A connector is MCP-type when its uid host is a hosted MCP server, e.g.
 * `mcp.notion.com/ssota`. Vercel Connect's "MCP" connection type names the
 * connector after the MCP server host (`mcp.<provider>.com`), whereas an API
 * OAuth connector is named after the provider (`notion/ssota`). We key off that
 * `mcp.` host to drive the per-card rendering (single "MCP Connected" state vs
 * the per-workspace install list).
 */
export function isMcpConnector(connectorUid: string | null | undefined): boolean {
  if (!connectorUid) return false;
  return providerOf(connectorUid).startsWith("mcp.");
}

/** Resolve the connector registry with per-deployment env configuration. */
export function getConnectors(): ConnectorDef[] {
  return REGISTRY.map((def) => {
    const apiConnectorUid = process.env[API_ENV_KEYS[def.provider]] ?? null;
    // Resolution order: MCP connector → legacy single slot → API connector.
    // The API connector fallback allows REST-only providers (e.g. Twitter) that
    // have no hosted MCP server to appear as configured and drive the Connect
    // auth flow, while still recording a separate apiConnectorUid for clarity.
    const connectorUid =
      process.env[MCP_ENV_KEYS[def.provider] ?? ""] ??
      process.env[LEGACY_ENV_KEYS[def.provider] ?? ""] ??
      apiConnectorUid;
    return {
      ...def,
      connectorUid,
      apiConnectorUid,
      isMcp: isMcpConnector(connectorUid),
    };
  });
}

/** Default OAuth scopes when starting Connect authorization, per provider. */
const AUTHORIZE_SCOPES: Partial<Record<ConnectorProvider, readonly string[]>> = {
  // Discord bot install requires the `bot` scope; without it the OAuth page
  // shows "No scopes were provided."
  discord: ["bot"],
  // Twitter uses provider-level OAuth (no hosted MCP), so all required scopes
  // must be declared here. `offline.access` requests a refresh token.
  twitter: [
    "tweet.read",
    "tweet.write",
    "users.read",
    "follows.read",
    "follows.write",
    "offline.access",
  ],
};

/** Resolve the provider segment of a stored connector uid, e.g. "slack/acme" → "slack". */
export function providerOf(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}

/**
 * Scopes for `startConnectAuthorization`. Explicit `scopes` query params win;
 * otherwise grant the union of the per-provider default scopes (e.g. Discord
 * `bot`) and the broad MCP scopes the agent runtime later requests at
 * token-mint time (`mcpScopesForConnector` — the Slack workspace permissions,
 * Linear read/write, etc.).
 *
 * Consenting these here is what lets the minted Bearer actually carry them: a
 * Connect token can only hold scopes the user granted at consent. Previously
 * consent requested nothing for Slack (so the token was identity-only / 0
 * tools) while the runtime still asked for the broad set — that mismatch is the
 * bug this closes. Providers without granular scope strings (Notion content
 * grants) yield `undefined` and fall back to the connector's configured grant.
 */
export function resolveAuthorizeScopes(
  connectorUid: string,
  explicit?: string[],
): string[] | undefined {
  if (explicit && explicit.length > 0) return explicit;
  const provider = providerOf(connectorUid) as ConnectorProvider;
  const merged = [
    ...(AUTHORIZE_SCOPES[provider] ?? []),
    ...(mcpScopesForConnector(connectorUid) ?? []),
  ];
  const deduped = [...new Set(merged)];
  return deduped.length > 0 ? deduped : undefined;
}
