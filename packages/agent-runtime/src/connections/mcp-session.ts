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

function formatMcpError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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
  ): Promise<McpToolListing[]> {
    const key = sessionKey(connection.id, scope);
    const cached = this.listCache.get(key);
    if (cached) return cached;

    if (useMcpStub()) {
      const stub = filterMcpTools(
        STUB_TOOLS_BY_CONNECTION(connection.id),
        connection.tools,
      );
      this.listCache.set(key, stub);
      return stub;
    }

    const connectorUid = resolveConnectorUid(connection.auth.provider);
    if (!connectorUid) return [];

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
      return [];
    }

    try {
      logMcp("connect", connection, {
        installationId: scope.installationId ?? null,
        hasToken: true,
      });
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
      return filtered;
    } catch (error) {
      logMcp("listTools", connection, {
        outcome: "error",
        error: formatMcpError(error),
        installationId: scope.installationId ?? null,
      });
      return [];
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
