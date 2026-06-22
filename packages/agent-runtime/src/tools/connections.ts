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
import { McpSessionManager } from "../connections/mcp-session.js";
import {
  getKnownToolsForConnection,
  inferConnectionIdFromQuery,
} from "../connections/tool-catalog.js";
import {
  toQualifiedToolName,
  parseQualifiedToolName,
} from "../connections/qualified-name.js";
import type { ConnectionSearchResult } from "../connections/connection-search-result.js";
import {
  ConnectionRunState,
  CONNECTION_SEARCH_TOOL,
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
  qualifiedToolNames: string[];
  connectionState: ConnectionRunState;
  sessionManager: McpSessionManager;
}

interface InstallScope {
  connectorUid: string;
  installationId: string | null;
  installationName: string | null;
  subjectUserId: string | null;
}

export async function createConnectionTools(
  input: CreateConnectionToolsInput,
): Promise<ConnectionToolsBundle> {
  const connections = getConfiguredConnections();
  const port = input.accountId
    ? createAccountConnectionPort(getDb())
    : null;

  const qualifiedToolNames: string[] = [];
  const tools: ToolSet = {};

  for (const connection of connections) {
    const connectorUid = resolveConnectorUid(connection.auth.provider);
    if (!connectorUid) continue;

    const installs: InstallScope[] = input.accountId
      ? (
          await port!.listConnectCredentialScopesForProvider(
            input.accountId,
            connection.id,
          )
        ).map((row: ConnectCredentialScopeRecord) => ({
          connectorUid: row.connector,
          installationId: row.installationId,
          installationName: row.installationName,
          subjectUserId: row.subjectUserId,
        }))
      : [];

    if (installs.length === 0) continue;

    // Register qualified tool shells from the static catalog only — no MCP
    // at run start. Live discovery + activation happens in connection_search.
    for (const install of installs) {
      const listings = getKnownToolsForConnection(connection);

      for (const listing of listings) {
        const qualifiedName = toQualifiedToolName(connection.id, listing.name);
        if (tools[qualifiedName]) continue;
        qualifiedToolNames.push(qualifiedName);

        tools[qualifiedName] = tool({
          description:
            listing.description ??
            `${connection.description} — ${listing.name}`,
          inputSchema: z.record(z.unknown()),
          execute: async (args, { experimental_context }) => {
            const ctx = getRunContext(experimental_context);
            const state = getConnectionRunState(experimental_context);
            const parsed = parseQualifiedToolName(qualifiedName);
            if (!parsed) {
              throw new Error(`Invalid qualified tool name: ${qualifiedName}`);
            }
            const conn = connections.find((c) => c.id === parsed.connectionId);
            if (!conn) {
              throw new Error(`Unknown connection: ${parsed.connectionId}`);
            }

            const installationId =
              state?.getInstallationId(parsed.connectionId) ??
              install.installationId;

            return input.sessionManager.callTool(
              conn,
              {
                projectId: ctx.projectId,
                accountId: ctx.accountId,
                installationId,
                userId: install.subjectUserId,
              },
              parsed.toolName,
              args as Record<string, unknown>,
            );
          },
        });
      }
    }
  }

  tools[CONNECTION_SEARCH_TOOL] = buildConnectionSearchTool(
    connections,
    input,
  );
  tools[REQUEST_CONNECTION_TOOL] = buildRequestConnectionTool();

  return {
    tools,
    qualifiedToolNames,
    connectionState: input.connectionState,
    sessionManager: input.sessionManager,
  };
}

function buildConnectionSearchTool(
  connections: McpConnectionDef[],
  input: CreateConnectionToolsInput,
) {
  return tool({
    description:
      "Discover tools across declared MCP connections. Matched tools become directly callable by their qualified name (e.g. linear__search_issues).",
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
      const port = ctx.accountId
        ? createAccountConnectionPort(getDb())
        : null;

      const query = searchInput.query.trim().toLowerCase();
      const connectionFilter =
        searchInput.connection ?? inferConnectionIdFromQuery(query);
      const result: ConnectionSearchResult = { connections: [], tools: [] };

      for (const connection of connections) {
        if (connectionFilter && connectionFilter !== connection.id) {
          continue;
        }

        const connectorUid = resolveConnectorUid(connection.auth.provider);
        const installs: InstallScope[] =
          ctx.accountId && port
            ? (
                await port.listConnectCredentialScopesForProvider(
                  ctx.accountId,
                  connection.id,
                )
              ).map((row: ConnectCredentialScopeRecord) => ({
                connectorUid: row.connector,
                installationId: row.installationId,
                installationName: row.installationName,
                subjectUserId: row.subjectUserId,
              }))
            : [];

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
          const connected = provider
            ? (await provider.getToken(install.connectorUid, {
                projectId: ctx.projectId,
                accountId: ctx.accountId,
                installationId: install.installationId ?? undefined,
                userId: install.subjectUserId ?? undefined,
              })) !== null
            : false;

          result.connections.push({
            connection: connection.id,
            description: connection.description,
            connected,
            installationId: install.installationId,
            installationName: install.installationName,
            connectorUid: install.connectorUid,
          });

          if (!connected) continue;

          let listings: Awaited<ReturnType<McpSessionManager["listTools"]>> = [];
          try {
            listings = await input.sessionManager.listTools(connection, {
              projectId: ctx.projectId,
              accountId: ctx.accountId,
              installationId: install.installationId,
              userId: install.subjectUserId,
            });
          } catch (error) {
            console.warn(
              `[connection_search] listTools failed for ${connection.id}:`,
              error instanceof Error ? error.message : error,
            );
          }

          for (const listing of listings) {
            const qualifiedName = toQualifiedToolName(
              connection.id,
              listing.name,
            );
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

            if (query && !haystack.includes(query)) continue;

            result.tools.push({
              qualifiedName,
              connection: connection.id,
              tool: listing.name,
              description: listing.description ?? listing.name,
              installationId: install.installationId,
              installationName: install.installationName,
            });
          }
        }
      }

      state?.activateFromSearch(result.tools);
      return result;
    },
  });
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
