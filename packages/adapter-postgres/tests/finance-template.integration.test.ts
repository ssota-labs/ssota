import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runAction, type ActionActor } from "@ssota/core";
import {
  applyTemplate,
  createConsolePort,
  createDb,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
  FINANCE_TEMPLATE,
} from "../src/index.js";

/**
 * Finance 도메인 팩 — 템플릿을 적용한 뒤 원장이 **액션으로만** 움직이는지 [TEST-01].
 *   (a) 3 object + 3 link + 3 action이 심긴다 (link는 domain/range가 해석된다)
 *   (b) post_journal_entry가 전표 1 + 분개행 2를 한 트랜잭션으로 만들고 차·대가 같다
 *   (c) void는 posted에서만 — 재호출은 PRECONDITION_FAILED
 *   (d) close_period(L3)는 planner 없이 커밋되지 않는다
 *   (e) 계정이 아닌 노드를 대변 계정으로 주면 range 위반으로 거부되고 전표도 남지 않는다
 */

const actor: ActionActor = { id: null, kind: "system", role: null };

describe("finance template integration", () => {
  let skip = false;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let teamspaceId: string;
  let ports: ReturnType<typeof createGraphPorts>;
  let cash: string;
  let revenue: string;

  const entryNo = () => `JE-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    try {
      const bundle = createDb();
      client = bundle.client;
      const consolePort = createConsolePort(bundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      const project = org ? await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG) : null;
      if (!org || !project) { skip = true; return; }
      teamspaceId = project.id;

      await applyTemplate(bundle.db, teamspaceId, FINANCE_TEMPLATE);
      ports = createGraphPorts(bundle.db, { organizationId: org.id, teamspaceId });

      const accountCatalogId = (await ports.catalog.listNodeCatalog())
        .find((n) => n.key === "finance.account")!.id;
      const mkAccount = async (code: string, accountType: string) =>
        (await ports.graphWrite.createNode({
          teamspaceId,
          nodeCatalogId: accountCatalogId,
          catalogKey: "finance.account",
          title: code,
          properties: { code, accountType },
          schemaVersion: 1,
        })).id;
      cash = await mkAccount(`1000-${randomUUID().slice(0, 4)}`, "asset");
      revenue = await mkAccount(`4000-${randomUUID().slice(0, 4)}`, "revenue");
    } catch (err) {
      console.error("finance-template integration setup failed", err);
      skip = true;
    }
  });
  afterAll(async () => { await client?.end(); });
  beforeEach((ctx) => { if (skip) ctx.skip(); });

  const deps = () => ({
    actions: ports.actions,
    catalog: ports.catalog,
    graphRead: ports.graphRead,
    commit: ports.commit,
  });

  const post = (params: Record<string, unknown>) =>
    runAction(deps(), { teamspaceId, actionKey: "finance.post_journal_entry", parameters: params }, actor);

  it("(a) 타입 3 + 링크 3 + 액션 3이 심기고 링크의 domain/range가 해석된다", async () => {
    const nodes = (await ports.catalog.listNodeCatalog()).map((n) => n.key);
    const edges = await ports.catalog.listEdgeCatalog();
    const acts = (await ports.actions.listActionRows()).map((a) => a.key);

    expect(nodes).toEqual(expect.arrayContaining([
      "finance.account", "finance.journal_entry", "finance.fiscal_period",
    ]));
    expect(edges.map((e) => e.key)).toEqual(expect.arrayContaining([
      "finance.posts_to", "finance.in_period", "finance.reverses",
    ]));
    expect(acts).toEqual(expect.arrayContaining([
      "finance.post_journal_entry", "finance.void_journal_entry", "finance.close_period",
    ]));

    const postsTo = edges.find((e) => e.key === "finance.posts_to")!;
    const entryId = (await ports.catalog.listNodeCatalog()).find((n) => n.key === "finance.journal_entry")!.id;
    const accountId = (await ports.catalog.listNodeCatalog()).find((n) => n.key === "finance.account")!.id;
    expect(postsTo.domainCatalogIds).toEqual([entryId]);
    expect(postsTo.rangeCatalogIds).toEqual([accountId]);
  });

  it("(b) 전표 전기는 노드 1 + 분개행 2를 만들고 차·대가 같다", async () => {
    const res = await post({
      entryNo: entryNo(), postedAt: "2026-08-19",
      debitAccountId: cash, creditAccountId: revenue, amount: 15_000,
    });

    expect(res.result.createdNodeIds).toHaveLength(1);
    expect(res.result.createdEdgeIds).toHaveLength(2);

    const lines = await ports.graphRead.traverseEdges({
      teamspaceId, nodeId: res.result.createdNodeIds[0]!,
      direction: "outgoing", catalogKey: "finance.posts_to",
    });
    expect(lines).toHaveLength(2);
    expect(lines.reduce((n, e) => n + Number(e.properties.debit ?? 0), 0)).toBe(15_000);
    expect(lines.reduce((n, e) => n + Number(e.properties.credit ?? 0), 0)).toBe(15_000);
  });

  it("(c) void는 posted에서만 — 재호출은 PRECONDITION_FAILED", async () => {
    const posted = await post({
      entryNo: entryNo(), postedAt: "2026-08-19",
      debitAccountId: cash, creditAccountId: revenue, amount: 1_000,
    });
    const entryId = posted.result.createdNodeIds[0]!;

    await runAction(deps(), {
      teamspaceId, actionKey: "finance.void_journal_entry",
      parameters: { entryId, reason: "오기입" },
    }, actor);
    const node = await ports.graphRead.getNode({ teamspaceId, nodeId: entryId });
    expect(node?.properties.status).toBe("void");
    expect(node?.properties.voidReason).toBe("오기입");

    await expect(
      runAction(deps(), {
        teamspaceId, actionKey: "finance.void_journal_entry",
        parameters: { entryId, reason: "again" },
      }, actor),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("(d) close_period는 워커 planner 없이 커밋되지 않는다", async () => {
    const periodCatalogId = (await ports.catalog.listNodeCatalog())
      .find((n) => n.key === "finance.fiscal_period")!.id;
    const period = await ports.graphWrite.createNode({
      teamspaceId, nodeCatalogId: periodCatalogId, catalogKey: "finance.fiscal_period",
      title: "2026-08", properties: { code: `2026-08-${randomUUID().slice(0, 4)}`, status: "open" },
      schemaVersion: 1,
    });
    await expect(
      runAction(deps(), {
        teamspaceId, actionKey: "finance.close_period", parameters: { periodId: period.id },
      }, actor),
    ).rejects.toThrow(/planner/i);
  });

  it("(e) 계정이 아닌 노드를 대변 계정으로 주면 거부되고 전표도 남지 않는다", async () => {
    const before = (await ports.graphRead.queryNodes({
      teamspaceId, catalogKey: "finance.journal_entry", limit: 500,
    })).length;

    const periodCatalogId = (await ports.catalog.listNodeCatalog())
      .find((n) => n.key === "finance.fiscal_period")!.id;
    const notAnAccount = await ports.graphWrite.createNode({
      teamspaceId, nodeCatalogId: periodCatalogId, catalogKey: "finance.fiscal_period",
      title: "2026-09", properties: { code: `2026-09-${randomUUID().slice(0, 4)}`, status: "open" },
      schemaVersion: 1,
    });

    await expect(
      post({
        entryNo: entryNo(), postedAt: "2026-08-19",
        debitAccountId: cash, creditAccountId: notAnAccount.id, amount: 500,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    const after = (await ports.graphRead.queryNodes({
      teamspaceId, catalogKey: "finance.journal_entry", limit: 500,
    })).length;
    expect(after).toBe(before);
  });
});
