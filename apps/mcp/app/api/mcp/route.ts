import { createMcpHandler } from "mcp-handler";
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

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "list_node_types",
      "List all node types from the catalog",
      {},
      async () => {
        const ports = getActionPorts();
        const entries = await ports.catalog.listNodeCatalogEntries();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );

    server.tool(
      "get_action_contract",
      "Get action contract from catalog",
      {
        actionType: { type: "string", description: "Action type name" },
      },
      async ({ actionType }) => {
        const ports = getActionPorts();
        const entry = await ports.catalog.getActionCatalogEntry(
          actionType as string,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
        };
      },
    );

    server.tool(
      "query_nodes",
      "Query nodes by type and lifecycle status",
      {
        nodeType: { type: "string", description: "Filter by node type" },
        lifecycleStatus: {
          type: "string",
          description: "Filter by lifecycle status",
        },
        limit: { type: "number", description: "Max results" },
        offset: { type: "number", description: "Offset" },
      },
      async (args) => {
        const parsed = QueryNodesInputSchema.parse(args);
        const ports = getActionPorts();
        const nodes = await ports.graph.queryNodes(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(nodes, null, 2) }],
        };
      },
    );

    server.tool(
      "traverse_edges",
      "Traverse edges from a node",
      {
        nodeId: { type: "string", description: "Source node ID" },
        direction: {
          type: "string",
          description: "outgoing | incoming | both",
        },
        edgeType: { type: "string", description: "Filter by edge type" },
      },
      async (args) => {
        const parsed = TraverseEdgesInputSchema.parse(args);
        const ports = getActionPorts();
        const edges = await ports.graph.traverseEdges(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(edges, null, 2) }],
        };
      },
    );

    server.tool(
      "find_instruction",
      "Search instructions by query",
      {
        query: { type: "string", description: "Search query" },
        nodeType: { type: "string", description: "Filter by node type" },
        limit: { type: "number", description: "Max results" },
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

    server.tool(
      "execute_action",
      "Execute an action (the only write path)",
      {
        actionType: { type: "string", description: "Action type" },
        input: { type: "object", description: "Action input payload" },
        idempotencyKey: {
          type: "string",
          description: "Optional idempotency key",
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

        const parsed = ExecuteActionInputSchema.parse({
          actionType: args.actionType,
          input: args.input ?? {},
          executorId: user.id,
          executorType: "Agent",
          idempotencyKey: args.idempotencyKey,
        });

        const ports = getActionPorts();
        const result = await executeAction(ports, parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      "list_pending_gates",
      "List pending human gates",
      {},
      async () => {
        const ports = getActionPorts();
        const gates = await ports.gate.listPendingGates();
        return {
          content: [{ type: "text", text: JSON.stringify(gates, null, 2) }],
        };
      },
    );

    server.tool(
      "submit_for_approval",
      "Submit a gate for human approval (alias for approve_gate flow)",
      {
        gateId: { type: "string", description: "Gate ID" },
        note: { type: "string", description: "Optional note" },
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
                {
                  message: "Gate submitted for human review",
                  gate,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_action_log",
      "Get action log entries",
      {
        limit: { type: "number" },
        offset: { type: "number" },
        actionType: { type: "string" },
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
  {},
  {
    basePath: "/api",
  },
);

export async function GET(request: Request) {
  const user = await verifyBearerToken(request.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return handler(request, {
    authInfo: { extra: { user } },
  } as Parameters<typeof handler>[1]);
}

export async function POST(request: Request) {
  const user = await verifyBearerToken(request.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return handler(request, {
    authInfo: { extra: { user } },
  } as Parameters<typeof handler>[1]);
}
