import { randomUUID } from "node:crypto";
import type { ActionAuditRecord, ActionType } from "@ssota/contracts";
import type { GraphEditsResult } from "@ssota/contracts/graph";
import type {
  GraphCommitContext,
  GraphCommitPort,
  ActionReadPort,
  TxGraphWriter,
} from "../ports/action-port.js";
import type { InMemoryGraphStore } from "./in-memory-graph.js";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphWritePort,
} from "./in-memory-graph.js";

export function createInMemoryActionReadPort(actions: ActionType[]): ActionReadPort {
  return {
    async getActionByKey(key) {
      return actions.find((a) => a.key === key) ?? null;
    },
    async listActions() {
      return actions;
    },
  };
}

export interface InMemoryActionStore {
  audits: ActionAuditRecord[];
}

/**
 * 인메모리 GraphCommitPort — DB 트랜잭션 의미를 재현한다:
 * - apply가 throw하면 store를 **스냅샷으로 복원** (롤백)
 * - idempotencyKey 재사용 시 이전 결과 반환 (replayed=true)
 * - 감사 기록은 apply 성공과 함께만 남는다
 * 락은 시뮬레이션하지 않는다 (동시성 거부 케이스는 어댑터 통합 테스트 몫).
 */
export function createInMemoryGraphCommitPort(
  graph: InMemoryGraphStore,
  store: InMemoryActionStore,
): GraphCommitPort {
  return {
    async commit(ctx: GraphCommitContext, edits, apply) {
      if (ctx.idempotencyKey) {
        const prior = store.audits.find(
          (a) => a.teamspaceId === ctx.teamspaceId && a.idempotencyKey === ctx.idempotencyKey,
        );
        if (prior) return { result: prior.result, audit: prior, replayed: true };
      }
      if (ctx.lockNodeId && !graph.nodes.has(ctx.lockNodeId)) {
        throw new Error(`lock target ${ctx.lockNodeId} not found`);
      }

      const snapshot = {
        nodes: new Map(graph.nodes),
        edges: new Map(graph.edges),
      };
      const tx: TxGraphWriter = {
        graphRead: createInMemoryGraphReadPort(graph),
        ...adaptWriter(createInMemoryGraphWritePort(graph)),
      };
      let result: GraphEditsResult;
      try {
        result = await apply(tx);
      } catch (err) {
        graph.nodes = snapshot.nodes;
        graph.edges = snapshot.edges;
        throw err;
      }
      const audit: ActionAuditRecord = {
        id: randomUUID(),
        teamspaceId: ctx.teamspaceId,
        actionKey: ctx.actionKey,
        actorId: ctx.actorId,
        actorKind: ctx.actorKind,
        parameters: ctx.parameters,
        edits,
        result,
        idempotencyKey: ctx.idempotencyKey,
        createdAt: new Date().toISOString(),
      };
      store.audits.push(audit);
      return { result, audit, replayed: false };
    },
  };
}

function adaptWriter(
  w: ReturnType<typeof createInMemoryGraphWritePort>,
): Omit<TxGraphWriter, "graphRead"> {
  return {
    createNode: (i) => w.createNode({ ...i, schemaVersion: 1 }),
    updateNode: (i) => w.updateNode(i),
    createEdge: (i) => w.createEdge(i),
    deleteEdge: (i) => w.deleteEdge(i),
  };
}
