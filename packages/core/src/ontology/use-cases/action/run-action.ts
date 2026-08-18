import {
  compilePropertySchema,
  runActionInputSchema,
  substituteDeclarativeEdits,
  type ActionType,
  type RunActionInput,
} from "@ssota/contracts";
import type { GraphEdits, GraphEditsResult } from "@ssota/contracts/graph";
import { GraphError } from "../../domain/graph-errors.js";
import {
  evaluateGatePolicies,
  type GatePolicySource,
} from "../../gate/evaluate-gate-policies.js";
import type {
  GraphCommitPort,
  ActionReadPort,
  TxGraphWriter,
} from "../../ports/action-port.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";

/** 액션을 실행하는 주체. 권한·감사에 쓰인다. */
export interface ActionActor {
  id: string | null;
  kind: "user" | "agent" | "system";
  /** org 멤버십 role. system은 전권. */
  role: "owner" | "member" | null;
}

/**
 * L3(function) 편집 계산기 — worker를 실행해 GraphEdits를 얻는다.
 * **커밋하지 않는다** [ACTION-03]. runAction이 커밋한다.
 * P1에서는 인터페이스만 두고, P2에서 워커 SDK 전환과 함께 어댑터를 붙인다.
 */
export interface FunctionEditsPlanner {
  plan(input: {
    workerKey: string;
    teamspaceId: string;
    parameters: Record<string, unknown>;
  }): Promise<GraphEdits>;
}

export interface RunActionDeps {
  actions: ActionReadPort;
  catalog: CatalogReadPort;
  graphRead: GraphReadPort;
  commit: GraphCommitPort;
  gatePolicies?: GatePolicySource;
  planner?: FunctionEditsPlanner;
}

export interface RunActionResult {
  actionKey: string;
  result: GraphEditsResult;
  auditId: string;
  replayed: boolean;
}

function assertPermitted(action: ActionType, actor: ActionActor): void {
  if (actor.kind === "system") return;
  const roles = action.requires.roles;
  if (roles.length === 0) return;
  if (!actor.role || !roles.includes(actor.role)) {
    throw new GraphError(
      "FORBIDDEN",
      `Action '${action.key}' requires role ${roles.join("|")}, actor has ${actor.role ?? "none"}`,
    );
  }
}

/** ref 또는 id를 실제 노드 id로. */
function resolveRef(
  ref: { id: string } | { ref: string },
  refs: Record<string, string>,
): string {
  if ("id" in ref) return ref.id;
  const id = refs[ref.ref];
  if (!id) throw new GraphError("VALIDATION_FAILED", `ref "${ref.ref}" is not resolved`);
  return id;
}

/**
 * runAction — **유일한 그래프 커밋 경로** [ACTION-01].
 *
 *   1. 파라미터를 action.parameters(닫힌 서브셋)로 검증
 *   2. 권한 확인
 *   3. 편집 계산 — declarative면 {$param} 치환, function이면 planner (커밋 없음)
 *   4. writes 선언 밖의 catalogKey를 건드리면 거부
 *   5. gate=true면 승인 필요 → GATE_PENDING (P1: 태스크 생성은 P2 onPass 포트 역전 후)
 *   6. commit(ctx, edits, apply) — 한 트랜잭션:
 *        락 → 편집마다 [catalog 검증 → Gate 평가 → 적용] → 감사 → COMMIT
 *
 * 편집 검증이 트랜잭션 **안**에서 도는 이유: 락 이후 상태를 보고 판정해야
 * check-then-write 레이스가 없다. Gate `require`도 락 이후 그래프를 읽는다.
 */
