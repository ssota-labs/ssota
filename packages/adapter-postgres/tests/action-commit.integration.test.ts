import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parseActionType, type ActionType } from "@ssota/contracts";
import {
  GraphError,
  runAction,
  type ActionActor,
  type ActionReadPort,
} from "@ssota/core";
import * as schema from "../src/db/schema.js";
import {
  createConsolePort,
  createDb,
  createDbCatalogWritePort,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";

/**
 * P1 액션 봉투 — DB 통합 [TEST-01].
 * 인메모리로는 증명할 수 없는 것을 실제 Postgres에서 검증한다:
 *   (a) 트랜잭션 롤백 — 3번째 편집 실패 시 앞선 INSERT가 DB에 남지 않는다
 *   (b) 감사 원자성 — 편집이 롤백되면 action_audits 행도 없다
 *   (c) 멱등 — 같은 idempotencyKey 재호출은 unique index 위에서 replay된다
 *   (d) FOR UPDATE 직렬화 — 같은 aggregate에 동시 쓰기 2건 중 하나만 성공한다
 */

const member: ActionActor = { id: null, kind: "system", role: null };
const RUN = randomUUID().slice(0, 8);
const key = (k: string) => `p1_${RUN}.${k}`;

describe("action commit integration", () => {
  let skip = false;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let db: ReturnType<typeof createDb>["db"] | undefined;
  let organizationId: string;
  let teamspaceId: string;
  let ports: ReturnType<typeof createGraphPorts>;
  let ids: { entry: string; account: string; postsTo: string };

  const postEntry = (): ActionType =>
    parseActionType({
      key: `${key("finance")}.post_journal_entry`,
      label: "분개 전기",
      parameters: {
        type: "object",
        properties: {
          entryNo: { type: "string" },
          debitAccountId: { type: "string", format: "uuid" },
          creditAccountId: { type: "string", format: "uuid" },
          amount: { type: "integer", minimum: 1 },
        },
        required: ["entryNo", "debitAccountId", "creditAccountId", "amount"],
      },
      writes: [key("journal_entry"), key("posts_to")],
      edits: {
        kind: "declarative",
        edits: [
          { op: "create_node", ref: "entry", catalogKey: key("journal_entry"), title: { $param: "entryNo" },
            properties: { entryNo: { $param: "entryNo" }, status: "posted" } },
          { op: "create_edge", catalogKey: key("posts_to"), from: { ref: "entry" }, to: { id: { $param: "debitAccountId" } },
            properties: { debit: { $param: "amount" }, credit: 0 } },
          { op: "create_edge", catalogKey: key("posts_to"), from: { ref: "entry" }, to: { id: { $param: "creditAccountId" } },
            properties: { debit: 0, credit: { $param: "amount" } } },
        ],
      },
    });

  const voidEntry = (): ActionType =>
    parseActionType({
      key: `${key("finance")}.void_journal_entry`,
      label: "전표 취소",
      parameters: { type: "object", properties: { entryId: { type: "string", format: "uuid" } }, required: ["entryId"] },
      writes: [key("journal_entry")],
      aggregateRootParam: "entryId",
      edits: { kind: "declarative", edits: [
        { op: "set_status", node: { id: { $param: "entryId" } }, to: "void", from: ["posted"] },
      ] },
    });

  beforeAll(async () => {
    try {
      const bundle = createDb();
      client = bundle.client;
      db = bundle.db;
      const consolePort = createConsolePort(bundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      const project = org ? await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG) : null;
      if (!org || !project) { skip = true; return; }
      organizationId = org.id;
      teamspaceId = project.id;

      // 런타임 정의 finance 타입 — 테스트 런마다 unique key
      const catalogWrite = createDbCatalogWritePort(bundle.db, { organizationId });
      const entry = await catalogWrite.upsertNodeCatalog({
        key: key("journal_entry"), label: "전표",
        propertySchema: { type: "object", properties: {
          entryNo: { type: "string" }, status: { type: "string", enum: ["posted", "void"] } }, required: ["entryNo", "status"] },
      });
      const account = await catalogWrite.upsertNodeCatalog({
        key: key("account"), label: "계정",
        propertySchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
      });
      const period = await catalogWrite.upsertNodeCatalog({ key: key("period"), label: "기간", propertySchema: { type: "object" } });
      const postsTo = await catalogWrite.upsertEdgeCatalog({
        key: key("posts_to"), label: "분개행",
        domainCatalogIds: [entry.id], rangeCatalogIds: [account.id],
        propertySchema: { type: "object", properties: {
          debit: { type: "integer", minimum: 0 }, credit: { type: "integer", minimum: 0 } }, required: ["debit", "credit"] },
      });
      ids = { entry: entry.id, account: account.id, postsTo: postsTo.id };
      void period;
      ports = createGraphPorts(bundle.db, { organizationId, teamspaceId });
    } catch (err) {
      console.error("action-commit integration setup failed", err);
      skip = true;
    }
  });

  afterAll(async () => { await client?.end(); });
  beforeEach((ctx) => { if (skip) ctx.skip(); });

  const registry = (actions: ActionType[]): ActionReadPort => ({
    async getActionByKey(k) { return actions.find((a) => a.key === k) ?? null; },
    async listActions() { return actions; },
  });
  function deps() {
    return {
      actions: registry([postEntry(), voidEntry()]),
      catalog: ports.catalog,
      graphRead: ports.graphRead,
      commit: ports.commit,
    };
  }
  async function mkAccount(code: string) {
    return ports.graphWrite.createNode({ teamspaceId, nodeCatalogId: ids.account, catalogKey: key("account"), title: code, properties: { code }, schemaVersion: 1 });
  }
  async function mkPeriod() {
    const [row] = await db!.select().from(schema.nodeCatalog).where(and(eq(schema.nodeCatalog.organizationId, organizationId), eq(schema.nodeCatalog.key, key("period"))));
    return ports.graphWrite.createNode({ teamspaceId, nodeCatalogId: row!.id, catalogKey: key("period"), title: "p", properties: {}, schemaVersion: 1 });
  }
  const countNodes = async (catalogId: string) =>
    (await db!.select({ n: sql<number>`count(*)::int` }).from(schema.nodes).where(and(eq(schema.nodes.teamspaceId, teamspaceId), eq(schema.nodes.nodeCatalogId, catalogId))))[0]!.n;
  const countAudits = async () =>
    (await db!.select({ n: sql<number>`count(*)::int` }).from(schema.actionAudits).where(and(eq(schema.actionAudits.teamspaceId, teamspaceId), sql`action_key like ${`p1_${RUN}.%`}`)))[0]!.n;

  it("(a)(b) 3번째 편집(range 위반)이 실패하면 전표 노드도 감사 기록도 DB에 없다", async () => {
    const cash = await mkAccount("1000");
    const period = await mkPeriod();
    const entriesBefore = await countNodes(ids.entry);
    const auditsBefore = await countAudits();

    await expect(
      runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.post_journal_entry`,
        parameters: { entryNo: "JE-X", debitAccountId: cash.id, creditAccountId: period.id, amount: 100 } }, member),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    expect(await countNodes(ids.entry)).toBe(entriesBefore);
    expect(await countAudits()).toBe(auditsBefore);
  });

  it("전표 + 분개행 2건이 커밋되고 감사 행이 같은 내용으로 남는다", async () => {
    const cash = await mkAccount("1000"); const sales = await mkAccount("4000");
    const out = await runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.post_journal_entry`,
      parameters: { entryNo: "JE-1", debitAccountId: cash.id, creditAccountId: sales.id, amount: 1200 } }, member);

    expect(out.result.createdNodeIds).toHaveLength(1);
    expect(out.result.createdEdgeIds).toHaveLength(2);
    const [audit] = await db!.select().from(schema.actionAudits).where(eq(schema.actionAudits.id, out.auditId));
    expect(audit?.actionKey).toBe(`${key("finance")}.post_journal_entry`);
    expect((audit?.result as { createdEdgeIds: string[] }).createdEdgeIds).toEqual(out.result.createdEdgeIds);
    expect((audit?.parameters as { amount: number }).amount).toBe(1200);
  });

  it("(c) 같은 idempotencyKey 재호출은 두 번 쓰지 않는다", async () => {
    const cash = await mkAccount("1000"); const sales = await mkAccount("4000");
    const params = { entryNo: "JE-IDEM", debitAccountId: cash.id, creditAccountId: sales.id, amount: 7 };
    const idem = `idem-${randomUUID()}`;
    const first = await runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.post_journal_entry`, parameters: params, idempotencyKey: idem }, member);
    const entriesAfter = await countNodes(ids.entry);
    const second = await runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.post_journal_entry`, parameters: params, idempotencyKey: idem }, member);
    expect(second.replayed).toBe(true);
    expect(second.result.createdNodeIds).toEqual(first.result.createdNodeIds);
    expect(await countNodes(ids.entry)).toBe(entriesAfter);
  });

  it("(d) 같은 전표에 동시 void 2건 — FOR UPDATE로 직렬화되어 하나만 성공한다", async () => {
    const cash = await mkAccount("1000"); const sales = await mkAccount("4000");
    const posted = await runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.post_journal_entry`,
      parameters: { entryNo: "JE-RACE", debitAccountId: cash.id, creditAccountId: sales.id, amount: 1 } }, member);
    const entryId = posted.result.refs.entry!;

    // 두 커넥션이 동시에 같은 aggregate에 쓴다. 락이 없으면 둘 다 from:["posted"]를 보고 둘 다 성공한다.
    const results = await Promise.allSettled([
      runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.void_journal_entry`, parameters: { entryId } }, member),
      runAction(deps(), { teamspaceId, actionKey: `${key("finance")}.void_journal_entry`, parameters: { entryId } }, member),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.reason).toBeInstanceOf(GraphError);
    expect((failed[0]!.reason as GraphError).code).toBe("PRECONDITION_FAILED"); // 두 번째가 락 뒤에 'void'를 본다

    const [row] = await db!.select().from(schema.nodes).where(eq(schema.nodes.id, entryId));
    expect((row?.properties as { status: string }).status).toBe("void");
    // 감사도 정확히 1건 (성공한 것만)
    const audits = await db!.select().from(schema.actionAudits).where(and(eq(schema.actionAudits.teamspaceId, teamspaceId), eq(schema.actionAudits.actionKey, `${key("finance")}.void_journal_entry`)));
    expect(audits.filter((a) => (a.parameters as { entryId: string }).entryId === entryId)).toHaveLength(1);
  });
});
