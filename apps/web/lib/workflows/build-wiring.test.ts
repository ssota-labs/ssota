import { describe, expect, it } from "vitest";
import { parseActionType } from "@ssota/contracts";
import type { ActionCatalogRow, WorkerIndex } from "@ssota/contracts";
import { buildWiring } from "./build-wiring";

const ORG = "00000000-0000-4000-8000-0000000000aa";

function action(over: Record<string, unknown>): ActionCatalogRow {
  return {
    ...parseActionType({
      key: "finance.post",
      label: "전기",
      parameters: { type: "object" },
      writes: ["finance.journal_entry"],
      edits: { kind: "declarative", edits: [{ op: "create_node", catalogKey: "finance.journal_entry", title: "x", properties: {} }] },
      ...over,
    }),
    id: `id-${String(over.key ?? "finance.post")}`,
    organizationId: ORG,
  };
}

const agent = (id: string, name: string, toolBundles: string[]) => ({ id, name, toolBundles });

const worker = (key: string): WorkerIndex =>
  ({ id: `w-${key}`, key, name: key, description: "", kind: "tool", version: 1 }) as unknown as WorkerIndex;

describe("buildWiring", () => {
  it("스케줄 → 에이전트 → 액션 배선을 만든다", () => {
    const a = agent("00000000-0000-4000-8000-000000000001", "Main", ["graph.write"]);
    const model = buildWiring({
      schedules: [{ id: "s1", cronExpression: "0 9 * * *", enabled: true, agentDefinitionId: a.id, targetType: "agent" }],
      agents: [a],
      workers: [],
      actions: [action({})],
    });

    expect(model.nodes.map((n) => n.kind).sort()).toEqual(["action", "agent", "trigger"]);
    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "trigger:s1", target: `agent:${a.id}` }),
        expect.objectContaining({ source: `agent:${a.id}`, target: "action:finance.post" }),
      ]),
    );
  });

  it("gate 액션은 관문 노드를 앞에 끼우고 호출자는 관문으로 들어간다", () => {
    const a = agent("00000000-0000-4000-8000-000000000002", "Main", ["graph.write"]);
    const model = buildWiring({
      schedules: [],
      agents: [a],
      workers: [],
      actions: [action({ key: "finance.close", label: "마감", gate: true })],
    });

    expect(model.nodes.find((n) => n.kind === "gate")?.id).toBe("gate:finance.close");
    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: `agent:${a.id}`, target: "gate:finance.close" }),
        expect.objectContaining({ source: "gate:finance.close", target: "action:finance.close" }),
      ]),
    );
    // 에이전트가 액션으로 직접 들어가는 간선은 없다
    expect(model.edges.some((e) => e.source === `agent:${a.id}` && e.target === "action:finance.close")).toBe(false);
  });

  it("function-kind 액션은 워커에서 들어오는 간선을 갖는다", () => {
    const model = buildWiring({
      schedules: [],
      agents: [],
      workers: [worker("finance.close_period")],
      actions: [action({ key: "finance.close", label: "마감", edits: { kind: "function", workerKey: "finance.close_period" } })],
    });
    expect(model.edges).toEqual([
      expect.objectContaining({ source: "worker:finance.close_period", target: "action:finance.close", label: "computes" }),
    ]);
  });

  it("read-only 에이전트는 액션으로 가는 간선을 갖지 않는다", () => {
    const a = agent("00000000-0000-4000-8000-000000000003", "Reader", ["graph.read"]);
    const model = buildWiring({ schedules: [], agents: [a], workers: [], actions: [action({})] });
    expect(model.edges).toHaveLength(0);
    expect(model.nodes.find((n) => n.id === `agent:${a.id}`)?.sublabel).toBe("read only");
  });

  it("존재하지 않는 에이전트를 가리키는 스케줄은 간선을 만들지 않는다", () => {
    const model = buildWiring({
      schedules: [{ id: "s1", cronExpression: "* * * * *", enabled: false, agentDefinitionId: "00000000-0000-4000-8000-00000000ffff", targetType: "agent" }],
      agents: [],
      workers: [],
      actions: [],
    });
    expect(model.edges).toHaveLength(0);
    expect(model.nodes[0]?.sublabel).toContain("disabled");
  });
});
