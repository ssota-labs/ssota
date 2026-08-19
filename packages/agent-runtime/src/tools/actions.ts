import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { upsertActionInputSchema } from "@ssota/contracts";
import { GraphError } from "@ssota/core";
import { getGraphPortsForTeamspace } from "../ports.js";
import { runActionInScope } from "../actions/run-action-in-scope.js";
import { getRunContext } from "./context.js";

/**
 * Action 도구 — 에이전트가 L2 액션 타입을 **정의**하고(create_action_type),
 * 파라미터 스키마 그대로 **호출**한다(run_action). ADR-aip-console-concepts B.
 *
 * run_action은 [ACTION-01] 유일 커밋 경로(runAction)를 지난다 — 파라미터 검증·권한·
 * 편집 계산·writes 강제·gate·한 트랜잭션 커밋·감사. 에이전트는 create_node를 손으로
 * 조합하는 대신, 도메인이 정의한 액션을 부르는 쪽을 우선한다.
 */
export function createActionTools(): ToolSet {
  return {
    list_actions: tool({
      description:
        "List the project's action types (the domain's write operations, e.g. finance.post_journal_entry). Each has a parameters schema you can pass to run_action. Prefer running an existing action over composing create_node/create_edge by hand.",
      inputSchema: z.object({}),
      execute: async (_input, { context }) => {
        const ctx = getRunContext(context);
        const ports = await getGraphPortsForTeamspace(ctx.teamspaceId, ctx.accountId);
        const rows = await ports.actions.listActionRows();
        return rows.map((a) => ({
          key: a.key,
          label: a.label,
          description: a.description,
          writes: a.writes,
          gate: a.gate,
          kind: a.edits.kind,
        }));
      },
    }),

    get_action: tool({
      description:
        "Fetch one action type's full definition by key — parameters JSON schema (what run_action expects), writes, requires, gate, and edits (declarative template or worker key).",
      inputSchema: z.object({ key: z.string().min(1) }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const ports = await getGraphPortsForTeamspace(ctx.teamspaceId, ctx.accountId);
        const row = await ports.actions.getActionRowByKey(input.key);
        return row ? { found: true, action: row } : { found: false };
      },
    }),

    create_action_type: tool({
      description:
        "Define or update an action type (org-scoped, upsert by key `<domain>.<verb>`). `parameters` is a closed JSON-Schema subset (object root). `edits` is either {kind:'declarative', edits:[GraphEdits ops with {$param:'name'} placeholders]} or {kind:'function', workerKey}. `writes` lists the catalog keys the action may touch. Node/edge types referenced must already exist (create_node_type / create_edge_type first).",
      inputSchema: upsertActionInputSchema,
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const ports = await getGraphPortsForTeamspace(ctx.teamspaceId, ctx.accountId);
        const row = await ports.actions.upsertAction(input);
        return { key: row.key, id: row.id, label: row.label };
      },
    }),

    run_action: tool({
      description:
        "Run an action type by key with parameters matching its schema (see get_action). This is the only way to write domain data through the action path: validation → permission → edits → single transaction → audit. Pass an idempotencyKey to make retries safe. Returns created node/edge ids or a structured error (VALIDATION_FAILED, PRECONDITION_FAILED, GATE_PENDING, FORBIDDEN, NOT_FOUND).",
      inputSchema: z.object({
        actionKey: z.string().min(1),
        parameters: z.record(z.unknown()).default({}),
        idempotencyKey: z.string().min(1).max(200).optional(),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        try {
          const result = await runActionInScope(
            { teamspaceId: ctx.teamspaceId, accountId: ctx.accountId, organizationId: ctx.organizationId },
            input,
            { id: ctx.profileId ?? null, kind: "agent", role: "member" },
          );
          return { ok: true, ...result };
        } catch (err) {
          if (err instanceof GraphError) {
            return { ok: false, code: err.code, error: err.message };
          }
          return { ok: false, code: "ERROR", error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
  };
}
