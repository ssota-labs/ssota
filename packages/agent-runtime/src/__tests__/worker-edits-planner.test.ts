import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Worker } from "@ssota/contracts";
import { createWorkerEditsPlanner, WorkerPlanError } from "../workers/worker-edits-planner.js";
import type { WorkerSdkHost } from "../workers/worker-sdk-host.js";

/**
 * P2 L3 planner — 워커가 GraphEdits를 **반환**하고 커밋하지 않는지 [ACTION-03].
 * close_fiscal_period를 L3로: 워커가 기간 내 전표의 차·대 합을 읽어 검증하고,
 * 맞으면 assert 가드 + set_status를 반환, 틀리면 throw.
 */

const TS = "00000000-0000-4000-8000-000000000002";
const ORG = "00000000-0000-4000-8000-00000000aaaa";
const PERIOD = "00000000-0000-4000-8000-000000000010";

const closePeriodWorker: Worker = {
  id: "00000000-0000-4000-8000-000000000001",
  teamspaceId: TS,
  accountId: null,
  key: "finance.close_period",
  name: "기간 마감 검증",
  description: "",
  kind: "tool",
  inputSchema: { type: "object", properties: { periodId: { type: "string" } }, required: ["periodId"] },
  outputSchema: null,
  // L3 함수: 락 전 상태를 읽고, 시산표를 검증하고, "내가 본 상태"를 가드로 함께 반환한다.
  script: `export default async function handler(input, sdk) {
  const entries = await sdk.graph.read.traverseEdges({ nodeId: input.periodId, direction: "incoming", catalogKey: "finance.journal_entry.in_period" });
  let debit = 0, credit = 0;
  for (const e of entries) {
    const lines = await sdk.graph.read.traverseEdges({ nodeId: e.sourceNodeId, direction: "outgoing", catalogKey: "finance.journal_entry.posts_to" });
    for (const l of lines) { debit += l.properties.debit ?? 0; credit += l.properties.credit ?? 0; }
  }
  if (debit !== credit) throw new Error("시산표 불일치: 차변 " + debit + " ≠ 대변 " + credit);
  return { edits: [
    sdk.edits.assert({ id: input.periodId }, "status", { in: ["open"] }),
    sdk.edits.assertCount({ id: input.periodId }, "finance.journal_entry.in_period", { equals: entries.length }, "in"),
    sdk.edits.setStatus({ id: input.periodId }, "closed", ["open"]),
  ] };
}`,
  runtime: "vercel_sandbox",
  kindConfig: {
    permissions: { graphRead: true, graphWrite: false, connectorScopes: [], canMutate: false },
    defaultConfig: { timeoutMs: 5000, maxConcurrency: 1, supportsDryRun: false },
  },
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** 호스트 스텁 — 그래프 읽기만 응답. 쓰기 메서드가 오면 실패시켜 [ACTION-03] 위반을 잡는다. */
function hostWith(graph: { entries: string[]; lines: Record<string, Array<{ debit: number; credit: number }>> }): WorkerSdkHost {
  return {
    invoke: vi.fn(async (method: string, params: unknown) => {
      const p = params as { nodeId: string; direction: string; catalogKey: string };
      if (method === "graph.traverseEdges") {
        if (p.catalogKey === "finance.journal_entry.in_period") {
          return graph.entries.map((id) => ({ id: `e-${id}`, sourceNodeId: id, targetNodeId: PERIOD, properties: {} }));
        }
        return (graph.lines[p.nodeId] ?? []).map((l, i) => ({ id: `l-${p.nodeId}-${i}`, sourceNodeId: p.nodeId, targetNodeId: "acct", properties: l }));
      }
      throw new Error(`unexpected host call ${method}`);
    }),
  };
}

describe("worker edits planner (L3, B 모델)", () => {
  const saved = { VERCEL: process.env.VERCEL, VERCEL_TOKEN: process.env.VERCEL_TOKEN };
  beforeEach(() => { delete process.env.VERCEL; delete process.env.VERCEL_TOKEN; });
  afterEach(() => {
    if (saved.VERCEL === undefined) delete process.env.VERCEL; else process.env.VERCEL = saved.VERCEL;
    if (saved.VERCEL_TOKEN === undefined) delete process.env.VERCEL_TOKEN; else process.env.VERCEL_TOKEN = saved.VERCEL_TOKEN;
  });

  const planner = (host: WorkerSdkHost) =>
    createWorkerEditsPlanner({
      getWorkerByKey: async (k) => (k === "finance.close_period" ? closePeriodWorker : null),
      scope: { teamspaceId: TS, organizationId: ORG, host },
    });

  it("시산표 불일치면 워커가 throw하고 planner가 WorkerPlanError로 올린다 (편집 0)", async () => {
    const host = hostWith({ entries: ["je1"], lines: { je1: [{ debit: 100, credit: 0 }, { debit: 0, credit: 90 }] } });
    await expect(planner(host).plan({ workerKey: "finance.close_period", teamspaceId: TS, parameters: { periodId: PERIOD } }))
      .rejects.toThrow(/시산표 불일치.*100.*90/);
  });

  it("균형이면 assert·assert_count·set_status를 반환한다 — 커밋 호출 0", async () => {
    const host = hostWith({ entries: ["je1", "je2"], lines: {
      je1: [{ debit: 100, credit: 0 }, { debit: 0, credit: 100 }],
      je2: [{ debit: 50, credit: 0 }, { debit: 0, credit: 50 }],
    } });
    const edits = await planner(host).plan({ workerKey: "finance.close_period", teamspaceId: TS, parameters: { periodId: PERIOD } });
    expect(edits.edits.map((e) => e.op)).toEqual(["assert", "assert_count", "set_status"]);
    const c = edits.edits[1];
    if (c?.op === "assert_count") expect(c.equals).toBe(2); // "내가 본 전표 2건"
    // 호스트에 쓰기 호출이 하나도 없다
    const calls = (host.invoke as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(calls.every((m) => m === "graph.traverseEdges")).toBe(true);
  });

  it("워커가 어휘 밖 op을 반환하면 거부한다", async () => {
    const bad: Worker = { ...closePeriodWorker, key: "bad", inputSchema: {}, script: `export default async function () { return { edits: [{ op: "run_sql", sql: "drop table nodes" }] }; }` };
    const p = createWorkerEditsPlanner({ getWorkerByKey: async () => bad, scope: { teamspaceId: TS, organizationId: ORG, host: hostWith({ entries: [], lines: {} }) } });
    await expect(p.plan({ workerKey: "bad", teamspaceId: TS, parameters: {} })).rejects.toThrow(WorkerPlanError);
    await expect(p.plan({ workerKey: "bad", teamspaceId: TS, parameters: {} })).rejects.toThrow(/outside the closed vocabulary/);
  });

  it("모르는 workerKey를 거부한다", async () => {
    await expect(planner(hostWith({ entries: [], lines: {} })).plan({ workerKey: "nope", teamspaceId: TS, parameters: {} }))
      .rejects.toThrow(/not found/);
  });
});