export async function runAction(
  deps: RunActionDeps,
  rawInput: RunActionInput,
  actor: ActionActor,
): Promise<RunActionResult> {
  const input = runActionInputSchema.parse(rawInput);

  const action = await deps.actions.getActionByKey(input.actionKey);
  if (!action) {
    throw new GraphError("NOT_FOUND", `Action '${input.actionKey}' not found`);
  }

  // 1. 파라미터 검증 — 사용자·에이전트가 읽는 에러는 여기서 나온다
  let params: Record<string, unknown>;
  try {
    params = compilePropertySchema(action.parameters)(input.parameters);
  } catch (err) {
    throw new GraphError(
      "VALIDATION_FAILED",
      `Action '${action.key}' parameters: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 2. 권한
  assertPermitted(action, actor);

  // 3. 편집 계산 (커밋 없음)
  let edits: GraphEdits;
  if (action.edits.kind === "declarative") {
    try {
      edits = substituteDeclarativeEdits(action.edits, params);
    } catch (err) {
      throw new GraphError(
        "VALIDATION_FAILED",
        `Action '${action.key}' edits: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    if (!deps.planner) {
      throw new GraphError(
        "PRECONDITION_FAILED",
        `Action '${action.key}' is function-backed but no planner is configured`,
      );
    }
    edits = await deps.planner.plan({
      workerKey: action.edits.workerKey,
      teamspaceId: input.teamspaceId,
      parameters: params,
    });
  }

  // 4. writes 선언 강제 — 액션이 선언한 타입 밖을 건드리면 거부
  const allowedWrites = new Set(action.writes);
  for (const edit of edits.edits) {
    if (edit.op === "create_node" || edit.op === "create_edge") {
      if (!allowedWrites.has(edit.catalogKey)) {
        throw new GraphError(
          "FORBIDDEN",
          `Action '${action.key}' declares writes ${action.writes.join(", ")} but edit touches '${edit.catalogKey}'`,
        );
      }
    }
  }

  // 5. gate — 액션별 opt-in 승인
  if (action.gate) {
    throw new GraphError(
      "GATE_PENDING",
      `Action '${action.key}' requires approval before commit`,
    );
  }

  // 락 대상 aggregate root
  const lockNodeId =
    action.aggregateRootParam && typeof params[action.aggregateRootParam] === "string"
      ? (params[action.aggregateRootParam] as string)
      : null;

  // 6. 단일 트랜잭션 커밋
  const { result, audit, replayed } = await deps.commit.commit(
    {
      teamspaceId: input.teamspaceId,
      actionKey: action.key,
      actorId: actor.id,
      actorKind: actor.kind,
      parameters: params,
      idempotencyKey: input.idempotencyKey ?? null,
      lockNodeId,
    },
    edits,
    (tx) => applyEdits({ ...deps, tx }, input.teamspaceId, edits),
  );

  return { actionKey: action.key, result, auditId: audit.id, replayed };
}

/** 낙관적 가드 평가 — 락 이후 상태 기준. 실패는 PRECONDITION_FAILED (재시도 가능). */
async function evaluateGuard(
  graphRead: GraphReadPort,
  teamspaceId: string,
  edit: Extract<GraphEdits["edits"][number], { op: "assert" | "assert_count" }>,
  at: string,
  refs: Record<string, string>,
): Promise<void> {
  const nodeId = resolveRef(edit.node, refs);
  if (edit.op === "assert") {
    const node = await graphRead.getNodeById(nodeId);
    if (!node) throw new GraphError("PRECONDITION_FAILED", `${at}: node ${nodeId} not found`);
    const value = node.properties[edit.field];
    if (value === undefined) {
      if (edit.ifMissing === "fail") {
        throw new GraphError("PRECONDITION_FAILED", `${at}: field '${edit.field}' is missing`);
      }
      return;
    }
    const v = value as string | number | boolean;
    if (edit.in && !edit.in.includes(v)) {
      throw new GraphError(
        "PRECONDITION_FAILED",
        `${at}: ${edit.field} is '${String(v)}', expected one of ${edit.in.map(String).join("|")}`,
      );
    }
    if (edit.notIn && edit.notIn.includes(v)) {
      throw new GraphError("PRECONDITION_FAILED", `${at}: ${edit.field} must not be '${String(v)}'`);
    }
    return;
  }
  // assert_count
  const edges = await graphRead.traverseEdges({
    teamspaceId,
    nodeId,
    direction: edit.direction === "out" ? "outgoing" : "incoming",
    catalogKey: edit.edgeCatalogKey,
  });
  const n = edges.length;
  if (edit.equals !== undefined && n !== edit.equals) {
    throw new GraphError("PRECONDITION_FAILED", `${at}: expected ${edit.equals} '${edit.edgeCatalogKey}' edges, found ${n}`);
  }
  if (edit.min !== undefined && n < edit.min) {
    throw new GraphError("PRECONDITION_FAILED", `${at}: expected ≥${edit.min} '${edit.edgeCatalogKey}' edges, found ${n}`);
  }
  if (edit.max !== undefined && n > edit.max) {
    throw new GraphError("PRECONDITION_FAILED", `${at}: expected ≤${edit.max} '${edit.edgeCatalogKey}' edges, found ${n}`);
  }
}

/**
 * 편집을 순서대로 적용한다 — **트랜잭션 안**. 편집마다:
 *   catalog 해석 → properties 검증(property_schema) → domain/range → Gate → 적용
 * 실패 시 throw → 전부 롤백.
 */
async function applyEdits(
  deps: RunActionDeps & { tx: TxGraphWriter },
  teamspaceId: string,
  edits: GraphEdits,
): Promise<GraphEditsResult> {
  const { catalog, tx, gatePolicies } = deps;
  const graphRead = tx.graphRead; // 락 이후 상태
  const refs: Record<string, string> = {};
  const result: GraphEditsResult = {
    refs,
    createdNodeIds: [],
    createdEdgeIds: [],
    updatedNodeIds: [],
    deletedEdgeIds: [],
    deletedNodeIds: [],
  };

  const gate = async (
    hook: "before_create_node" | "before_update_node" | "before_create_edge",
    ctx: {
      catalogKey: string;
      subjectNodeId?: string | null;
      properties?: Record<string, unknown>;
      previousProperties?: Record<string, unknown>;
      title?: string;
    },
  ) => {
    if (!gatePolicies) return;
    await evaluateGatePolicies({ graphRead, gatePolicies }, { hook, teamspaceId, ...ctx });
  };

  const validationFailed = (what: string, err: unknown) =>
    new GraphError(
      "VALIDATION_FAILED",
      `${what}: ${err instanceof Error ? err.message : String(err)}`,
    );

  // ── 가드 선평가 (B 모델) ──────────────────────────────────────────────
  // L3 함수는 락 *전* 상태를 읽고 계산했다. 락을 잡은 지금, 함수가 본 전제가 아직
  // 유효한지 assert*를 **어떤 변경보다 먼저** 재평가한다. 하나라도 틀리면 롤백.
  // create_node ref를 가리키는 가드는 그 노드가 아직 없으므로 적용 루프에서 평가한다.
  for (const [i, edit] of edits.edits.entries()) {
    if (edit.op !== "assert" && edit.op !== "assert_count") continue;
    if ("ref" in edit.node) continue; // 배치 내 생성 노드 — 루프에서 평가
    await evaluateGuard(graphRead, teamspaceId, edit, `edits[${i}] ${edit.op}`, refs);
  }

  for (const [i, edit] of edits.edits.entries()) {
    const at = `edits[${i}] ${edit.op}`;
    switch (edit.op) {
      case "assert":
      case "assert_count": {
        // id 참조는 위에서 이미 평가됨. ref 참조만 여기서 (생성 이후 시점).
        if ("ref" in edit.node) await evaluateGuard(graphRead, teamspaceId, edit, at, refs);
        break;
      }
      case "create_node": {
        const entry = await catalog.getNodeCatalogByKey(edit.catalogKey);
        if (!entry) throw new GraphError("UNKNOWN_NODE_TYPE", `${at}: '${edit.catalogKey}'`);
        let properties: Record<string, unknown>;
        try {
          properties = await catalog.validateNodeProperties(edit.catalogKey, edit.properties);
        } catch (err) {
          throw validationFailed(at, err);
        }
        await gate("before_create_node", {
          catalogKey: edit.catalogKey,
          subjectNodeId: edit.gateSubject ? resolveRef(edit.gateSubject, refs) : null,
          properties,
          title: edit.title,
        });
        const node = await tx.createNode({
          teamspaceId,
          nodeCatalogId: entry.id,
          catalogKey: entry.key,
          title: edit.title,
          properties,
        });
        result.createdNodeIds.push(node.id);
        if (edit.ref) refs[edit.ref] = node.id;
        break;
      }
      case "update_properties":
      case "set_status": {
        const nodeId = resolveRef(edit.node, refs);
        const existing = await graphRead.getNodeById(nodeId);
        if (!existing) throw new GraphError("NOT_FOUND", `${at}: node ${nodeId}`);
        let next: Record<string, unknown>;
        if (edit.op === "set_status") {
          const current = existing.properties[edit.field];
          if (edit.from && !(typeof current === "string" && edit.from.includes(current))) {
            throw new GraphError(
              "PRECONDITION_FAILED",
              `${at}: ${edit.field} is '${String(current)}', expected one of ${edit.from.join("|")}`,
            );
          }
          next = { ...existing.properties, [edit.field]: edit.to };
        } else {
          next = { ...existing.properties, ...edit.properties };
          for (const [k, v] of Object.entries(edit.properties)) if (v === null) delete next[k];
        }
        let properties: Record<string, unknown>;
        try {
          properties = await catalog.validateNodeProperties(existing.catalogKey, next);
        } catch (err) {
          throw validationFailed(at, err);
        }
        await gate("before_update_node", {
          catalogKey: existing.catalogKey,
          subjectNodeId: nodeId,
          properties,
          previousProperties: existing.properties,
          title: existing.title,
        });
        await tx.updateNode({
          teamspaceId,
          nodeId,
          properties,
          ...(edit.op === "update_properties" && edit.title ? { title: edit.title } : {}),
        });
        result.updatedNodeIds.push(nodeId);
        break;
      }
      case "create_edge": {
        const entry = await catalog.getEdgeCatalogByKey(edit.catalogKey);
        if (!entry) throw new GraphError("UNKNOWN_EDGE_TYPE", `${at}: '${edit.catalogKey}'`);
        const sourceId = resolveRef(edit.from, refs);
        const targetId = resolveRef(edit.to, refs);
        const [source, target] = await Promise.all([
          graphRead.getNodeById(sourceId),
          graphRead.getNodeById(targetId),
        ]);
        if (!source) throw new GraphError("NOT_FOUND", `${at}: source ${sourceId}`);
        if (!target) throw new GraphError("NOT_FOUND", `${at}: target ${targetId}`);
        // [GRAPH-05] domain/range
        if (entry.domainCatalogIds.length > 0 && !entry.domainCatalogIds.includes(source.nodeCatalogId)) {
          throw new GraphError(
            "VALIDATION_FAILED",
            `${at}: domain violation — source type '${source.catalogKey}' not allowed for '${entry.key}'`,
          );
        }
        if (entry.rangeCatalogIds.length > 0 && !entry.rangeCatalogIds.includes(target.nodeCatalogId)) {
          throw new GraphError(
            "VALIDATION_FAILED",
            `${at}: range violation — target type '${target.catalogKey}' not allowed for '${entry.key}'`,
          );
        }
        let properties: Record<string, unknown>;
        try {
          properties = await catalog.validateEdgeProperties(edit.catalogKey, edit.properties);
        } catch (err) {
          throw validationFailed(at, err);
        }
        await gate("before_create_edge", { catalogKey: entry.key, subjectNodeId: sourceId, properties });
        const edge = await tx.createEdge({
          teamspaceId,
          edgeCatalogId: entry.id,
          catalogKey: entry.key,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          properties,
        });
        result.createdEdgeIds.push(edge.id);
        if (edit.ref) refs[edit.ref] = edge.id;
        break;
      }
      case "delete_edge": {
        await tx.deleteEdge({ teamspaceId, edgeId: edit.edgeId });
        result.deletedEdgeIds.push(edit.edgeId);
        break;
      }
      case "delete_node": {
        const nodeId = resolveRef(edit.node, refs);
        const existing = await graphRead.getNodeById(nodeId);
        if (!existing) throw new GraphError("NOT_FOUND", `${at}: node ${nodeId}`);
        await tx.deleteNode({ teamspaceId, nodeId });
        result.deletedNodeIds.push(nodeId);
        break;
      }
      default: {
        const never: never = edit;
        throw new GraphError("VALIDATION_FAILED", `${at}: unknown op ${JSON.stringify(never)}`);
      }
    }
  }
  return result;
}

