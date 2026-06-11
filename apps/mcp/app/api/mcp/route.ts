import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import {
  ExecuteActionClientInputSchema,
  FindInstructionInputSchema,
  GetActionLogEntryInputSchema,
  GetActionLogInputSchema,
  GetArchetypeInputSchema,
  GetEdgeTypeInputSchema,
  GetGateInputSchema,
  GetInstructionInputSchema,
  GetNodeInputSchema,
  GetNodeTypeInputSchema,
  GetPropertyInputSchema,
  QueryGatesInputSchema,
  QueryNeighborsInputSchema,
  QueryNodesInputSchema,
  SubmitForApprovalInputSchema,
  TraverseEdgesInputSchema,
  TraverseGraphInputSchema,
} from "@ssota/contracts";
import {
  executeActionForClient,
  findInstructions,
  getActionContract,
  getActionLog,
  getActionLogEntry,
  getArchetype,
  getEdgeType,
  getGate,
  getInstruction,
  getNode,
  getNodeType,
  getProperty,
  listActionContracts,
  listArchetypes,
  listEdgeTypes,
  listNodeTypes,
  listPendingGates,
  listProperties,
  queryGates,
  queryNeighborsService,
  queryNodes,
  submitForApproval,
  traverseEdges,
  traverseGraphService,
} from "@/lib/api/services";
import { verifyBearerToken } from "@/lib/auth";
import { resolveProjectId } from "@/lib/project-context";
import { resolveSubjectId } from "@/lib/subject-context";

function jsonContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_node_types",
      {
        title: "List Node Types",
        description:
          "Discover: list node type catalog index. Fetch details with get_node_type.",
        inputSchema: {},
      },
      async (_args, extra) => jsonContent(await listNodeTypes(requireProjectFromExtra(extra))),
    );

    server.registerTool(
      "list_edge_types",
      {
        title: "List Edge Types",
        description:
          "Discover: list edge type catalog index. Fetch details with get_edge_type.",
        inputSchema: {},
      },
      async (_args, extra) => jsonContent(await listEdgeTypes(requireProjectFromExtra(extra))),
    );

    server.registerTool(
      "list_properties",
      {
        title: "List Properties",
        description:
          "Discover: list property catalog index. Fetch details with get_property.",
        inputSchema: {},
      },
      async (_args, extra) => jsonContent(await listProperties(requireProjectFromExtra(extra))),
    );

    server.registerTool(
      "list_action_contracts",
      {
        title: "List Action Contracts",
        description:
          "Discover: list action contract index. Fetch details with get_action_contract.",
        inputSchema: {},
      },
      async (_args, extra) => jsonContent(await listActionContracts(requireProjectFromExtra(extra))),
    );

    server.registerTool(
      "list_archetypes",
      {
        title: "List Archetypes",
        description:
          "Discover: list archetype index. Fetch details with get_archetype.",
        inputSchema: {},
      },
      async (_args, extra) => jsonContent(await listArchetypes(requireProjectFromExtra(extra))),
    );

    server.registerTool(
      "get_action_contract",
      {
        title: "Get Action Contract",
        description: "Get action contract from catalog",
        inputSchema: { actionType: z.string() },
      },
      async ({ actionType }, extra) => jsonContent(await getActionContract(requireProjectFromExtra(extra), actionType)),
    );

    server.registerTool(
      "get_node_type",
      {
        title: "Get Node Type",
        description: "Fetch one node type catalog entry by nodeType",
        inputSchema: { nodeType: z.string().min(1) },
      },
      async (args, extra) => {
        const parsed = GetNodeTypeInputSchema.parse(args);
        return jsonContent(await getNodeType(requireProjectFromExtra(extra), parsed.nodeType));
      },
    );

    server.registerTool(
      "get_edge_type",
      {
        title: "Get Edge Type",
        description: "Fetch one edge type catalog entry by edgeType",
        inputSchema: { edgeType: z.string().min(1) },
      },
      async (args, extra) => {
        const parsed = GetEdgeTypeInputSchema.parse(args);
        return jsonContent(await getEdgeType(requireProjectFromExtra(extra), parsed.edgeType));
      },
    );

    server.registerTool(
      "get_property",
      {
        title: "Get Property",
        description: "Fetch one property catalog entry by propertyKey",
        inputSchema: { propertyKey: z.string().min(1) },
      },
      async (args, extra) => {
        const parsed = GetPropertyInputSchema.parse(args);
        return jsonContent(await getProperty(requireProjectFromExtra(extra), parsed.propertyKey));
      },
    );

    server.registerTool(
      "get_archetype",
      {
        title: "Get Archetype",
        description: "Fetch one archetype by archetypeId",
        inputSchema: { archetypeId: z.string().min(1) },
      },
      async (args, extra) => {
        const parsed = GetArchetypeInputSchema.parse(args);
        return jsonContent(await getArchetype(requireProjectFromExtra(extra), parsed.archetypeId));
      },
    );

    server.registerTool(
      "get_node",
      {
        title: "Get Node",
        description: "Fetch one graph node by nodeId",
        inputSchema: { nodeId: z.string().uuid() },
      },
      async (args, extra) => {
        const parsed = GetNodeInputSchema.parse(args);
        return jsonContent(await getNode(requireProjectFromExtra(extra), parsed.nodeId));
      },
    );

    server.registerTool(
      "get_instruction",
      {
        title: "Get Instruction",
        description: "Fetch one domain instruction by instructionId",
        inputSchema: { instructionId: z.string().uuid() },
      },
      async (args, extra) => {
        const parsed = GetInstructionInputSchema.parse(args);
        return jsonContent(await getInstruction(requireProjectFromExtra(extra), parsed.instructionId));
      },
    );

    server.registerTool(
      "get_gate",
      {
        title: "Get Gate",
        description: "Fetch one gate by gateId",
        inputSchema: { gateId: z.string().uuid() },
      },
      async (args, extra) => {
        const parsed = GetGateInputSchema.parse(args);
        return jsonContent(await getGate(requireProjectFromExtra(extra), parsed.gateId));
      },
    );

    server.registerTool(
      "query_nodes",
      {
        title: "Query Nodes",
        description: "Query nodes by type and lifecycle status",
        inputSchema: {
          nodeType: z.string().optional(),
          lifecycleStatus: z
            .enum(["Draft", "Active", "Archived", "Deleted"])
            .optional(),
          limit: z.number().int().positive().max(100).optional(),
          offset: z.number().int().nonnegative().optional(),
        },
      },
      async (args, extra) => {
        const subjectId = readSubjectFromExtra(extra);
        const parsed = QueryNodesInputSchema.parse({ ...args, subjectId });
        return jsonContent(await queryNodes(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "traverse_edges",
      {
        title: "Traverse Edges",
        description:
          "Query: list 1-hop edges from a node. For neighbor nodes use query_neighbors; for multi-hop use traverse_graph.",
        inputSchema: {
          nodeId: z.string().uuid(),
          direction: z.enum(["outgoing", "incoming", "both"]).optional(),
          edgeType: z.string().optional(),
        },
      },
      async (args, extra) => {
        const subjectId = readSubjectFromExtra(extra);
        const parsed = TraverseEdgesInputSchema.parse({ ...args, subjectId });
        return jsonContent(await traverseEdges(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "query_neighbors",
      {
        title: "Query Neighbors",
        description:
          "Query: 1-hop neighbors with edges and resolved neighbor nodes",
        inputSchema: {
          nodeId: z.string().uuid(),
          direction: z.enum(["outgoing", "incoming", "both"]).optional(),
          edgeType: z.string().optional(),
        },
      },
      async (args, extra) => {
        const parsed = QueryNeighborsInputSchema.parse(args);
        return jsonContent(await queryNeighborsService(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "traverse_graph",
      {
        title: "Traverse Graph",
        description:
          "Query: multi-hop graph traversal from a start node with optional edge and node type filters",
        inputSchema: {
          startNodeId: z.string().uuid(),
          maxHops: z.number().int().positive().max(5).optional(),
          direction: z.enum(["outgoing", "incoming", "both"]).optional(),
          edgeTypes: z.array(z.string()).optional(),
          nodeTypes: z.array(z.string()).optional(),
          limit: z.number().int().positive().max(100).optional(),
        },
      },
      async (args, extra) => {
        const parsed = TraverseGraphInputSchema.parse(args);
        return jsonContent(await traverseGraphService(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "find_instruction",
      {
        title: "Find Instruction",
        description: "Search instructions by query",
        inputSchema: {
          query: z.string().min(1),
          nodeType: z.string().optional(),
          limit: z.number().int().positive().max(20).optional(),
        },
      },
      async (args, extra) => {
        const parsed = FindInstructionInputSchema.parse(args);
        return jsonContent(await findInstructions(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "execute_action",
      {
        title: "Execute Action",
        description: "Execute an action (the only write path)",
        inputSchema: {
          actionType: z.string(),
          input: z.record(z.unknown()).optional(),
          idempotencyKey: z.string().optional(),
        },
      },
      async (args, extra) => {
        const user = extra?.authInfo?.extra?.user as
          | { id: string }
          | undefined;
        if (!user?.id) {
          return {
            content: [{ type: "text", text: "Unauthorized" }],
            isError: true,
          };
        }

        const subjectId = readSubjectFromExtra(extra);
        const parsed = ExecuteActionClientInputSchema.parse({
          actionType: args.actionType,
          input: args.input ?? {},
          idempotencyKey: args.idempotencyKey,
        });

        const projectId = requireProjectFromExtra(extra);
        const result = await executeActionForClient(
          projectId,
          parsed,
          user.id,
          "Agent",
          subjectId,
        );
        return jsonContent(result);
      },
    );

    server.registerTool(
      "list_pending_gates",
      {
        title: "List Pending Gates",
        description:
          "Discover: list pending gates only. Query with filters via query_gates.",
        inputSchema: {},
      },
      async (_args, extra) => jsonContent(await listPendingGates(requireProjectFromExtra(extra))),
    );

    server.registerTool(
      "query_gates",
      {
        title: "Query Gates",
        description: "Query gates with optional status filter and pagination",
        inputSchema: {
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          limit: z.number().int().positive().max(100).optional(),
          offset: z.number().int().nonnegative().optional(),
        },
      },
      async (args, extra) => {
        const parsed = QueryGatesInputSchema.parse(args);
        return jsonContent(await queryGates(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "submit_for_approval",
      {
        title: "Submit For Approval",
        description: "Submit a gate for human approval",
        inputSchema: {
          gateId: z.string().uuid(),
          note: z.string().optional(),
        },
      },
      async (args, extra) => {
        const parsed = SubmitForApprovalInputSchema.parse(args);
        return jsonContent(await submitForApproval(requireProjectFromExtra(extra), parsed.gateId, parsed.note));
      },
    );

    server.registerTool(
      "get_action_log",
      {
        title: "Get Action Log",
        description: "Get action log entries",
        inputSchema: {
          limit: z.number().int().positive().max(100).optional(),
          offset: z.number().int().nonnegative().optional(),
          actionType: z.string().optional(),
        },
      },
      async (args, extra) => {
        const parsed = GetActionLogInputSchema.parse(args);
        return jsonContent(await getActionLog(requireProjectFromExtra(extra), parsed));
      },
    );

    server.registerTool(
      "get_action_log_entry",
      {
        title: "Get Action Log Entry",
        description: "Fetch one action log entry by logId or idempotencyKey",
        inputSchema: {
          logId: z.string().uuid().optional(),
          idempotencyKey: z.string().min(1).optional(),
        },
      },
      async (args, extra) => {
        const parsed = GetActionLogEntryInputSchema.parse(args);
        return jsonContent(await getActionLogEntry(requireProjectFromExtra(extra), parsed));
      },
    );
  },
  {
    serverInfo: { name: "ssota-mcp", version: "0.1.0" },
  },
  {
    basePath: "/api",
    verboseLogs: process.env.NODE_ENV === "development",
  },
);

function readSubjectFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): string | undefined {
  const subjectId = extra?.authInfo?.extra?.subjectId;
  return typeof subjectId === "string" && subjectId.length > 0
    ? subjectId
    : undefined;
}

function requireProjectFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): string {
  const projectId = extra?.authInfo?.extra?.projectId;
  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error("X-SSOTA-Project-Id header is required");
  }
  return projectId;
}

async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const user = await verifyBearerToken(
    bearerToken ? `Bearer ${bearerToken}` : null,
  );
  if (!user) return undefined;

  const projectId = resolveProjectId(req);
  if (!projectId) return undefined;

  let subjectId: string | undefined;
  try {
    subjectId = resolveSubjectId(req);
  } catch {
    return undefined;
  }

  return {
    token: bearerToken ?? "",
    clientId: user.id,
    scopes: ["openid"],
    extra: { user, subjectId, projectId },
  };
}

// withMcpAuth uses resourceUrl as the public *origin* when building the
// WWW-Authenticate resource_metadata link — not the full MCP resource path.
const mcpPublicOrigin = new URL(
  process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
).origin;

const authHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
  resourceUrl: mcpPublicOrigin,
});

export { authHandler as GET, authHandler as POST };
