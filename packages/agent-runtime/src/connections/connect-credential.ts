/** Maps connection provider id to deployment env var (mirrors apps/web/lib/connect/connectors.ts). */
const CONNECTOR_ENV_KEYS: Record<string, string> = {
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
  const envKey = CONNECTOR_ENV_KEYS[provider];
  if (!envKey) return null;
  return process.env[envKey] ?? null;
}

export function providerOfConnectorUid(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}
