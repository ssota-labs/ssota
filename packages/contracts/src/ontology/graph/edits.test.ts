import { describe, expect, it } from "vitest";
import { GRAPH_EDIT_OPS, parseGraphEdits } from "./edits.js";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";

describe("GraphEdits 닫힌 어휘 — 거부", () => {
  it("모르는 op를 거부한다", () => {
    expect(() =>
      parseGraphEdits({ edits: [{ op: "run_sql", sql: "drop table nodes" }] }),
    ).toThrow();
  });

  it("op별 미지 필드를 거부한다 (strict)", () => {
    expect(() =>
      parseGraphEdits({
        edits: [{ op: "create_node", catalogKey: "x", title: "t", where: "1=1" }],
      }),
    ).toThrow();
  });

  it("선언 전 ref 사용을 거부한다", () => {
    expect(() =>
      parseGraphEdits({
        edits: [
          { op: "create_edge", catalogKey: "e", from: { ref: "entry" }, to: { id: A } },
          { op: "create_node", ref: "entry", catalogKey: "n", title: "t" },
        ],
      }),
    ).toThrow(/used before it is declared/);
  });

  it("중복 ref 선언을 거부한다", () => {
    expect(() =>
      parseGraphEdits({
        edits: [
          { op: "create_node", ref: "x", catalogKey: "n", title: "a" },
          { op: "create_node", ref: "x", catalogKey: "n", title: "b" },
        ],
      }),
    ).toThrow(/declared twice/);
  });

  it("id와 ref를 동시에 준 노드 참조를 거부한다", () => {
    expect(() =>
      parseGraphEdits({
        edits: [{ op: "set_status", node: { id: A, ref: "x" }, to: "posted" }],
      }),
    ).toThrow();
  });

  it("빈 배치를 거부한다", () => {
    expect(() => parseGraphEdits({ edits: [] })).toThrow();
  });

  it("snake_case가 아닌 ref를 거부한다", () => {
    expect(() =>
      parseGraphEdits({
        edits: [{ op: "create_node", ref: "MyEntry", catalogKey: "n", title: "t" }],
      }),
    ).toThrow(/snake_case/);
  });
});

describe("GraphEdits — 통과", () => {
  it("전표 + 분개행 2건을 ref로 연결한 배치를 파싱한다", () => {
    const edits = parseGraphEdits({
      edits: [
        {
          op: "create_node",
          ref: "entry",
          catalogKey: "finance.journal_entry",
          title: "JE-1",
          properties: { entryNo: "JE-1", postedAt: "2026-08-01", status: "posted" },
        },
        {
          op: "create_edge",
          catalogKey: "finance.journal_entry.posts_to",
          from: { ref: "entry" },
          to: { id: A },
          properties: { debit: 1000, credit: 0, lineNo: 1 },
        },
        {
          op: "create_edge",
          catalogKey: "finance.journal_entry.posts_to",
          from: { ref: "entry" },
          to: { id: B },
          properties: { debit: 0, credit: 1000, lineNo: 2 },
        },
      ],
    });
    expect(edits.edits).toHaveLength(3);
  });

  it("set_status의 from 가드와 field 기본값을 파싱한다", () => {
    const e = parseGraphEdits({
      edits: [{ op: "set_status", node: { id: A }, to: "void", from: ["posted"] }],
    });
    const op = e.edits[0];
    expect(op?.op).toBe("set_status");
    if (op?.op === "set_status") expect(op.field).toBe("status");
  });

  it("op 목록이 5개로 닫혀 있다", () => {
    expect(GRAPH_EDIT_OPS).toEqual([
      "create_node",
      "update_properties",
      "create_edge",
      "delete_edge",
      "set_status",
    ]);
  });
});
