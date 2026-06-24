/**
 * Per-provider deployment env vars (mirrors apps/web/lib/connect/connectors.ts).
 *
 * In Vercel Connect, the MCP connector and the API/OAuth connector are separate
 * connector records, so each provider has separate slots:
 *  - `<PROVIDER>_MCP_CONNECTOR` — the connector the agent uses to reach the
 *    hosted MCP server.
 *  - `<PROVIDER>_API_CONNECTOR` — the API/OAuth connector (REST enrichment and
 *    future direct-API features; not consumed by the agent yet).
 *  - `<PROVIDER>_CONNECT_CONNECTOR` — legacy single slot, treated as the MCP
 *    connector for backward compatibility with existing deployments.
 */
const MCP_CONNECTOR_ENV_KEYS: Record<string, string> = {
  slack: "SLACK_MCP_CONNECTOR",
  notion: "NOTION_MCP_CONNECTOR",
  github: "GITHUB_MCP_CONNECTOR",
  linear: "LINEAR_MCP_CONNECTOR",
  discord: "DISCORD_MCP_CONNECTOR",
};

const LEGACY_CONNECTOR_ENV_KEYS: Record<string, string> = {
  slack: "SLACK_CONNECT_CONNECTOR",
  notion: "NOTION_CONNECT_CONNECTOR",
  github: "GITHUB_CONNECT_CONNECTOR",
  linear: "LINEAR_CONNECT_CONNECTOR",
  discord: "DISCORD_CONNECT_CONNECTOR",
};

export interface ConnectAuthBinding {
  type: "connect";
  provider: string;
}

/**
 * Eve `connect("linear")` equivalent — resolves connector uid from env at runtime.
 */
export function connectCredential(provider: string): ConnectAuthBinding {
  return { type: "connect", provider };
}

export function resolveConnectorUid(provider: string): string | null {
  // The agent talks to the hosted MCP server, so it resolves the MCP connector,
  // falling back to the legacy single slot (set by existing deployments to the
  // agent's connector). The API connector slot is intentionally NOT consulted
  // here — it is reserved for REST/enrichment use.
  const mcpKey = MCP_CONNECTOR_ENV_KEYS[provider];
  const legacyKey = LEGACY_CONNECTOR_ENV_KEYS[provider];
  return (
    (mcpKey ? process.env[mcpKey] : undefined) ??
    (legacyKey ? process.env[legacyKey] : undefined) ??
    null
  );
}

export function providerOfConnectorUid(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}
