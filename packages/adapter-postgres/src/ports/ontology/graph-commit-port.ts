import { and, eq, sql } from "drizzle-orm";
import type { ActionAuditRecord } from "@ssota/contracts";
import type { GraphEdits, GraphEditsResult } from "@ssota/contracts/graph";
import type {
  GraphCommitContext,
  GraphCommitPort,
  TxGraphWriter,
} from "@ssota/core";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createGraphReadPort, type GraphPortsScope } from "./graph-read-port.js";
import { createGraphWritePort } from "./graph-write-port.js";

/** drizzle `db.transaction` 콜백이 받는 tx — 쿼리 표면은 Db와 같다. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function mapAudit(row: typeof schema.actionAudits.$inferSelect): ActionAuditRecord {
  return {
    id: row.id,
    teamspaceId: row.teamspaceId,
    actionKey: row.actionKey,
    actorId: row.actorId,
    actorKind: row.actorKind as ActionAuditRecord["actorKind"],
    parameters: row.parameters,
    edits: row.edits as unknown as GraphEdits,
    result: row.result as unknown as GraphEditsResult,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * DB GraphCommitPort — **한 트랜잭션**에서:
 *   1) idempotencyKey 재사용이면 이전 감사 기록의 결과를 반환 (쓰기 0)
 *   2) lockNodeId가 있으면 `SELECT … FOR UPDATE` — 같은 aggregate에 쓰는 액션을 직렬화
 *   3) apply(tx) — core가 편집을 검증·적용 (tx 바인딩된 read/write 포트 사용)
 *   4) action_audits INSERT — 편집과 같은 트랜잭션
 *   5) COMMIT — deferred constraint trigger가 있으면 여기서 발화 (P2)
 * 어느 단계든 throw → 전부 롤백. 편집·감사·(P2)불변식이 원자적으로 함께 성립한다.
 *
 * 왜 tx를 기존 포트 팩토리에 그대로 넘기나: drizzle tx는 Db와 같은 쿼리 표면이라
 * createGraphReadPort/createGraphWritePort를 재사용하면 행 매핑·scope 검증을 중복하지 않는다.
 */
export function createDbGraphCommitPort(db: Db, scope: GraphPortsScope): GraphCommitPort {
  const { teamspaceId } = scope;

  return {
    async commit(ctx: GraphCommitContext, edits, apply) {
      if (ctx.teamspaceId !== teamspaceId) {
        throw new Error("GraphCommitPort scope mismatch: ctx.teamspaceId ≠ port teamspaceId");
      }

      return db.transaction(async (tx: Tx) => {
        // 1) 멱등 replay
        if (ctx.idempotencyKey) {
          const [prior] = await tx
            .select()
            .from(schema.actionAudits)
            .where(
              and(
                eq(schema.actionAudits.teamspaceId, teamspaceId),
                eq(schema.actionAudits.idempotencyKey, ctx.idempotencyKey),
              ),
            )
            .limit(1);
          if (prior) {
            const audit = mapAudit(prior);
            return { result: audit.result, audit, replayed: true };
          }
        }

        // 2) aggregate root 락 — 이후 read는 락 획득 후 상태.
        // 스코프는 teamspace가 아니라 **organization**이다 — [GRAPH-03] 같은 org면 teamspace가 달라도
        // 엣지를 걸 수 있으므로, cross-teamspace 소스 노드(또는 org-shared, teamspace_id IS NULL)도 잠글 수 있어야 한다.
        if (ctx.lockNodeId) {
          const locked = await tx.execute(
            sql`select n.id from ${schema.nodes} n
                left join ${schema.teamspaces} t on t.id = n.teamspace_id
                where n.id = ${ctx.lockNodeId}
                  and (n.teamspace_id is null or t.organization_id = ${scope.organizationId})
                for update of n`,
          );
          if (locked.length === 0) {
            throw new Error(`lock target node ${ctx.lockNodeId} not found in organization`);
          }
        }

        // 3) tx 바인딩 포트로 apply
        const txDb = tx as unknown as Db;
        const graphRead = createGraphReadPort(txDb, scope);
        const graphWrite = createGraphWritePort(txDb, scope);
        const writer: TxGraphWriter = {
          graphRead,
          createNode: (i) => graphWrite.createNode({ ...i, schemaVersion: 1 }),
          updateNode: (i) => graphWrite.updateNode(i),
          createEdge: (i) => graphWrite.createEdge(i),
          deleteEdge: (i) => graphWrite.deleteEdge(i),
          deleteNode: (i) => graphWrite.deleteNode(i),
        };
        const result = await apply(writer);

        // 4) 감사 — 같은 트랜잭션
        const [row] = await tx
          .insert(schema.actionAudits)
          .values({
            teamspaceId,
            actionKey: ctx.actionKey,
            actorId: ctx.actorId,
            actorKind: ctx.actorKind,
            parameters: ctx.parameters,
            edits: edits as unknown as Record<string, unknown>,
            result: result as unknown as Record<string, unknown>,
            idempotencyKey: ctx.idempotencyKey,
          })
          .returning();
        if (!row) throw new Error("action_audits insert returned no row");

        return { result, audit: mapAudit(row), replayed: false };
      });
    },
  };
}
