import { describe, expect, it } from "vitest";
import {
  parseActionType,
  type ActionType,
  type EdgeCatalogRow,
  type NodeCatalogRow,
} from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { GatePolicySource } from "../../gate/evaluate-gate-policies.js";
import {
  createInMemoryGraphCommitPort,
  createInMemoryActionReadPort,
  type InMemoryActionStore,
} from "../../testing/in-memory-action.js";
import { createInMemoryCatalogReadPort } from "../../testing/in-memory-catalog.js";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../../testing/in-memory-graph.js";
import { runAction, type ActionActor } from "./run-action.js";

/**
 * P1 액션 봉투 — 거부 케이스 먼저 [TEST-01].
 * runAction이 (1) 파라미터·권한·writes를 막고 (2) 편집 실패 시 전부 롤백하고
 * (3) 감사가 커밋과 함께만 남고 (4) 멱등 재호출을 replay하는지 검증한다.
 */

const ORG = "00000000-0000-4000-8000-00000000aaaa";
const TS = "00000000-0000-4000-8000-000000000001";
const ID = {
  account: "00000000-0000-4000-8000-000000000101",
  entry: "00000000-0000-4000-8000-000000000102",
  period: "00000000-0000-4000-8000-000000000103",
  postsTo: "00000000-0000-4000-8000-000000000201",
};

const nodeRows: NodeCatalogRow[] = [
  {
    id: ID.account, organizationId: ORG, key: "finance.account", label: "계정", description: "", keywords: [],
    propertySchema: {
      type: "object",
      properties: { code: { type: "string", minLength: 1 }, accountType: { type: "string", enum: ["asset", "revenue"] } },
      required: ["code", "accountType"],
    },
  },
  {
    id: ID.entry, organizationId: ORG, key: "finance.journal_entry", label: "전표", description: "", keywords: [],
    propertySchema: {
      type: "object",
      properties: {
        entryNo: { type: "string" },
        postedAt: { type: "string", format: "date" },
        status: { type: "string", enum: ["draft", "posted", "void"] },
      },
      required: ["entryNo", "postedAt", "status"],
    },
  },
  { id: ID.period, organizationId: ORG, key: "finance.fiscal_period", label: "기간", description: "", keywords: [], propertySchema: { type: "object" } },
];
const edgeRows: EdgeCatalogRow[] = [
  {
    id: ID.postsTo, organizationId: ORG, key: "finance.journal_entry.posts_to", label: "분개행", description: "", keywords: [],
    domainCatalogIds: [ID.entry], rangeCatalogIds: [ID.account],
    propertySchema: {
      type: "object",
      properties: { debit: { type: "integer", minimum: 0 }, credit: { type: "integer", minimum: 0 }, lineNo: { type: "integer", minimum: 1 } },
      required: ["debit", "credit", "lineNo"],
    },
  },
];

const postJournalEntry: ActionType = parseActionType({
  key: "finance.post_journal_entry",
  label: "분개 전기",
  parameters: {
    type: "object",
    properties: {
      entryNo: { type: "string" }, postedAt: { type: "string", format: "date" },
      debitAccountId: { type: "string", format: "uuid" }, creditAccountId: { type: "string", format: "uuid" },
      amount: { type: "integer", minimum: 1 },
    },
    required: ["entryNo", "postedAt", "debitAccountId", "creditAccountId", "amount"],
  },
  writes: ["finance.journal_entry", "finance.journal_entry.posts_to"],
  requires: { roles: ["member", "owner"] },
  edits: {
    kind: "declarative",
    edits: [
      { op: "create_node", ref: "entry", catalogKey: "finance.journal_entry", title: { $param: "entryNo" },
        properties: { entryNo: { $param: "entryNo" }, postedAt: { $param: "postedAt" }, status: "posted" } },
      { op: "create_edge", catalogKey: "finance.journal_entry.posts_to", from: { ref: "entry" }, to: { id: { $param: "debitAccountId" } },
        properties: { debit: { $param: "amount" }, credit: 0, lineNo: 1 } },
      { op: "create_edge", catalogKey: "finance.journal_entry.posts_to", from: { ref: "entry" }, to: { id: { $param: "creditAccountId" } },
        properties: { debit: 0, credit: { $param: "amount" }, lineNo: 2 } },
    ],
  },
});

const voidEntry: ActionType = parseActionType({
  key: "finance.void_journal_entry",
  label: "전표 취소",
  parameters: { type: "object", properties: { entryId: { type: "string", format: "uuid" } }, required: ["entryId"] },
  writes: ["finance.journal_entry"],
  aggregateRootParam: "entryId",
  edits: { kind: "declarative", edits: [
    { op: "set_status", node: { id: { $param: "entryId" } }, to: "void", from: ["posted"] },
  ] },
});

