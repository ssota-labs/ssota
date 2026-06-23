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
  | "discord";

export interface ConnectorDef {
  provider: ConnectorProvider;
  label: string;
  /** Whether several workspaces/installations can be connected at once. */
  multiWorkspace: boolean;
  /** Connector uid from env (`provider/config-name`), or null if unconfigured. */
  connectorUid: string | null;
}

const ENV_KEYS: Record<ConnectorProvider, string> = {
  slack: "SLACK_CONNECT_CONNECTOR",
  notion: "NOTION_CONNECT_CONNECTOR",
  github: "GITHUB_CONNECT_CONNECTOR",
  linear: "LINEAR_CONNECT_CONNECTOR",
  discord: "DISCORD_CONNECT_CONNECTOR",
};

const REGISTRY: Omit<ConnectorDef, "connectorUid">[] = [
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
];

/** Resolve the connector registry with per-deployment env configuration. */
export function getConnectors(): ConnectorDef[] {
  return REGISTRY.map((def) => ({
    ...def,
    connectorUid: process.env[ENV_KEYS[def.provider]] ?? null,
  }));
}

/** Default OAuth scopes when starting Connect authorization, per provider. */
const AUTHORIZE_SCOPES: Partial<Record<ConnectorProvider, readonly string[]>> = {
  // Discord bot install requires the `bot` scope; without it the OAuth page
  // shows "No scopes were provided."
  discord: ["bot"],
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
