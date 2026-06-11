import {
  createMcpHandler,
  protectedResourceHandler,
  withMcpAuth,
} from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { executeAction } from "@loopos/core";
import {
  ExecuteActionInputSchema,
  FindInstructionInputSchema,
  GetActionLogInputSchema,
  QueryNodesInputSchema,
  SubmitForApprovalInputSchema,
  TraverseEdgesInputSchema,
} from "@loopos/contracts";
import { verifyBearerToken } from "@/lib/auth";
import { getActionPorts } from "@/lib/ports";
import { resolveSubjectId } from "@/lib/subject-context";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_node_types",
      {
        title: "List Node Types",
        description: "List all node types from the catalog",
        inputSchema: {},
      },
      async () => {
        const ports = getActionPorts();
        const entries = await ports.catalog.listNodeCatalogEntries();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );

    server.registerTool(
      "list_edge_types",
      {
        title: "List Edge Types",
        description: "List all edge types from the catalog",
        inputSchema: {},
      },
      async () => {
        const ports = getActionPorts();
        const entries = await ports.catalog.listEdgeCatalogEntries();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );

    server.registerTool(
      "list_properties",
      {
        title: "List Properties",
        description: "List all properties from the catalog",
        inputSchema: {},
      },
      async () => {
        const ports = getActionPorts();
        const entries = await ports.catalog.listPropertyCatalogEntries();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );

    server.registerTool(
      "list_action_contracts",
      {
        title: "List Action Contracts",
        description: "List all action contracts from the catalog",
        inputSchema: {},
      },
      async () => {
        const ports = getActionPorts();
        const entries = await ports.catalog.listActionCatalogEntries();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );

    server.registerTool(
      "list_archetypes",
      {
        title: "List Archetypes",
        description: "List all archetypes from the catalog",
        inputSchema: {},
      },
      async () => {
        const ports = getActionPorts();
        const entries = await ports.catalog.listArchetypes();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
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
      async ({ actionType }) => {
        const ports = getActionPorts();
        const entry = await ports.catalog.getActionCatalogEntry(actionType);
        return {
          content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
        };
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
        const parsed = QueryNodesInputSchema.parse({
          ...args,
          subjectId,
        });
        const ports = getActionPorts();
        const nodes = await ports.graph.queryNodes(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(nodes, null, 2) }],
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
      async (args, extra) => {
        const subjectId = readSubjectFromExtra(extra);
        const parsed = TraverseEdgesInputSchema.parse({
          ...args,
          subjectId,
        });
        const ports = getActionPorts();
        const edges = await ports.graph.traverseEdges(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(edges, null, 2) }],
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
        const ports = getActionPorts();
        const instructions = await ports.catalog.findInstructions(
          parsed.query,
          parsed.nodeType,
          parsed.limit,
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(instructions, null, 2) },
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

        const subjectId = readSubjectFromExtra(extra);
        const parsed = ExecuteActionInputSchema.parse({
          actionType: args.actionType,
          input: args.input ?? {},
          executorId: user.id,
          executorType: "Agent",
          idempotencyKey: args.idempotencyKey,
          subjectId,
        });

        const ports = getActionPorts();
        const result = await executeAction(ports, parsed);
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
      async () => {
        const ports = getActionPorts();
        const gates = await ports.gate.listPendingGates();
        return {
          content: [{ type: "text", text: JSON.stringify(gates, null, 2) }],
        };
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
      async (args) => {
        const parsed = SubmitForApprovalInputSchema.parse(args);
        const ports = getActionPorts();
        const gate = await ports.gate.getGate(parsed.gateId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { message: "Gate submitted for human review", gate },
                null,
                2,
              ),
            },
          ],
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
        const ports = getActionPorts();
        const log = await ports.commit.getActionLog(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(log, null, 2) }],
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

function readSubjectFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): string | undefined {
  const subjectId = extra?.authInfo?.extra?.subjectId;
  return typeof subjectId === "string" && subjectId.length > 0
    ? subjectId
    : undefined;
}

async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const user = await verifyBearerToken(
    bearerToken ? `Bearer ${bearerToken}` : null,
  );
  if (!user) return undefined;

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
    extra: { user, subjectId },
  };
}

const authHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
  resourceUrl: process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
});

export { authHandler as GET, authHandler as POST };