const closePeriod: ActionType = parseActionType({
  key: "finance.close_fiscal_period",
  label: "기간 마감",
  parameters: { type: "object", properties: { periodId: { type: "string", format: "uuid" } }, required: ["periodId"] },
  writes: ["finance.fiscal_period"],
  requires: { roles: ["owner"] },
  gate: true,
  edits: { kind: "declarative", edits: [
    { op: "set_status", node: { id: { $param: "periodId" } }, to: "closed" },
  ] },
});

const sneaky: ActionType = parseActionType({
  key: "finance.sneaky",
  label: "선언 밖 쓰기",
  parameters: { type: "object" },
  writes: ["finance.journal_entry"],
  edits: { kind: "declarative", edits: [
    { op: "create_node", catalogKey: "finance.account", title: "x", properties: { code: "9", accountType: "asset" } },
  ] },
});

const member: ActionActor = { id: "00000000-0000-4000-8000-00000000beef", kind: "user", role: "member" };
const owner: ActionActor = { ...member, role: "owner" };
const stranger: ActionActor = { id: null, kind: "user", role: null };

function setup(opts?: { gatePolicies?: GatePolicySource }) {
  const graph = createInMemoryGraphStore();
  const store: InMemoryActionStore = { audits: [] };
  const catalog = createInMemoryCatalogReadPort({ nodes: nodeRows, edges: edgeRows });
  const graphRead = createInMemoryGraphReadPort(graph);
  const graphWrite = createInMemoryGraphWritePort(graph);
  const deps = {
    actions: createInMemoryActionReadPort([postJournalEntry, voidEntry, closePeriod, sneaky]),
    catalog, graphRead,
    commit: createInMemoryGraphCommitPort(graph, store),
    gatePolicies: opts?.gatePolicies,
  };
  const mkAccount = (code: string, accountType: "asset" | "revenue") =>
    graphWrite.createNode({ teamspaceId: TS, nodeCatalogId: ID.account, catalogKey: "finance.account", title: code, properties: { code, accountType }, schemaVersion: 1 });
  return { deps, graph, store, mkAccount, graphWrite };
}

async function expectGraphError(p: Promise<unknown>, code: GraphError["code"], re?: RegExp) {
  await expect(p).rejects.toBeInstanceOf(GraphError);
  await p.catch((e: GraphError) => { expect(e.code).toBe(code); if (re) expect(e.message).toMatch(re); });
}

describe("runAction — 입구 거부", () => {
  it("모르는 액션 키를 NOT_FOUND로 거부한다", async () => {
    const { deps } = setup();
    await expectGraphError(runAction(deps, { teamspaceId: TS, actionKey: "finance.nope", parameters: {} }, member), "NOT_FOUND");
  });

  it("파라미터 스키마 위반(amount 0)을 VALIDATION_FAILED로 거부한다", async () => {
    const { deps, mkAccount } = setup();
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    await expectGraphError(
      runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
        parameters: { entryNo: "JE-1", postedAt: "2026-08-01", debitAccountId: a.id, creditAccountId: b.id, amount: 0 } }, member),
      "VALIDATION_FAILED", /amount/,
    );
  });

  it("권한 없는 actor를 FORBIDDEN으로 거부한다", async () => {
    const { deps, mkAccount } = setup();
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    await expectGraphError(
      runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
        parameters: { entryNo: "JE-1", postedAt: "2026-08-01", debitAccountId: a.id, creditAccountId: b.id, amount: 100 } }, stranger),
      "FORBIDDEN", /requires role/,
    );
  });

  it("writes 선언 밖의 catalogKey를 건드리는 편집을 FORBIDDEN으로 거부한다", async () => {
    const { deps } = setup();
    await expectGraphError(runAction(deps, { teamspaceId: TS, actionKey: "finance.sneaky", parameters: {} }, owner), "FORBIDDEN", /declares writes/);
  });

  it("gate=true 액션은 GATE_PENDING으로 멈춘다 (커밋 없음)", async () => {
    const { deps, store, graphWrite } = setup();
    const p = await graphWrite.createNode({ teamspaceId: TS, nodeCatalogId: ID.period, catalogKey: "finance.fiscal_period", title: "2026-08", properties: {}, schemaVersion: 1 });
    await expectGraphError(runAction(deps, { teamspaceId: TS, actionKey: "finance.close_fiscal_period", parameters: { periodId: p.id } }, owner), "GATE_PENDING");
    expect(store.audits).toHaveLength(0);
  });
});

