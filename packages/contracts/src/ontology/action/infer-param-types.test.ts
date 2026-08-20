import { describe, expect, it } from "vitest";
import { parseActionType } from "./action-type.js";
import { inferParamNodeTypes, type EdgeTypeRef } from "./infer-param-types.js";

const edges: EdgeTypeRef[] = [
  { key: "finance.posts_to", domainKeys: ["finance.journal_entry"], rangeKeys: ["finance.account"] },
  { key: "free_link", domainKeys: [], rangeKeys: [] },
];

const post = parseActionType({
  key: "finance.post_journal_entry",
  label: "전기",
  parameters: {
    type: "object",
    properties: {
      entryNo: { type: "string" },
      debitAccountId: { type: "string", format: "uuid" },
      creditAccountId: { type: "string", format: "uuid" },
      amount: { type: "integer" },
    },
    required: ["entryNo", "debitAccountId", "creditAccountId", "amount"],
  },
  writes: ["finance.journal_entry", "finance.posts_to"],
  edits: {
    kind: "declarative",
    edits: [
      { op: "create_node", ref: "entry", catalogKey: "finance.journal_entry", title: { $param: "entryNo" }, properties: {} },
      { op: "create_edge", catalogKey: "finance.posts_to", from: { ref: "entry" }, to: { id: { $param: "debitAccountId" } }, properties: { debit: { $param: "amount" }, credit: 0 } },
      { op: "create_edge", catalogKey: "finance.posts_to", from: { ref: "entry" }, to: { id: { $param: "creditAccountId" } }, properties: { debit: 0, credit: { $param: "amount" } } },
    ],
  },
});

describe("inferParamNodeTypes", () => {
  it("엣지 끝점으로 쓰인 파라미터는 그 엣지의 range 타입으로 좁혀진다", () => {
    expect(inferParamNodeTypes(post, edges)).toEqual({
      debitAccountId: ["finance.account"],
      creditAccountId: ["finance.account"],
    });
  });

  it("domain/range가 비어 있으면 좁히지 않는다", () => {
    const free = parseActionType({
      key: "x.link", label: "link",
      parameters: { type: "object", properties: { a: { type: "string", format: "uuid" } } },
      writes: ["free_link"],
      edits: {
        kind: "declarative",
        edits: [{ op: "create_edge", catalogKey: "free_link", from: { id: { $param: "a" } }, to: { id: { $param: "a" } } }],
      },
    });
    expect(inferParamNodeTypes(free, edges)).toEqual({});
  });

  it("set_status 대상은 writes에 객체 타입이 하나일 때만 단정한다", () => {
    const voidEntry = parseActionType({
      key: "finance.void", label: "취소",
      parameters: { type: "object", properties: { entryId: { type: "string", format: "uuid" } }, required: ["entryId"] },
      writes: ["finance.journal_entry"],
      edits: {
        kind: "declarative",
        edits: [{ op: "set_status", node: { id: { $param: "entryId" } }, to: "void", from: ["posted"] }],
      },
    });
    expect(inferParamNodeTypes(voidEntry, edges, ["finance.journal_entry"])).toEqual({
      entryId: ["finance.journal_entry"],
    });
    // 후보가 여럿이면 모호 → 좁히지 않는다
    expect(inferParamNodeTypes(voidEntry, edges, ["finance.journal_entry", "finance.account"])).toEqual({});
  });

  it("function-kind 액션은 유도하지 않는다", () => {
    const fn = parseActionType({
      key: "finance.close", label: "마감",
      parameters: { type: "object", properties: { periodId: { type: "string", format: "uuid" } } },
      writes: ["finance.fiscal_period"],
      edits: { kind: "function", workerKey: "finance.close_period" },
    });
    expect(inferParamNodeTypes(fn, edges, ["finance.fiscal_period"])).toEqual({});
  });
});
