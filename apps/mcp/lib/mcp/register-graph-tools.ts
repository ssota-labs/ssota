import { z } from "zod";
import { LifecycleStatusSchema, nodeTypeSchema } from "@ssota/contracts";
import { edgeTypeSchema } from "@ssota/contracts";
import { throwMcpToolError } from "@/lib/api/mcp-errors";
import {
  createEdgeForMcp,
  createNodeForMcp,
  getEdgeTypeForMcp,
  getNodeForMcp,
  getNodeTypeForMcp,
  listEdgeTypesForMcp,
  listNodeTypesForMcp,
  queryNodesForMcp,
  searchCatalogForMcp,
  traverseEdgesForMcp,
  updateNodeForMcp,
} from "@/lib/api/graph-services";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { jsonContent } from "@/lib/mcp/json-content";
import { registerScopedProjectTool } from "@/lib/mcp/register-scoped-tool";

type McpToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    handler: (
      args: Record<string, unknown>,
      extra: { authInfo?: AuthInfo },
    ) => Promise<unknown>,
  ) => void;
};

const catalogKeySchema = nodeTypeSchema;
const edgeCatalogKeySchema = edgeTypeSchema;

export function registerGraphTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_node_types",
    {
      title: "List Node Types",
      description:
        "List catalog node types from packages/contracts (no database round-trip).",
      inputSchema: {},
    },
    async () => jsonContent(await listNodeTypesForMcp()),
  );

  registerScopedProjectTool(
    server,
    "get_node_type",
    {
      title: "Get Node Type",
      description:
        "Fetch a node type catalog entry and property schema summary (contracts SSOT).",
      inputSchema: { catalogKey: catalogKeySchema },
    },
    async ({ args }) => {
      const catalogKey = String(args.catalogKey ?? args.nodeType);
      return jsonContent(getNodeTypeForMcp(catalogKey));
    },
  );

  registerScopedProjectTool(
    server,
    "get_edge_type",
    {
      title: "Get Edge Type",
      description:
        "Fetch an edge type catalog entry (label, description, keywords) from the contracts SSOT.",
      inputSchema: { catalogKey: edgeCatalogKeySchema },
    },
    async ({ args }) => {
      const catalogKey = String(args.catalogKey ?? args.edgeType);
      return jsonContent(getEdgeTypeForMcp(catalogKey));
    },
  );

  registerScopedProjectTool(
    server,
    "list_edge_types",
    {
      title: "List Edge Types",
      description:
        "List catalog edge types from packages/contracts (no database round-trip).",
      inputSchema: {},
    },
    async () => jsonContent(listEdgeTypesForMcp()),
  );

  registerScopedProjectTool(
    server,
    "search_catalog",
    {
      title: "Search Catalog",
      description:
        "Search the project's type catalog (node + edge types) by keyword. Returns lightweight hits {kind,key,label,snippet,score}; fetch detail with get_node_type / get_edge_type. Prefer over list_node_types when you only need types matching an intent.",
      inputSchema: {
        query: z.string().min(1),
        kind: z.enum(["node", "edge"]).optional(),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async ({ teamspaceId, args }) =>
      jsonContent(await searchCatalogForMcp(teamspaceId, args)),
  );

  registerScopedProjectTool(
    server,
    "query_nodes",
    {
      title: "Query Nodes",
      description:
        "Query graph nodes in the current project with optional catalogKey and lifecycle filters.",
      inputSchema: {
        catalogKey: catalogKeySchema.optional(),
        lifecycleStatus: LifecycleStatusSchema.optional(),
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async ({ teamspaceId, args }) =>
      jsonContent(await queryNodesForMcp(teamspaceId, args)),
  );

  registerScopedProjectTool(
    server,
    "get_node",
    {
      title: "Get Node",
      description: "Fetch one graph node by id in the current project.",
      inputSchema: { nodeId: z.string().uuid() },
    },
    async ({ teamspaceId, args }) =>
      jsonContent(await getNodeForMcp(teamspaceId, args)),
  );

  registerScopedProjectTool(
    server,
    "traverse_edges",
    {
      title: "Traverse Edges",
      description:
        "Traverse edges from a node (alias for traverse_graph semantics). Supports direction and catalogKey filters.",
      inputSchema: {
        nodeId: z.string().uuid(),
        direction: z.enum(["outgoing", "incoming", "both"]).optional(),
        catalogKey: edgeCatalogKeySchema.optional(),
      },
    },
    async ({ teamspaceId, args }) =>
      jsonContent(await traverseEdgesForMcp(teamspaceId, args)),
  );

  registerScopedProjectTool(
    server,
    "create_node",
    {
      title: "Create Node",
      description:
        "Create a graph node in the current project. Validates catalogKey and properties against the catalog.",
      inputSchema: {
        catalogKey: catalogKeySchema,
        title: z.string().min(1),
        properties: z.record(z.unknown()).optional(),
        content: z.string().nullable().optional(),
        lifecycleStatus: LifecycleStatusSchema.optional(),
        initiativeId: z.string().uuid().optional(),
        releaseId: z.string().uuid().optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createNodeForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "update_node",
    {
      title: "Update Node",
      description:
        "Patch a graph node (title, properties, content, lifecycleStatus) in the current project.",
      inputSchema: {
        nodeId: z.string().uuid(),
        title: z.string().min(1).optional(),
        properties: z.record(z.unknown()).optional(),
        content: z.string().nullable().optional(),
        lifecycleStatus: LifecycleStatusSchema.optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await updateNodeForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "create_edge",
    {
      title: "Create Edge",
      description:
        "Connect two nodes with a typed edge in the current project.",
      inputSchema: {
        catalogKey: edgeCatalogKeySchema,
        sourceNodeId: z.string().uuid(),
        targetNodeId: z.string().uuid(),
        properties: z.record(z.unknown()).optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createEdgeForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );
}
