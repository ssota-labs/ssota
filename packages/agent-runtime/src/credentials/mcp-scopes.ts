/**
 * Provider MCP scope catalog — the single source of truth for the scopes a
 * Connect-backed MCP connection needs.
 *
 * This module is intentionally DEPENDENCY-FREE so it can be imported from both
 * the server runtime (token mint, via `provider.ts`) and client-safe web code
 * (the consent flow in `apps/web/lib/connect/connectors.ts`) through the
 * `@ssota/agent-runtime/connect-scopes` subpath — importing the package barrel
 * would drag the DB/runtime (and Node built-ins like `fs`/`net`) into the
 * browser bundle. Do not add imports here.
 *
 * Widest practical provider scopes to request when minting an MCP token, keyed
 * by connector provider segment. Without explicit scopes Connect mints a
 * minimal token (e.g. Slack returns an `identity.basic` sign-in token → the MCP
 * server exposes zero tools), so we request the broad set each MCP server gates
 * its tools on.
 *
 * Slack deliberately OMITS `identity.*` (Sign in with Slack) scopes: per Slack's
 * docs, SIWS scopes cannot be combined with regular workspace scopes in one
 * OAuth flow, and mixing them yields an identity-only token. Providers whose
 * OAuth has no granular scope strings (Notion content grants, GitHub App
 * installation permissions, self-hosted Discord) are omitted — Connect uses the
 * connector's configured defaults for those.
 */
const MCP_CONNECT_SCOPES: Record<string, string[]> = {
  slack: [
    "channels:read",
    "channels:history",
    "groups:read",
    "groups:history",
    "im:read",
    "im:history",
    "mpim:read",
    "mpim:history",
    "search:read.public",
    "search:read.private",
    "search:read.im",
    "search:read.mpim",
    "search:read.files",
    "search:read.users",
    "chat:write",
    "reactions:read",
    "reactions:write",
    "users:read",
    "users:read.email",
    "emoji:read",
    "files:read",
    "pins:read",
    "bookmarks:read",
    "usergroups:read",
    "team:read",
    "dnd:read",
    "canvases:read",
    "canvases:write",
  ],
  linear: ["read", "write", "issues:create", "comments:create"],
};

/** Widest MCP scopes for a connector uid, or undefined to use connector defaults. */
export function mcpScopesForConnector(connectorUid: string): string[] | undefined {
  const provider = connectorUid.split("/")[0] ?? connectorUid;
  return MCP_CONNECT_SCOPES[provider];
}
