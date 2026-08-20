import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GraphError, runAction, type ActionActor } from "@ssota/core";
import {
  createConsolePort,
  createDb,
  createDbActionCatalogPort,
  createDbCatalogWritePort,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";

/**
 * B 슬라이스 — action_catalog 행이 runAction의 ActionReadPort로 동작한다 [TEST-01].
 *   (a) upsert by key → listActionRows/getActionRowByKey/getActionByKey
 *   (b) org 격리 — 다른 org 스코프 포트에서는 보이지 않는다
 *   (c) 저장된 액션을 runAction이 실행한다 (declarative) → 노드 생성 + 감사
 *   (d) 거부 — 없는 키 NOT_FOUND, 파라미터 위반 VALIDATION_FAILED, function-kind + planner 없음
 *   (e) 잘못된 정의는 upsert에서 거부된다 (스키마 검증)
 */

const actor: ActionActor = { id: null, kind: "system", role: null };
const RUN = randomUUID().slice(0, 8);
const key = (k: string) => `b_${RUN}.${k}`;

describe("action catalog integration", () => {
  let skip = false;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let organizationId: string;
  let teamspaceId: string;
  let ports: ReturnType<typeof createGraphPorts>;

  beforeAll(async () => {
    try {
      const bundle = createDb();
      client = bundle.client;
      const consolePort = createConsolePort(bundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      const project = org ? await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG) : null;
      if (!org || !project) { skip = true; return; }
      organizationId = org.id;
      teamspaceId = project.id;
      const catalogWrite = createDbCatalogWritePort(bundle.db, { organizationId });
      await catalogWrite.upsertNodeCatalog({
        key: key("memo"), label: "메모",
        propertySchema: { type: "object", properties: { body: { type: "string", minLength: 1 } }, required: ["body"] },
      });
      ports = createGraphPorts(bundle.db, { organizationId, teamspaceId });
    } catch (err) {
      console.error("action-catalog integration setup failed", err);
      skip = true;
    }
  });
  afterAll(async () => { await client?.end(); });
  beforeEach((ctx) => { if (skip) ctx.skip(); });

  const addMemo = () => ({
    key: `${key("memo")}.add`,
    label: "메모 추가",
    parameters: { type: "object", properties: { body: { type: "string", minLength: 1 } }, required: ["body"] },
    writes: [key("memo")],
    edits: {
      kind: "declarative" as const,
      edits: [{ op: "create_node", catalogKey: key("memo"), title: { $param: "body" }, properties: { body: { $param: "body" } } }],
    },
  });

  it("(a) upsert by key → 목록·조회에 나타나고 재-upsert는 갱신한다", async () => {
    const row = await ports.actions.upsertAction(addMemo());
    expect(row.organizationId).toBe(organizationId);
    expect(row.edits.kind).toBe("declarative");
    const again = await ports.actions.upsertAction({ ...addMemo(), label: "메모 추가 v2" });
    expect(again.id).toBe(row.id);
    expect((await ports.actions.getActionRowByKey(row.key))?.label).toBe("메모 추가 v2");
    expect((await ports.actions.listActionRows()).some((a) => a.key === row.key)).toBe(true);
    const type = await ports.actions.getActionByKey(row.key);
    expect(type && "id" in type).toBe(false);
  });

  it("(b) 다른 org 스코프에서는 보이지 않는다", async () => {
    await ports.actions.upsertAction(addMemo());
    const other = createDbActionCatalogPort(createDb().db, { organizationId: randomUUID() });
    expect(await other.getActionByKey(`${key("memo")}.add`)).toBeNull();
  });

  it("(c) 저장된 액션을 runAction이 실행한다 — 노드 + 감사", async () => {
    await ports.actions.upsertAction(addMemo());
    const res = await runAction(
      { actions: ports.actions, catalog: ports.catalog, graphRead: ports.graphRead, commit: ports.commit },
      { teamspaceId, actionKey: `${key("memo")}.add`, parameters: { body: "hello" } },
      actor,
    );
    expect(res.result.createdNodeIds).toHaveLength(1);
    const node = await ports.graphRead.getNode({ teamspaceId, nodeId: res.result.createdNodeIds[0]! });
    expect(node?.properties.body).toBe("hello");
  });

  it("(d) 없는 키·파라미터 위반·planner 없는 function-kind를 거부한다", async () => {
    await ports.actions.upsertAction(addMemo());
    await ports.actions.upsertAction({
      key: `${key("memo")}.close`, label: "닫기", parameters: { type: "object" }, writes: [key("memo")],
      edits: { kind: "function", workerKey: "nope" },
    });
    const deps = { actions: ports.actions, catalog: ports.catalog, graphRead: ports.graphRead, commit: ports.commit };
    await expect(runAction(deps, { teamspaceId, actionKey: `${key("memo")}.missing`, parameters: {} }, actor))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(runAction(deps, { teamspaceId, actionKey: `${key("memo")}.add`, parameters: { body: "" } }, actor))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(runAction(deps, { teamspaceId, actionKey: `${key("memo")}.close`, parameters: {} }, actor))
      .rejects.toBeInstanceOf(GraphError);
  });

  it("(e) 잘못된 정의(빈 writes·나쁜 key)는 upsert에서 거부된다", async () => {
    await expect(ports.actions.upsertAction({ ...addMemo(), writes: [] })).rejects.toThrow();
    await expect(ports.actions.upsertAction({ ...addMemo(), key: "NoDots" })).rejects.toThrow();
  });
});
