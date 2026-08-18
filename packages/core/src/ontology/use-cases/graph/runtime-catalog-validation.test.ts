import { describe, expect, it } from "vitest";
import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import { createInMemoryCatalogReadPort } from "../../testing/in-memory-catalog.js";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../../testing/in-memory-graph.js";
import { createEdge, createNode, updateNode } from "./index.js";

/**
 * P0 검증 층 — 런타임 정의 타입(카탈로그 행)에 대한 거부 케이스 [TEST-01].
 * 출하 타입이 아닌 `finance.*` 타입을 행으로 정의하고, graph use-case가
 * property_schema·domain/range를 실제로 강제하는지 확인한다.
 */

const ORG = "00000000-0000-4000-8000-00000000aaaa";
const TS = "00000000-0000-4000-8000-000000000001";
const ID = {
  account: "00000000-0000-4000-8000-000000000101",
  entry: "00000000-0000-4000-8000-000000000102",
  period: "00000000-0000-4000-8000-000000000103",
  postsTo: "00000000-0000-4000-8000-000000000201",
  inPeriod: "00000000-0000-4000-8000-000000000202",
  freeLink: "00000000-0000-4000-8000-000000000203",
};

const nodeRows: NodeCatalogRow[] = [
  {
    id: ID.account,
    organizationId: ORG,
    key: "finance.account",
    label: "계정",
    description: "",
    keywords: [],
    propertySchema: {
      type: "object",
      properties: {
        code: { type: "string", minLength: 1 },
        accountType: { type: "string", enum: ["asset", "liability", "equity", "revenue", "expense"] },
        isActive: { type: "boolean" },
      },
      required: ["code", "accountType"],
    },
  },
  {
    id: ID.entry,
    organizationId: ORG,
    key: "finance.journal_entry",
    label: "전표",
    description: "",
    keywords: [],
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
  {
    id: ID.period,
    organizationId: ORG,
    key: "finance.fiscal_period",
    label: "회계기간",
    description: "",
    keywords: [],
    propertySchema: { type: "object" },
  },
];

const edgeRows: EdgeCatalogRow[] = [
  {
    id: ID.postsTo,
    organizationId: ORG,
    key: "finance.journal_entry.posts_to",
    label: "분개행",
    description: "",
    keywords: [],
    domainCatalogIds: [ID.entry],
    rangeCatalogIds: [ID.account],
    propertySchema: {
      type: "object",
      properties: {
        debit: { type: "integer", minimum: 0 },
        credit: { type: "integer", minimum: 0 },
        lineNo: { type: "integer", minimum: 1 },
      },
      required: ["debit", "credit", "lineNo"],
    },
  },
  {
    id: ID.inPeriod,
    organizationId: ORG,
    key: "finance.journal_entry.in_period",
    label: "기간 귀속",
    description: "",
    keywords: [],
    domainCatalogIds: [ID.entry],
    rangeCatalogIds: [ID.period],
    propertySchema: null,
  },
  {
    id: ID.freeLink,
    organizationId: ORG,
    key: "related_to",
    label: "관련",
    description: "",
    keywords: [],
    domainCatalogIds: [],
    rangeCatalogIds: [],
    propertySchema: null,
  },
];

function setup() {
  const catalog = createInMemoryCatalogReadPort({ nodes: nodeRows, edges: edgeRows });
  const store = createInMemoryGraphStore();
  const graphRead = createInMemoryGraphReadPort(store);
  const graphWrite = createInMemoryGraphWritePort(store);
  const deps = { catalog, graphRead, graphWrite };
  const mk = (catalogKey: string, nodeCatalogId: string, properties: Record<string, unknown>) =>
    graphWrite.createNode({
      teamspaceId: TS,
      nodeCatalogId,
      catalogKey,
      title: catalogKey,
      properties,
      schemaVersion: 1,
    });
  return { deps, mk };
}

async function expectGraphError(p: Promise<unknown>, code: GraphError["code"], re?: RegExp) {
  await expect(p).rejects.toBeInstanceOf(GraphError);
  await p.catch((err: GraphError) => {
    expect(err.code).toBe(code);
    if (re) expect(err.message).toMatch(re);
  });
}

describe("런타임 정의 노드 타입 — property_schema 거부", () => {
  it("필수 필드 누락을 VALIDATION_FAILED로 거부한다", async () => {
    const { deps } = setup();
    await expectGraphError(
      createNode(deps, { teamspaceId: TS, catalogKey: "finance.account", title: "현금", properties: { code: "1000" } }),
      "VALIDATION_FAILED",
      /accountType/,
    );
  });

  it("enum 밖 값을 거부한다", async () => {
    const { deps } = setup();
    await expectGraphError(
      createNode(deps, {
        teamspaceId: TS, catalogKey: "finance.account", title: "x",
        properties: { code: "1000", accountType: "magic" },
      }),
      "VALIDATION_FAILED",
      /accountType/,
    );
  });

  it("date 형식 위반을 거부한다", async () => {
    const { deps } = setup();
    await expectGraphError(
      createNode(deps, {
        teamspaceId: TS, catalogKey: "finance.journal_entry", title: "JE-1",
        properties: { entryNo: "JE-1", postedAt: "yesterday", status: "posted" },
      }),
      "VALIDATION_FAILED",
      /postedAt/,
    );
  });

  it("update-node도 같은 스키마로 거부한다", async () => {
    const { deps, mk } = setup();
    const acct = await mk("finance.account", ID.account, { code: "1000", accountType: "asset" });
    await expectGraphError(
      updateNode(deps, { teamspaceId: TS, nodeId: acct.id, properties: { code: "", accountType: "asset" } }),
      "VALIDATION_FAILED",
      /code/,
    );
  });

  it("빈 스키마 타입은 어떤 객체든 통과시킨다", async () => {
    const { deps } = setup();
    const p = await createNode(deps, {
      teamspaceId: TS, catalogKey: "finance.fiscal_period", title: "2026-08",
      properties: { anything: true },
    });
    expect(p.properties.anything).toBe(true);
  });
});

describe("런타임 정의 엣지 타입 — domain/range 거부 [GRAPH-05]", () => {
  it("domain 위반(계정 → 계정에 posts_to)을 거부한다", async () => {
    const { deps, mk } = setup();
    const a = await mk("finance.account", ID.account, { code: "1", accountType: "asset" });
    const b = await mk("finance.account", ID.account, { code: "2", accountType: "asset" });
    await expectGraphError(
      createEdge(deps, {
        teamspaceId: TS, catalogKey: "finance.journal_entry.posts_to",
        sourceNodeId: a.id, targetNodeId: b.id,
        properties: { debit: 1, credit: 0, lineNo: 1 },
      }),
      "VALIDATION_FAILED",
      /domain/i,
    );
  });

  it("range 위반(전표 → 기간에 posts_to)을 거부한다", async () => {
    const { deps, mk } = setup();
    const je = await mk("finance.journal_entry", ID.entry, { entryNo: "1", postedAt: "2026-08-01", status: "posted" });
    const period = await mk("finance.fiscal_period", ID.period, {});
    await expectGraphError(
      createEdge(deps, {
        teamspaceId: TS, catalogKey: "finance.journal_entry.posts_to",
        sourceNodeId: je.id, targetNodeId: period.id,
        properties: { debit: 1, credit: 0, lineNo: 1 },
      }),
      "VALIDATION_FAILED",
      /range/i,
    );
  });

  it("엣지 property_schema 위반(음수 차변)을 거부한다", async () => {
    const { deps, mk } = setup();
    const je = await mk("finance.journal_entry", ID.entry, { entryNo: "1", postedAt: "2026-08-01", status: "posted" });
    const acct = await mk("finance.account", ID.account, { code: "1", accountType: "asset" });
    await expectGraphError(
      createEdge(deps, {
        teamspaceId: TS, catalogKey: "finance.journal_entry.posts_to",
        sourceNodeId: je.id, targetNodeId: acct.id,
        properties: { debit: -5, credit: 0, lineNo: 1 },
      }),
      "VALIDATION_FAILED",
      /debit/,
    );
  });

  it("domain/range가 비어 있는 엣지 타입은 어떤 쌍이든 허용한다", async () => {
    const { deps, mk } = setup();
    const a = await mk("finance.account", ID.account, { code: "1", accountType: "asset" });
    const p = await mk("finance.fiscal_period", ID.period, {});
    const e = await createEdge(deps, {
      teamspaceId: TS, catalogKey: "related_to", sourceNodeId: a.id, targetNodeId: p.id,
    });
    expect(e.sourceNodeId).toBe(a.id);
  });

  it("올바른 분개행(전표 → 계정)은 통과한다", async () => {
    const { deps, mk } = setup();
    const je = await mk("finance.journal_entry", ID.entry, { entryNo: "1", postedAt: "2026-08-01", status: "posted" });
    const acct = await mk("finance.account", ID.account, { code: "1", accountType: "asset" });
    const e = await createEdge(deps, {
      teamspaceId: TS, catalogKey: "finance.journal_entry.posts_to",
      sourceNodeId: je.id, targetNodeId: acct.id,
      properties: { debit: 1000, credit: 0, lineNo: 1 },
    });
    expect(e.properties.debit).toBe(1000);
  });
});
