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
  /** One-line description of what connecting unlocks. */
  description: string;
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
    description: "Let the agent read and post in your Slack workspaces.",
  },
  {
    provider: "notion",
    label: "Notion",
    multiWorkspace: true,
    description: "Give the agent access to your Notion workspaces.",
  },
  {
    provider: "github",
    label: "GitHub",
    multiWorkspace: true,
    description: "Connect GitHub orgs so the agent can work with repos.",
  },
  {
    provider: "discord",
    label: "Discord",
    multiWorkspace: true,
    description: "Add the agent to your Discord servers.",
  },
  {
    provider: "linear",
    label: "Linear",
    multiWorkspace: false,
    description: "Connect your Linear workspace for issues and projects.",
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
 * otherwise use per-provider defaults (e.g. Discord `bot`).
 */
export function resolveAuthorizeScopes(
  connectorUid: string,
  explicit?: string[],
): string[] | undefined {
  if (explicit && explicit.length > 0) return explicit;
  const provider = providerOf(connectorUid) as ConnectorProvider;
  const defaults = AUTHORIZE_SCOPES[provider];
  return defaults ? [...defaults] : undefined;
}