describe("runAction — 원자성 (트랜잭션 이유 그 자체)", () => {
  it("3번째 편집(range 위반)이 실패하면 1·2번째(전표·차변)도 남지 않는다", async () => {
    const { deps, graph, store, mkAccount, graphWrite } = setup();
    const cash = await mkAccount("1000", "asset");
    // credit 쪽에 계정이 아니라 기간 노드를 꽂는다 → posts_to range 위반
    const period = await graphWrite.createNode({ teamspaceId: TS, nodeCatalogId: ID.period, catalogKey: "finance.fiscal_period", title: "p", properties: {}, schemaVersion: 1 });
    const before = { nodes: graph.nodes.size, edges: graph.edges.size };

    await expectGraphError(
      runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
        parameters: { entryNo: "JE-1", postedAt: "2026-08-01", debitAccountId: cash.id, creditAccountId: period.id, amount: 100 } }, member),
      "VALIDATION_FAILED", /range violation/,
    );

    expect(graph.nodes.size).toBe(before.nodes);   // 전표 노드 롤백
    expect(graph.edges.size).toBe(before.edges);   // 차변 엣지 롤백
    expect(store.audits).toHaveLength(0);          // 감사도 없음
  });

  it("set_status from 가드 위반은 PRECONDITION_FAILED이고 상태가 바뀌지 않는다", async () => {
    const { deps, graph, mkAccount } = setup();
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    const posted = await runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
      parameters: { entryNo: "JE-1", postedAt: "2026-08-01", debitAccountId: a.id, creditAccountId: b.id, amount: 100 } }, member);
    const entryId = posted.result.refs.entry!;
    // 1차 void 성공
    await runAction(deps, { teamspaceId: TS, actionKey: "finance.void_journal_entry", parameters: { entryId } }, member);
    // 2차 void — 이미 void라 from:["posted"] 가드에 걸림
    await expectGraphError(
      runAction(deps, { teamspaceId: TS, actionKey: "finance.void_journal_entry", parameters: { entryId } }, member),
      "PRECONDITION_FAILED", /expected one of posted/,
    );
    expect(graph.nodes.get(entryId)?.properties.status).toBe("void");
  });

  it("Gate require 실패는 GATE_REJECTED이고 전부 롤백된다", async () => {
    const gatePolicies: GatePolicySource = {
      async listGatePolicies() {
        return [{ id: "g1", properties: {
          policyKey: "finance.no_entries_before_2020",
          when: "before_create_node",
          match: { catalogKey: "finance.journal_entry" },
          require: [{ path: "self.postedAt", notIn: ["1999-01-01"], ifMissing: "fail" }],
          onFail: { code: "GATE_REJECTED", messageTemplate: "1999년 전표는 전기할 수 없다" },
        } }];
      },
    };
    const { deps, graph, store, mkAccount } = setup({ gatePolicies });
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    const before = graph.nodes.size;
    await expectGraphError(
      runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
        parameters: { entryNo: "OLD", postedAt: "1999-01-01", debitAccountId: a.id, creditAccountId: b.id, amount: 1 } }, member),
      "GATE_REJECTED", /1999/,
    );
    expect(graph.nodes.size).toBe(before);
    expect(store.audits).toHaveLength(0);
  });
});

describe("runAction — 통과와 감사·멱등", () => {
  it("전표 + 분개행 2건을 한 번에 커밋하고 감사 기록을 남긴다", async () => {
    const { deps, graph, store, mkAccount } = setup();
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    const out = await runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
      parameters: { entryNo: "JE-1", postedAt: "2026-08-01", debitAccountId: a.id, creditAccountId: b.id, amount: 1200 } }, member);

    expect(out.replayed).toBe(false);
    expect(out.result.createdNodeIds).toHaveLength(1);
    expect(out.result.createdEdgeIds).toHaveLength(2);
    expect(out.result.refs.entry).toBe(out.result.createdNodeIds[0]);
    const entry = graph.nodes.get(out.result.refs.entry!);
    expect(entry?.properties.status).toBe("posted");

    expect(store.audits).toHaveLength(1);
    const audit = store.audits[0]!;
    expect(audit.actionKey).toBe("finance.post_journal_entry");
    expect(audit.actorId).toBe(member.id);
    expect(audit.parameters.amount).toBe(1200);
    expect(audit.edits.edits).toHaveLength(3);
    expect(audit.result.createdEdgeIds).toEqual(out.result.createdEdgeIds);
  });

  it("같은 idempotencyKey 재호출은 두 번 쓰지 않고 이전 결과를 돌려준다", async () => {
    const { deps, graph, store, mkAccount } = setup();
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    const params = { entryNo: "JE-1", postedAt: "2026-08-01", debitAccountId: a.id, creditAccountId: b.id, amount: 5 };
    const first = await runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry", parameters: params, idempotencyKey: "req-1" }, member);
    const nodesAfterFirst = graph.nodes.size;
    const second = await runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry", parameters: params, idempotencyKey: "req-1" }, member);
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual(first.result);
    expect(graph.nodes.size).toBe(nodesAfterFirst);
    expect(store.audits).toHaveLength(1);
  });

  it("system actor는 role 요구를 우회한다", async () => {
    const { deps, mkAccount } = setup();
    const a = await mkAccount("1000", "asset"); const b = await mkAccount("4000", "revenue");
    const out = await runAction(deps, { teamspaceId: TS, actionKey: "finance.post_journal_entry",
      parameters: { entryNo: "SYS", postedAt: "2026-08-01", debitAccountId: a.id, creditAccountId: b.id, amount: 1 } },
      { id: null, kind: "system", role: null });
    expect(out.result.createdNodeIds).toHaveLength(1);
  });
});
