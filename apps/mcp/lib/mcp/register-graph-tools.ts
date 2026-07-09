import { z } from "zod";
import { LifecycleStatusSchema } from "@ssota/contracts";
import { throwMcpToolError } from "@/lib/api/mcp-errors";
import {
  createEdgeForMcp,
  createEdgeTypeForMcp,
  createNodeForMcp,
  createNodeTypeForMcp,
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

// Catalog keys are org-scoped DB catalog entries (not a fixed enum), so any
// non-empty key is accepted at the MCP boundary. The core use-case still
// rejects keys absent from the org catalog with UNKNOWN_NODE_TYPE — author new
// types with create_node_type / create_edge_type first.
const catalogKeySchema = z.string().min(1);
const edgeCatalogKeySchema = z.string().min(1);

export function registerGraphTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_node_types",
    {
      title: "List Node Types",
      description:
        "List this project's node types from the org catalog (DB). Empty until you author types with create_node_type. For large catalogs prefer search_catalog.",
      inputSchema: {},
    },
    async ({ teamspaceId }) =>
      jsonContent(await listNodeTypesForMcp(teamspaceId)),
  );

  registerScopedProjectTool(
    server,
    "get_node_type",
    {
      title: "Get Node Type",
      description:
        "Fetch a node type's catalog entry (label, description, keywords, propertySchema) from this project's org catalog.",
      inputSchema: { catalogKey: catalogKeySchema },
    },
    async ({ teamspaceId, args }) => {
      const catalogKey = String(args.catalogKey ?? args.nodeType);
      return jsonContent(await getNodeTypeForMcp(teamspaceId, catalogKey));
    },
  );

  registerScopedProjectTool(
    server,
    "get_edge_type",
    {
      title: "Get Edge Type",
      description:
        "Fetch an edge type's catalog entry (label, description, keywords, domain/range catalog ids) from this project's org catalog.",
      inputSchema: { catalogKey: edgeCatalogKeySchema },
    },
    async ({ teamspaceId, args }) => {
      const catalogKey = String(args.catalogKey ?? args.edgeType);
      return jsonContent(await getEdgeTypeForMcp(teamspaceId, catalogKey));
    },
  );

  registerScopedProjectTool(
    server,
    "list_edge_types",
    {
      title: "List Edge Types",
      description:
        "List this project's edge types from the org catalog (DB). Empty until you author types with create_edge_type.",
      inputSchema: {},
    },
    async ({ teamspaceId }) =>
      jsonContent(await listEdgeTypesForMcp(teamspaceId)),
  );

  registerScopedProjectTool(
    server,
    "create_node_type",
    {
      title: "Create Node Type",
      description:
        "Define (or update) a node type in this project's catalog. Use during environment setup to model the domain's entities BEFORE creating node instances. Upserts by key. propertySchema is a JSON-schema-like object describing the type's properties.",
      inputSchema: {
        key: z
          .string()
          .min(1)
          .describe(
            "Stable snake_case type key, e.g. 'employee', 'leave_request'.",
          ),
        label: z.string().min(1).describe("Human-readable name."),
        description: z
          .string()
          .optional()
          .describe("One-line, search-facing description of when to use this type."),
        keywords: z
          .array(z.string())
          .optional()
          .describe("Search aliases/synonyms to improve catalog search recall."),
        propertySchema: z.record(z.unknown()).optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createNodeTypeForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "create_edge_type",
    {
      title: "Create Edge Type",
      description:
        "Define (or update) an edge type (relationship) in this project's catalog. domainKeys/rangeKeys are node-type keys constraining valid source/target types (empty = unconstrained); the node types must already exist. Upserts by key.",
      inputSchema: {
        key: z
          .string()
          .min(1)
          .describe("Stable snake_case type key, e.g. 'requests', 'approved_by'."),
        label: z.string().min(1),
        description: z
          .string()
          .optional()
          .describe("One-line, search-facing description of the relationship."),
        keywords: z.array(z.string()).optional(),
        domainKeys: z
          .array(z.string())
          .optional()
          .describe("Allowed source node-type keys (must exist)."),
        rangeKeys: z
          .array(z.string())
          .optional()
          .describe("Allowed target node-type keys (must exist)."),
        propertySchema: z.record(z.unknown()).optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createEdgeTypeForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
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
