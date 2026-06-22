import type { McpConnectionDef } from "./define-mcp-connection.js";
import { resolveConnectorUid } from "./connect-credential.js";
import linear from "./linear.js";
import slack from "./slack.js";
import github from "./github.js";
import notion from "./notion.js";
import discord from "./discord.js";

const ALL_CONNECTIONS: Array<McpConnectionDef | null> = [
  linear,
  slack,
  github,
  notion,
  discord,
];

/** Connections with a configured Vercel Connect connector uid for this deployment. */
export function getConfiguredConnections(): McpConnectionDef[] {
  return ALL_CONNECTIONS.filter((c): c is McpConnectionDef => {
    if (!c) return false;
    return resolveConnectorUid(c.auth.provider) !== null;
  });
}

export function getConnectionById(id: string): McpConnectionDef | null {
  return getConfiguredConnections().find((c) => c.id === id) ?? null;
}
