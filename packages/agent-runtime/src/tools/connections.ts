import {
  createAccountConnectionPort,
  type ConnectCredentialScopeRecord,
} from "@ssota/adapter-postgres";
import type { ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { CredentialProvider } from "../credentials/provider.js";
import { getDb } from "../ports.js";
import { resolveConnectorUid } from "../connections/connect-credential.js";
import type { McpConnectionDef } from "../connections/define-mcp-connection.js";
import { getConfiguredConnections } from "../connections/registry.js";
import type { McpToolListing } from "../connections/filter-tools.js";
import { McpSessionManager } from "../connections/mcp-session.js";
import { inferConnectionIdFromQuery } from "../connections/tool-catalog.js";
import {
  toQualifiedToolName,
  parseQualifiedToolName,
} from "../connections/qualified-name.js";
import type {
  ConnectionSearchResult,
  ConnectionSearchMatch,
} from "../connections/connection-search-result.js";
import {
  ConnectionRunState,
  CONNECTION_SEARCH_TOOL,
  CONNECTION_CALL_TOOL,
  REQUEST_CONNECTION_TOOL,
} from "../connections/run-state.js";
import {
  getCredentialProvider,
  getConnectionRunState,
  getRunContext,
} from "./context.js";

export interface CreateConnectionToolsInput {
  credentials: CredentialProvider;
  accountId?: string;
  projectId: string;
  connectionState: ConnectionRunState;
  sessionManager: McpSessionManager;
}

export interface ConnectionToolsBundle {
  tools: ToolSet;
  connectionState: ConnectionRunState;
  sessionManager: McpSessionManager;
}

interface InstallScope {
  connectorUid: string;
  installationId: string | null;
  installationName: string | null;
  subjectUserId: string | null;
}

interface SearchHitInternal extends ConnectionSearchMatch {
  installationId: string | null;
  installationName: string | null;
}

export async function createConnectionTools(
  input: CreateConnectionToolsInput,
): Promise<ConnectionToolsBundle> {
  const connections = getConfiguredConnections();
  const tools: ToolSet = {
    [CONNECTION_SEARCH_TOOL]: buildConnectionSearchTool(connections, input),
    [CONNECTION_CALL_TOOL]: buildConnectionCallTool(connections, input),
    [REQUEST_CONNECTION_TOOL]: buildRequestConnectionTool(),
  };

  return {
    tools,
    connectionState: input.connectionState,
    sessionManager: input.sessionManager,
  };
}

async function listInstallScopes(
  connection: McpConnectionDef,
  accountId: string | undefined,
): Promise<InstallScope[]> {
  const connectorUid = resolveConnectorUid(connection.auth.provider);
  if (!connectorUid) return [];

  if (!accountId) return [];

  const port = createAccountConnectionPort(getDb());
  return (
    await port.listConnectCredentialScopesForProvider(accountId, connection.id)
  ).map((row: ConnectCredentialScopeRecord) => ({
    connectorUid: row.connector,
    installationId: row.installationId,
    installationName: row.installationName,
    subjectUserId: row.subjectUserId,
  }));
}

async function runConnectionSearch(
  connections: McpConnectionDef[],
  input: {
    query: string;
    connection?: string;
    projectId: string;
    accountId?: string;
    credentials: CredentialProvider;
    sessionManager: McpSessionManager;
  },
): Promise<{ result: ConnectionSearchResult; internalHits: SearchHitInternal[] }> {
  const query = input.query.trim().toLowerCase();
  const queryTerms = query.split(/\s+/).filter(Boolean);
  const connectionFilter =
    input.connection ?? inferConnectionIdFromQuery(query);

  const result: ConnectionSearchResult = { connections: [], matched: [], errors: [] };
  const internalHits: SearchHitInternal[] = [];

  for (const connection of connections) {
    if (connectionFilter && connectionFilter !== connection.id) {
      continue;
    }

    const connectorUid = resolveConnectorUid(connection.auth.provider);
    const installs = await listInstallScopes(connection, input.accountId);

    if (installs.length === 0) {
      result.connections.push({
        connection: connection.id,
        description: connection.description,
        connected: false,
        installationId: null,
        installationName: null,
        connectorUid,
      });
      continue;
    }

    for (const install of installs) {
      const connected =
        (await input.credentials.getToken(install.connectorUid, {
          projectId: input.projectId,
          accountId: input.accountId,
          installationId: install.installationId ?? undefined,
          userId: install.subjectUserId ?? undefined,
        })) !== null;

      result.connections.push({
        connection: connection.id,
        description: connection.description,
        connected,
        installationId: install.installationId,
        installationName: install.installationName,
        connectorUid: install.connectorUid,
      });

      if (!connected) continue;

      let listings: McpToolListing[] = [];
      let listError: string | undefined;
      try {
        const listed = await input.sessionManager.listTools(connection, {
          projectId: input.projectId,
          accountId: input.accountId,
          installationId: install.installationId,
          userId: install.subjectUserId,
        });
        listings = listed.tools;
        listError = listed.error;
      } catch (error) {
        listError = error instanceof Error ? error.message : String(error);
        console.warn(
          `[connection_search] listTools failed for ${connection.id}:`,
          listError,
        );
      }

      if (listError) {
        result.errors?.push({
          connection: connection.id,
          installationId: install.installationId,
          message: listError,
        });
      }

      for (const listing of listings) {
        const qualifiedName = toQualifiedToolName(connection.id, listing.name);
        const haystack = [
          qualifiedName,
          listing.name,
          listing.description ?? "",
          connection.id,
          connection.description,
          install.installationName ?? "",
        ]
          .join(" ")
          .toLowerCase();

        if (!toolMatchesQuery(haystack, queryTerms)) continue;

        const hit: SearchHitInternal = {
          qualifiedName,
          connection: connection.id,
          tool: listing.name,
          installationId: install.installationId,
          installationName: install.installationName,
        };
        internalHits.push(hit);
        result.matched.push({
          qualifiedName: hit.qualifiedName,
          connection: hit.connection,
          tool: hit.tool,
        });
      }
    }
  }

  if (result.errors?.length === 0) {
    delete result.errors;
  }

  return { result, internalHits };
}

function buildConnectionSearchTool(
  connections: McpConnectionDef[],
  input: CreateConnectionToolsInput,
) {
  return tool({
    description:
      "Discover MCP tools for connected third-party services. Pass a natural-language query; matched tools are invoked with connection_call (qualifiedName + args). Does not return full tool schemas — only matched names.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Natural-language query describing the capability needed."),
      connection: z
        .string()
        .optional()
        .describe(
          "Optional connection id to narrow search (e.g. linear, slack).",
        ),
    }),
    execute: async (searchInput, { experimental_context }) => {
      const ctx = getRunContext(experimental_context);
      const state = getConnectionRunState(experimental_context);
      const provider = getCredentialProvider(experimental_context);

      console.log(
        JSON.stringify({
          component: "connection_search",
          query: searchInput.query,
          connectionFilter: searchInput.connection ?? null,
          projectId: ctx.projectId,
          accountId: ctx.accountId ?? null,
        }),
      );

      const { result, internalHits } = await runConnectionSearch(connections, {
        query: searchInput.query,
        connection: searchInput.connection,
        projectId: ctx.projectId,
        accountId: ctx.accountId,
        credentials: provider ?? input.credentials,
        sessionManager: input.sessionManager,
      });

      state?.recordInstallations(internalHits);

      console.log(
        JSON.stringify({
          component: "connection_search",
          outcome: "ok",
          connections: result.connections.map((c) => ({
            connection: c.connection,
            connected: c.connected,
            installationId: c.installationId,
          })),
          matchCount: result.matched.length,
          matched: result.matched.map((t) => t.qualifiedName),
        }),
      );

      return result;
    },
  });
}

