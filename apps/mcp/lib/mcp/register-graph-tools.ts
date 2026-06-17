import { z } from "zod";
import { LifecycleStatusSchema, nodeTypeSchema } from "@ssota/contracts";
import { edgeTypeSchema } from "@ssota/contracts";
import { throwMcpToolError } from "@/lib/api/mcp-errors";
import {
  createEdgeForMcp,
  createNodeForMcp,
  getNodeForMcp,
  getNodeTypeForMcp,
  listEdgeTypesForMcp,
  listNodeTypesForMcp,
  queryNodesForMcp,
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
    async () => jsonContent(listNodeTypesForMcp()),
  );

  registerScopedProjectTool(
    server,
    "get_node_type",
    {
      title: "Get Node Type",
      description:
        "Fetch a node type catalog entry and property schema summary (contracts SSOT).",
      inputSchema: { nodeType: nodeTypeSchema },
    },
    async ({ args }) => {
      const nodeType = String(args.nodeType);
      return jsonContent(getNodeTypeForMcp(nodeType));
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
    "query_nodes",
    {
      title: "Query Nodes",
      description:
        "Query graph nodes in the current project with optional nodeType and lifecycle filters.",
      inputSchema: {
        nodeType: nodeTypeSchema.optional(),
        lifecycleStatus: LifecycleStatusSchema.optional(),
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async ({ projectId, args }) =>
      jsonContent(await queryNodesForMcp(projectId, args)),
  );

  registerScopedProjectTool(
    server,
    "get_node",
    {
      title: "Get Node",
      description: "Fetch one graph node by id in the current project.",
      inputSchema: { nodeId: z.string().uuid() },
    },
    async ({ projectId, args }) =>
      jsonContent(await getNodeForMcp(projectId, args)),
  );

  registerScopedProjectTool(
    server,
    "traverse_edges",
    {
      title: "Traverse Edges",
      description:
        "Traverse edges from a node (alias for traverse_graph semantics). Supports direction and edgeType filters.",
      inputSchema: {
        nodeId: z.string().uuid(),
        direction: z.enum(["outgoing", "incoming", "both"]).optional(),
        edgeType: edgeTypeSchema.optional(),
      },
    },
    async ({ projectId, args }) =>
      jsonContent(await traverseEdgesForMcp(projectId, args)),
  );

  registerScopedProjectTool(
    server,
    "create_node",
    {
      title: "Create Node",
      description:
        "Create a graph node in the current project. Validates nodeType and properties against the catalog.",
      inputSchema: {
        nodeType: nodeTypeSchema,
        title: z.string().min(1),
        properties: z.record(z.unknown()).optional(),
        content: z.string().nullable().optional(),
        lifecycleStatus: LifecycleStatusSchema.optional(),
        initiativeId: z.string().uuid().optional(),
        releaseId: z.string().uuid().optional(),
      },
    },
    async ({ projectId, args }) => {
      try {
        return jsonContent(await createNodeForMcp(projectId, args));
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
    async ({ projectId, args }) => {
      try {
        return jsonContent(await updateNodeForMcp(projectId, args));
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
        edgeType: edgeTypeSchema,
        sourceNodeId: z.string().uuid(),
        targetNodeId: z.string().uuid(),
        properties: z.record(z.unknown()).optional(),
      },
    },
    async ({ projectId, args }) => {
      try {
        return jsonContent(await createEdgeForMcp(projectId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );
}
