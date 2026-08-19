import {
  createGraphGatePolicySource,
  runAction,
  type ActionActor,
} from "@ssota/core";
import { upsertActionInputSchema } from "@ssota/contracts";
import { getGraphPortsForTeamspace } from "@/lib/ports";

/**
 * MCP action services — 액션 타입 목록·정의·실행 (ADR-aip-console-concepts B).
 *
 * run_action은 core `runAction` [ACTION-01]을 지난다. MCP 앱은 워커 실행기(sandbox)를
 * 들고 있지 않으므로 **L2 declarative 액션만** 실행하고, function-kind는 명확한 오류로
 * 거절한다 — 콘솔·에이전트 도구가 그 경로다.
 */
export async function listActionsForMcp(teamspaceId: string) {
  const ports = await getGraphPortsForTeamspace(teamspaceId);
  const rows = await ports.actions.listActionRows();
  return rows.map((a) => ({
    key: a.key,
    label: a.label,
    description: a.description,
    writes: a.writes,
    gate: a.gate,
    kind: a.edits.kind,
    parameters: a.parameters,
  }));
}

export async function getActionForMcp(teamspaceId: string, key: string) {
  const ports = await getGraphPortsForTeamspace(teamspaceId);
  const row = await ports.actions.getActionRowByKey(key);
  return row ? { found: true, action: row } : { found: false };
}

export async function createActionTypeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const ports = await getGraphPortsForTeamspace(teamspaceId);
  const row = await ports.actions.upsertAction(upsertActionInputSchema.parse(input));
  return { key: row.key, id: row.id, label: row.label };
}

export async function runActionForMcp(
  teamspaceId: string,
  input: { actionKey: string; parameters?: Record<string, unknown>; idempotencyKey?: string },
  actor: ActionActor,
) {
  const ports = await getGraphPortsForTeamspace(teamspaceId);
  const result = await runAction(
    {
      actions: ports.actions,
      catalog: ports.catalog,
      graphRead: ports.graphRead,
      commit: ports.commit,
      gatePolicies: createGraphGatePolicySource(ports.graphRead),
      // planner 없음 — function-kind는 runAction이 "no planner is configured"로 거절한다.
    },
    { teamspaceId, ...input, parameters: input.parameters ?? {} },
    actor,
  );
  return result;
}
