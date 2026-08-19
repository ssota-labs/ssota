import { z } from "zod";
import { throwMcpToolError } from "@/lib/api/mcp-errors";
import {
  createActionTypeForMcp,
  getActionForMcp,
  listActionsForMcp,
  runActionForMcp,
} from "@/lib/api/action-services";
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

function actorFrom(extra: { authInfo?: AuthInfo }) {
  const user = extra.authInfo?.extra?.user as { id?: string } | undefined;
  return { id: user?.id ?? null, kind: "agent" as const, role: "member" as const };
}

/**
 * Action 도구 — L2 액션 타입 정의·조회·실행 (ADR-aip-console-concepts B).
 * run_action = [ACTION-01] 유일 커밋 경로. MCP는 declarative 액션만 실행한다.
 */
export function registerActionTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_actions",
    {
      title: "List Actions",
      description:
        "List this project's action types — the domain's write operations (e.g. finance.post_journal_entry) with their parameter schemas. Prefer run_action over hand-composing create_node/create_edge.",
    },
    async ({ teamspaceId }) => jsonContent(await listActionsForMcp(teamspaceId)),
  );

  registerScopedProjectTool(
    server,
    "get_action",
    {
      title: "Get Action",
      description:
        "Fetch one action type's full definition (parameters JSON schema, writes, requires, gate, edits) by key.",
      inputSchema: { key: z.string().min(1) },
    },
    async ({ teamspaceId, args }) =>
      jsonContent(await getActionForMcp(teamspaceId, String(args.key))),
  );

  registerScopedProjectTool(
    server,
    "create_action_type",
    {
      title: "Create Action Type",
      description:
        "Define (or update, upsert by key '<domain>.<verb>') an org-scoped action type. parameters = closed JSON-Schema subset (object root). edits = {kind:'declarative', edits:[GraphEdits ops using {$param:'name'} placeholders]} or {kind:'function', workerKey}. writes = catalog keys the action may touch. Referenced node/edge types must exist.",
      inputSchema: {
        key: z.string().min(1),
        label: z.string().min(1),
        description: z.string().optional(),
        parameters: z.record(z.unknown()),
        writes: z.array(z.string().min(1)).min(1),
        requires: z.object({ roles: z.array(z.enum(["owner", "member"])) }).optional(),
        criteria: z.array(z.string()).optional(),
        gate: z.boolean().optional(),
        edits: z.record(z.unknown()),
        aggregateRootParam: z.string().optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createActionTypeForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "run_action",
    {
      title: "Run Action",
      description:
        "Run an action type by key with parameters matching its schema (see get_action). Validation → permission → edits → single transaction → audit. Pass idempotencyKey to make retries safe. Function-backed (worker) actions must be run from the console or an in-app agent; MCP runs declarative actions.",
      inputSchema: {
        actionKey: z.string().min(1),
        parameters: z.record(z.unknown()).optional(),
        idempotencyKey: z.string().min(1).max(200).optional(),
      },
    },
    async ({ teamspaceId, args, extra }) => {
      try {
        return jsonContent(
          await runActionForMcp(
            teamspaceId,
            {
              actionKey: String(args.actionKey),
              parameters: (args.parameters as Record<string, unknown> | undefined) ?? {},
              idempotencyKey: args.idempotencyKey as string | undefined,
            },
            actorFrom(extra),
          ),
        );
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );
}
