import { parseActionType, type ActionType } from "@ssota/contracts";
import type { GraphEdits } from "@ssota/contracts/graph";
import type { GraphCommitPort } from "../../ports/action-port.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GatePolicySource } from "../../gate/evaluate-gate-policies.js";
import { runAction, type ActionActor, type FunctionEditsPlanner } from "../action/run-action.js";

/**
 * 시스템 액션 — 옛 graph use-case(createNode·createEdge·…)가 [ACTION-01]을 지키기 위해
 * runAction으로 커밋할 때 쓰는 **내장 ActionType**.
 *
 * 사용자 정의 액션과 달리 코드 레지스트리에 산다(카탈로그 행 아님). 파라미터는 이미
 * use-case가 도메인 규칙(lifecycle 기본값·BlockNote 정규화·roadmap 규칙)을 적용해 만든
 * GraphEdits 자체이므로, 액션의 `edits`는 function-kind로 두고 planner가 그 배치를 그대로 돌려준다.
 * → runAction의 트랜잭션·락·catalog 검증·Gate·감사·멱등이 전부 적용된다.
 *
 * `writes`는 GraphEdits에서 유도한다 — 배치가 건드리는 catalogKey가 곧 선언이다.
 */

const SYSTEM_ACTOR: ActionActor = { id: null, kind: "system", role: null };

function writesOf(edits: GraphEdits): string[] {
  const keys = new Set<string>();
  for (const e of edits.edits) {
    if (e.op === "create_node" || e.op === "create_edge") keys.add(e.catalogKey);
  }
  // update/delete/set_status는 catalogKey를 들고 있지 않다 — 감사에는 op가 남는다.
  return keys.size ? [...keys] : ["*"];
}

/** 시스템 액션 키. 감사 로그에서 어떤 옛 use-case가 커밋했는지 식별한다. */
export type SystemActionKey =
  | "graph.create_node"
  | "graph.update_node"
  | "graph.create_edge"
  | "graph.delete_edge"
  | "graph.delete_node"
  | "graph.create_initiative_bundle";

export interface SystemActionDeps {
  catalog: CatalogReadPort;
  graphRead: GraphReadPort;
  commit: GraphCommitPort;
  gatePolicies?: GatePolicySource;
}

/**
 * 미리 만든 GraphEdits를 runAction으로 커밋한다. use-case가 도메인 준비를 마친 뒤 호출.
 * `lockNodeId`는 aggregate root(update/delete 대상, 또는 initiative)로 지정한다.
 */
export async function commitSystemEdits(
  deps: SystemActionDeps,
  input: {
    key: SystemActionKey;
    teamspaceId: string;
    edits: GraphEdits;
    lockNodeId?: string | null;
    idempotencyKey?: string;
    actor?: ActionActor;
  },
) {
  const action: ActionType = parseActionType({
    key: input.key,
    label: input.key,
    parameters: { type: "object" },
    writes: writesOf(input.edits),
    requires: { roles: [] },
    edits: { kind: "function", workerKey: `__system__:${input.key}` },
    ...(input.lockNodeId ? { aggregateRootParam: "__lock" } : {}),
  });

  const planner: FunctionEditsPlanner = {
    async plan() {
      return input.edits;
    },
  };
  const actions = {
    async getActionByKey(k: string) {
      return k === action.key ? action : null;
    },
    async listActions() {
      return [action];
    },
  };

  return runAction(
    { actions, catalog: deps.catalog, graphRead: deps.graphRead, commit: deps.commit, gatePolicies: deps.gatePolicies, planner },
    {
      teamspaceId: input.teamspaceId,
      actionKey: action.key,
      parameters: input.lockNodeId ? { __lock: input.lockNodeId } : {},
      idempotencyKey: input.idempotencyKey,
    },
    input.actor ?? SYSTEM_ACTOR,
  );
}
