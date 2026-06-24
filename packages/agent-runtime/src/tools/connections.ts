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
  rankToolsForQuery,
  type ToolSearchCandidate,
} from "../connections/tool-search.js";
import type { CompactArgsSchema } from "../connections/mcp-tool-schema.js";
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
  argsSchema?: CompactArgsSchema;
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
): Promise<{
  result: ConnectionSearchResult;
  internalHits: SearchHitInternal[];
  rankedScores: Array<{ qualifiedName: string; score: number }>;
}> {
  const query = input.query.trim();
  const connectionFilter =
    input.connection ?? inferConnectionIdFromQuery(query.toLowerCase());

  const result: ConnectionSearchResult = { connections: [], matched: [], errors: [] };
  const candidates: ToolSearchCandidate[] = [];

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
        candidates.push({
          qualifiedName: toQualifiedToolName(connection.id, listing.name),
          connection: connection.id,
          tool: listing.name,
          description: listing.description ?? "",
          connectionDescription: connection.description,
          installationName: install.installationName ?? "",
          installationId: install.installationId,
          argsSchema: listing.inputSchema as CompactArgsSchema | undefined,
        });
      }
    }
  }

  const ranked = rankToolsForQuery(candidates, query);
  const internalHits: SearchHitInternal[] = ranked.map((hit) => ({
    qualifiedName: hit.qualifiedName,
    connection: hit.connection,
    tool: hit.tool,
    installationId: hit.installationId,
    installationName: hit.installationName,
    argsSchema: hit.argsSchema,
  }));
  result.matched = ranked.map((hit) => ({
    qualifiedName: hit.qualifiedName,
    connection: hit.connection,
    tool: hit.tool,
    ...(hit.argsSchema ? { argsSchema: hit.argsSchema } : {}),
  }));

  if (result.errors?.length === 0) {
    delete result.errors;
  }

  return { result, internalHits, rankedScores: ranked.map((t) => ({
    qualifiedName: t.qualifiedName,
    score: t.score,
  })) };
}

function buildConnectionSearchTool(
  connections: McpConnectionDef[],
  input: CreateConnectionToolsInput,
) {
  return tool({
    description:
      "Discover MCP tools for connected third-party services. Pass a natural-language query; matched tools are invoked with connection_call (qualifiedName + args). Returns matched tool names and compact argsSchema hints. Call once per user request or new capability — reuse prior results in the same conversation.",
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

      const { result, internalHits, rankedScores } = await runConnectionSearch(
        connections,
        {
          query: searchInput.query,
          connection: searchInput.connection,
          projectId: ctx.projectId,
          accountId: ctx.accountId,
          credentials: provider ?? input.credentials,
          sessionManager: input.sessionManager,
        },
      );

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
          scores: rankedScores,
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
      "Invoke an MCP tool by qualifiedName (e.g. slack__slack_send_message). Reuse qualifiedName from an earlier connection_search in this conversation. Pass args using the exact parameter names from argsSchema (e.g. channel_id and text for Slack messages).",
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
        {
          argsSchema: state?.getArgsSchema(callInput.qualifiedName),
        },
      ).catch((error: unknown) => ({
        ok: false as const,
        connection: parsed.connectionId,
        tool: parsed.toolName,
        error: error instanceof Error ? error.message : String(error),
      }));
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
