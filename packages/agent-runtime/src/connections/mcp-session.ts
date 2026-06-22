import { experimental_createMCPClient } from "@ai-sdk/mcp";
import type { Tool } from "ai";
import type { CredentialProvider } from "../credentials/provider.js";
import type { McpConnectionDef } from "./define-mcp-connection.js";
import { filterMcpTools, type McpToolListing } from "./filter-tools.js";
import { resolveConnectorUid } from "./connect-credential.js";

export interface McpSessionScope {
  projectId: string;
  accountId?: string;
  installationId?: string | null;
  userId?: string | null;
}

const STUB_TOOLS_BY_CONNECTION: Record<string, McpToolListing[]> = {
  linear: [
    {
      name: "search_issues",
      description: "Search issues in the connected Linear workspace.",
    },
    {
      name: "get_issue",
      description: "Get a Linear issue by id or identifier.",
    },
    {
      name: "create_issue",
      description: "Create a new Linear issue.",
    },
  ],
  slack: [
    {
      name: "search_messages",
      description: "Search messages across the Slack workspace.",
    },
    {
      name: "post_message",
      description: "Post a message to a Slack channel.",
    },
  ],
  github: [
    {
      name: "search_repositories",
      description: "Search GitHub repositories.",
    },
    {
      name: "list_issues",
      description: "List issues in a GitHub repository.",
    },
  ],
  notion: [
    {
      name: "search",
      description: "Search Notion pages and databases.",
    },
  ],
};

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
        STUB_TOOLS_BY_CONNECTION[connection.id] ?? [],
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
    if (!cred) return [];

    try {
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
      return filtered;
    } catch (error) {
      console.warn(
        `[mcp] listTools failed for ${connection.id} (${connection.url}):`,
        error instanceof Error ? error.message : error,
      );
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
      throw new Error(`MCP tool '${toolName}' not found on ${connection.id}`);
    }
    return tool.execute(args, {
      toolCallId: `mcp-${connection.id}-${toolName}`,
      messages: [],
    });
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.clientCache.values()].map((c) => c.close().catch(() => undefined)),
    );
    this.clientCache.clear();
    this.listCache.clear();
  }
}
