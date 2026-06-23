import { experimental_createMCPClient } from "@ai-sdk/mcp";
import type { Tool } from "ai";
import type { CredentialProvider } from "../credentials/provider.js";
import type { McpConnectionDef } from "./define-mcp-connection.js";
import { filterMcpTools, type McpToolListing } from "./filter-tools.js";
import { resolveConnectorUid } from "./connect-credential.js";
import { getStubToolsForConnection } from "./tool-catalog.js";

export interface McpSessionScope {
  projectId: string;
  accountId?: string;
  installationId?: string | null;
  userId?: string | null;
}

const STUB_TOOLS_BY_CONNECTION = getStubToolsForConnection;

type SessionKey = string;

function sessionKey(
  connectionId: string,
  scope: McpSessionScope,
): SessionKey {
  return [
    connectionId,
    scope.accountId ?? "",
    scope.installationId ?? "",
    scope.userId ?? "",
  ].join(":");
}

function useMcpStub(): boolean {
  return process.env.MCP_STUB === "1" || process.env.CONNECT_STUB === "1";
}

function logMcp(
  phase: "listTools" | "callTool" | "connect",
  connection: McpConnectionDef,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      component: "mcp",
      phase,
      connection: connection.id,
      url: connection.url,
      transport: connection.transport,
      ...extra,
    }),
  );
}

/**
 * MCP transport errors arrive as one string with the JSON-RPC body appended,
 * e.g. `MCP HTTP Transport Error: POSTing to endpoint (HTTP 400):
 * {"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"App is not
 * enabled for Slack MCP server access. Please enable it here: …"}}`. Surface
 * the inner `error.message` so the chat shows the actionable reason and link
 * instead of the raw transport dump (applies to every MCP connection, not just
 * Slack). Falls back to the raw message when there's no JSON-RPC body to parse.
 */
function formatMcpError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const jsonStart = raw.indexOf("{");
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: unknown };
      };
      const inner = parsed.error?.message;
      if (typeof inner === "string" && inner.trim()) {
        return inner.trim();
      }
    } catch {
      // Not a JSON-RPC body — fall through to the raw transport message.
    }
  }
  return raw;
}

/**
 * MCP client + tools/list cache for a single agent run.
 */
export class McpSessionManager {
  private readonly listCache = new Map<SessionKey, McpToolListing[]>();
  private readonly clientCache = new Map<SessionKey, { close: () => Promise<void> }>();

  constructor(private readonly credentials: CredentialProvider) {}

