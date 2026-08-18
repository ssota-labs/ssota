import type { ActionAuditRecord, ActionType } from "@ssota/contracts";
import type { GraphEdits, GraphEditsResult } from "@ssota/contracts/graph";
import type { GraphEdge, GraphNode } from "../domain/graph-types.js";
import type { GraphReadPort } from "./graph-read-port.js";

/** 액션 타입 레지스트리 읽기 — 카탈로그 행 또는 코드 레지스트리 뒤에 있다. */
export interface ActionReadPort {
  getActionByKey(key: string): Promise<ActionType | null>;
  listActions(): Promise<ActionType[]>;
}

/** 커밋 컨텍스트 — 감사 기록에 남는 것. */
export interface GraphCommitContext {
  teamspaceId: string;
  actionKey: string;
  actorId: string | null;
  actorKind: "user" | "agent" | "system";
  parameters: Record<string, unknown>;
  idempotencyKey: string | null;
  /** 지정하면 트랜잭션 시작 직후 이 노드 행을 FOR UPDATE로 잠근다. */
  lockNodeId: string | null;
}

/**
 * 트랜잭션 안에서 core가 쓰는 쓰기 표면. 어댑터가 tx 바인딩된 구현을 콜백에 넘긴다.
 * GraphWritePort와 같은 메서드지만 **같은 트랜잭션**에 묶여 있고, 읽기(graphRead)도
 * 락 이후 상태를 본다.
 */
export interface TxGraphWriter {
  graphRead: GraphReadPort;
  createNode(input: {
    teamspaceId: string;
    nodeCatalogId: string;
    catalogKey: string;
    title: string;
    properties: Record<string, unknown>;
  }): Promise<GraphNode>;
  updateNode(input: {
    teamspaceId: string;
    nodeId: string;
    title?: string;
    properties?: Record<string, unknown>;
  }): Promise<GraphNode>;
  createEdge(input: {
    teamspaceId: string;
    edgeCatalogId: string;
    catalogKey: string;
    sourceNodeId: string;
    targetNodeId: string;
    properties: Record<string, unknown>;
  }): Promise<GraphEdge>;
  deleteEdge(input: { teamspaceId: string; edgeId: string }): Promise<void>;
}

/**
 * GraphCommitPort — **유일한 그래프 커밋 경로** [ACTION-01].
 *
 * `commit`은 한 트랜잭션에서:
 *   1) idempotencyKey가 있고 이미 기록이 있으면 그 결과를 반환하고 끝낸다
 *   2) lockNodeId가 있으면 SELECT … FOR UPDATE
 *   3) apply(tx) 콜백을 실행한다 — core가 여기서 편집을 하나씩 검증·적용한다
 *   4) 감사 기록을 같은 트랜잭션에 INSERT
 *   5) COMMIT (deferred trigger가 있으면 여기서 발화 — P2)
 * 콜백이 throw하면 전부 롤백된다.
 */
export interface GraphCommitPort {
  commit(
    ctx: GraphCommitContext,
    edits: GraphEdits,
    apply: (tx: TxGraphWriter) => Promise<GraphEditsResult>,
  ): Promise<{ result: GraphEditsResult; audit: ActionAuditRecord; replayed: boolean }>;
}
