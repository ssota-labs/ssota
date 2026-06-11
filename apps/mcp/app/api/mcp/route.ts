import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import {
  ExecuteActionClientInputSchema,
  FindInstructionInputSchema,
  GetActionLogInputSchema,
  QueryNodesInputSchema,
  SubmitForApprovalInputSchema,
  TraverseEdgesInputSchema,
} from "@loopos/contracts";
import {
  executeActionForClient,
  findInstructions,
  getActionContract,
  getActionLog,
  listActionContracts,
  listArchetypes,
  listEdgeTypes,
  listNodeTypes,
  listPendingGates,
  listProperties,
  queryNodes,
  submitForApproval,
  traverseEdges,
} from "@/lib/api/services";
import { verifyBearerToken } from "@/lib/auth";

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_node_types",
      {
        title: "List Node Types",
        description: "List all node types from the catalog",
        inputSchema: {},
      },
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(await listNodeTypes(), null, 2) },
        ],
      }),
    );

    server.registerTool(
      "list_edge_types",
      {
        title: "List Edge Types",
        description: "List all edge types from the catalog",
        inputSchema: {},
      },
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(await listEdgeTypes(), null, 2) },
        ],
      }),
    );

    server.registerTool(
      "list_properties",
      {
        title: "List Properties",
        description: "List all properties from the catalog",
        inputSchema: {},
      },
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(await listProperties(), null, 2) },
        ],
      }),
    );

    server.registerTool(
      "list_action_contracts",
      {
        title: "List Action Contracts",
        description: "List all action contracts from the catalog",
        inputSchema: {},
      },
      async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(await listActionContracts(), null, 2),
          },
        ],
      }),
    );

    server.registerTool(
      "list_archetypes",
      {
        title: "List Archetypes",
        description: "List all archetypes from the catalog",
        inputSchema: {},
      },
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(await listArchetypes(), null, 2) },
        ],
      }),
    );

    server.registerTool(
      "get_action_contract",
      {
        title: "Get Action Contract",
        description: "Get action contract from catalog",
        inputSchema: {
          actionType: z.string(),
        },
      },
      async ({ actionType }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(await getActionContract(actionType), null, 2),
          },
        ],
      }),
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
      async (args) => {
        const parsed = QueryNodesInputSchema.parse(args);
        return {
          content: [
            { type: "text", text: JSON.stringify(await queryNodes(parsed), null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "traverse_edges",
      {
        title: "Traverse Edges",
        description: "Traverse edges from a node",
        inputSchema: {
          nodeId: z.string().uuid(),
          direction: z.enum(["outgoing", "incoming", "both"]).optional(),
          edgeType: z.string().optional(),
        },
      },
      async (args) => {
        const parsed = TraverseEdgesInputSchema.parse(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await traverseEdges(parsed), null, 2),
            },
          ],
        };
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
      async (args) => {
        const parsed = FindInstructionInputSchema.parse(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await findInstructions(parsed), null, 2),
            },
          ],
        };
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

        const parsed = ExecuteActionClientInputSchema.parse({
          actionType: args.actionType,
          input: args.input ?? {},
          idempotencyKey: args.idempotencyKey,
        });

        const result = await executeActionForClient(
          parsed,
          user.id,
          "Agent",
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.registerTool(
      "list_pending_gates",
      {
        title: "List Pending Gates",
        description: "List pending human gates",
        inputSchema: {},
      },
      async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(await listPendingGates(), null, 2),
          },
        ],
      }),
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
      async (args) => {
        const parsed = SubmitForApprovalInputSchema.parse(args);
        const result = await submitForApproval(parsed.gateId, parsed.note);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
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
      async (args) => {
        const parsed = GetActionLogInputSchema.parse(args);
        return {
          content: [
            { type: "text", text: JSON.stringify(await getActionLog(parsed), null, 2) },
          ],
        };
      },
    );
  },
  {
    serverInfo: { name: "loopos-mcp", version: "0.1.0" },
  },
  {
    basePath: "/api",
    verboseLogs: process.env.NODE_ENV === "development",
  },
);

async function verifyToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const user = await verifyBearerToken(
    bearerToken ? `Bearer ${bearerToken}` : null,
  );
  if (!user) return undefined;

  return {
    token: bearerToken ?? "",
    clientId: user.id,
    scopes: ["openid"],
    extra: { user },
  };
}

const authHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
  resourceUrl: process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
});

export { authHandler as GET, authHandler as POST };