  async listTools(
    connection: McpConnectionDef,
    scope: McpSessionScope,
  ): Promise<{ tools: McpToolListing[]; error?: string }> {
    const key = sessionKey(connection.id, scope);
    const cached = this.listCache.get(key);
    if (cached) return { tools: cached };

    if (useMcpStub()) {
      const stub = filterMcpTools(
        STUB_TOOLS_BY_CONNECTION(connection.id),
        connection.tools,
      );
      this.listCache.set(key, stub);
      return { tools: stub };
    }

    const connectorUid = resolveConnectorUid(connection.auth.provider);
    if (!connectorUid) return { tools: [] };

    const cred = await this.credentials.getToken(connectorUid, {
      projectId: scope.projectId,
      accountId: scope.accountId,
      installationId: scope.installationId ?? undefined,
      userId: scope.userId ?? undefined,
    });
    if (!cred) {
      logMcp("listTools", connection, {
        outcome: "skipped",
        reason: "no_credential",
        installationId: scope.installationId ?? null,
      });
      return { tools: [] };
    }

    try {
      logMcp("connect", connection, {
        installationId: scope.installationId ?? null,
        hasToken: true,
        userId: scope.userId ?? null,
        // Token prefix only (never the secret): xoxp- = user token (what Slack
        // MCP needs), xoxb- = bot token (lists zero MCP tools).
        tokenType: cred.token.slice(0, 5),
      });

      // TEMP DIAGNOSTIC — Slack MCP returns ok+0 tools when the token lacks the
      // user scopes it gates tools on. `auth.test` succeeds for any valid token;
      // the `x-oauth-scopes` response header is the ground truth of what scopes
      // the *exact* token MCP receives actually carries. Remove once resolved.
      if (connection.id === "slack") {
        try {
          const probe = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cred.token}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            signal: AbortSignal.timeout(5000),
          });
          const grantedScopes = probe.headers.get("x-oauth-scopes");
          const body = (await probe.json()) as {
            ok?: boolean;
            error?: string;
            team?: string;
          };
          logMcp("connect", connection, {
            diag: "slack_token_probe",
            tokenType: cred.token.slice(0, 5),
            authTestOk: body.ok ?? false,
            authTestError: body.error ?? null,
            team: body.team ?? null,
            grantedScopes: grantedScopes ?? null,
          });
        } catch (probeError) {
          logMcp("connect", connection, {
            diag: "slack_token_probe_failed",
            error:
              probeError instanceof Error
                ? probeError.message
                : String(probeError),
          });
        }
      }

      const client = await experimental_createMCPClient({
        transport: {
          type: connection.transport,
          url: connection.url,
          headers: {
            Authorization: `Bearer ${cred.token}`,
          },
        },
      });
      this.clientCache.set(key, client);

      const mcpTools = await client.tools();
      const listings: McpToolListing[] = Object.entries(mcpTools).map(
        ([name, t]) => ({
          name,
          description: t.description,
        }),
      );
      const filtered = filterMcpTools(listings, connection.tools);
      this.listCache.set(key, filtered);
      logMcp("listTools", connection, {
        outcome: "ok",
        toolCount: filtered.length,
        installationId: scope.installationId ?? null,
      });
      return { tools: filtered };
    } catch (error) {
      const message = formatMcpError(error);
      logMcp("listTools", connection, {
        outcome: "error",
        error: message,
        installationId: scope.installationId ?? null,
        userId: scope.userId ?? null,
      });
      return { tools: [], error: message };
    }
  }

  async callTool(
    connection: McpConnectionDef,
    scope: McpSessionScope,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (useMcpStub()) {
      return {
        ok: true,
        stub: true,
        connection: connection.id,
        tool: toolName,
        args,
      };
    }

    const connectorUid = resolveConnectorUid(connection.auth.provider);
    if (!connectorUid) {
      throw new Error(`Connector uid not configured for ${connection.id}`);
    }

    const cred = await this.credentials.getToken(connectorUid, {
      projectId: scope.projectId,
      accountId: scope.accountId,
      installationId: scope.installationId ?? undefined,
      userId: scope.userId ?? undefined,
    });
    if (!cred) {
      throw new Error(
        `No credential for ${connection.id}. Call request_connection first.`,
      );
    }

    const key = sessionKey(connection.id, scope);
    let client = this.clientCache.get(key);
    if (!client) {
      logMcp("connect", connection, {
        tool: toolName,
        installationId: scope.installationId ?? null,
        hasToken: true,
      });
      const created = await experimental_createMCPClient({
        transport: {
          type: connection.transport,
          url: connection.url,
          headers: { Authorization: `Bearer ${cred.token}` },
        },
      });
      this.clientCache.set(key, created);
      client = created;
    }

    const mcpTools = await (client as Awaited<ReturnType<typeof experimental_createMCPClient>>).tools();
    const tool = mcpTools[toolName] as Tool | undefined;
    if (!tool?.execute) {
      const message = `MCP tool '${toolName}' not found on ${connection.id}`;
      logMcp("callTool", connection, {
        outcome: "error",
        tool: toolName,
        error: message,
        installationId: scope.installationId ?? null,
      });
      throw new Error(message);
    }

    try {
      logMcp("callTool", connection, {
        outcome: "start",
        tool: toolName,
        installationId: scope.installationId ?? null,
      });
      const result = await tool.execute(args, {
        toolCallId: `mcp-${connection.id}-${toolName}`,
        messages: [],
      });
      logMcp("callTool", connection, {
        outcome: "ok",
        tool: toolName,
        installationId: scope.installationId ?? null,
      });
      return result;
    } catch (error) {
      logMcp("callTool", connection, {
        outcome: "error",
        tool: toolName,
        error: formatMcpError(error),
        installationId: scope.installationId ?? null,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.clientCache.values()].map((c) => c.close().catch(() => undefined)),
    );
    this.clientCache.clear();
    this.listCache.clear();
  }
}