function buildConnectionCallTool(
  connections: McpConnectionDef[],
  input: CreateConnectionToolsInput,
) {
  return tool({
    description:
      "Invoke an MCP tool by qualified name (e.g. linear__search_issues). Call connection_search first when unsure which tool fits. Args must match the remote tool schema.",
    inputSchema: z.object({
      qualifiedName: z
        .string()
        .describe("Qualified tool name from connection_search (connection__tool)."),
      args: z
        .record(z.unknown())
        .describe("Arguments for the remote MCP tool."),
    }),
    execute: async (callInput, { experimental_context }) => {
      const ctx = getRunContext(experimental_context);
      const state = getConnectionRunState(experimental_context);
      const parsed = parseQualifiedToolName(callInput.qualifiedName);
      if (!parsed) {
        throw new Error(
          `Invalid qualified tool name: ${callInput.qualifiedName}`,
        );
      }

      const connection = connections.find((c) => c.id === parsed.connectionId);
      if (!connection) {
        throw new Error(`Unknown connection: ${parsed.connectionId}`);
      }

      let installationId = state?.getInstallationId(parsed.connectionId) ?? null;
      let subjectUserId: string | null = null;

      if (!installationId && ctx.accountId) {
        const installs = await listInstallScopes(connection, ctx.accountId);
        const first = installs[0];
        if (first) {
          installationId = first.installationId;
          subjectUserId = first.subjectUserId;
        }
      } else if (ctx.accountId) {
        const installs = await listInstallScopes(connection, ctx.accountId);
        const match = installs.find(
          (i) => i.installationId === installationId,
        );
        subjectUserId = match?.subjectUserId ?? installs[0]?.subjectUserId ?? null;
      }

      return input.sessionManager.callTool(
        connection,
        {
          projectId: ctx.projectId,
          accountId: ctx.accountId,
          installationId,
          userId: subjectUserId,
        },
        parsed.toolName,
        callInput.args,
      ).catch((error: unknown) => ({
        ok: false as const,
        connection: parsed.connectionId,
        tool: parsed.toolName,
        error: error instanceof Error ? error.message : String(error),
      }));
    },
  });
}

/**
 * Whether a tool's lowercased searchable text matches a tokenized query.
 *
 * `connection_search` takes a natural-language query ("slack messaging"), so the
 * original whole-phrase `haystack.includes(query)` matched almost nothing and
 * dropped every tool. We keep a tool when the query is empty or ANY whitespace
 * term appears — loose recall, since the model picks from the returned set.
 */
export function toolMatchesQuery(
  haystack: string,
  queryTerms: readonly string[],
): boolean {
  if (queryTerms.length === 0) return true;
  return queryTerms.some((term) => haystack.includes(term));
}

function buildRequestConnectionTool() {
  return tool({
    description:
      "Ask the user to connect a third-party service when a connector is not yet authorized. The chat UI renders a connect card; stop and wait for the user to connect.",
    inputSchema: z.object({
      connector: z
        .string()
        .describe(
          "Connector to request, e.g. slack, notion, github, linear, discord.",
        ),
      reason: z
        .string()
        .describe("Short, user-facing reason this connection is needed."),
    }),
    execute: async (requestInput, { experimental_context }) => {
      const ctx = getRunContext(experimental_context);
      return {
        connectionRequired: true as const,
        connector: requestInput.connector,
        reason: requestInput.reason,
        projectId: ctx.projectId,
        accountId: ctx.accountId ?? null,
      };
    },
  });
}
