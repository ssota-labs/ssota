import { describe, expect, it } from "vitest";
import { parseActionType, type ActionType } from "./action-type.js";
import { ParamSubstitutionError, substituteDeclarativeEdits } from "./substitute-params.js";

const CASH = "00000000-0000-4000-8000-000000000001";
const SALES = "00000000-0000-4000-8000-000000000002";

/** 액션 1 — post_journal_entry를 L2 declarative만으로 선언한 모습. */
const postJournalEntry: ActionType = parseActionType({
  key: "finance.post_journal_entry",
  label: "분개 전기",
  parameters: {
    type: "object",
    properties: {
      entryNo: { type: "string" },
      postedAt: { type: "string", format: "date" },
      debitAccountId: { type: "string", format: "uuid" },
      creditAccountId: { type: "string", format: "uuid" },
      amount: { type: "integer", minimum: 1 },
    },
    required: ["entryNo", "postedAt", "debitAccountId", "creditAccountId", "amount"],
  },
  writes: ["finance.journal_entry", "finance.journal_entry.posts_to"],
  requires: { roles: ["member"] },
  criteria: ["finance.period_open"],
  edits: {
    kind: "declarative",
    edits: [
      {
        op: "create_node",
        ref: "entry",
        catalogKey: "finance.journal_entry",
        title: { $param: "entryNo" },
        properties: { entryNo: { $param: "entryNo" }, postedAt: { $param: "postedAt" }, status: "posted" },
      },
      {
        op: "create_edge",
        catalogKey: "finance.journal_entry.posts_to",
        from: { ref: "entry" },
        to: { id: { $param: "debitAccountId" } },
        properties: { debit: { $param: "amount" }, credit: 0, lineNo: 1 },
      },
      {
        op: "create_edge",
        catalogKey: "finance.journal_entry.posts_to",
        from: { ref: "entry" },
        to: { id: { $param: "creditAccountId" } },
        properties: { debit: 0, credit: { $param: "amount" }, lineNo: 2 },
      },
    ],
  },
});

describe("ActionType 선언 — 거부", () => {
  it("도메인 접두사 없는 key를 거부한다", () => {
    expect(() => parseActionType({ ...postJournalEntry, key: "post_entry" })).toThrow(/action key/);
  });

  it("writes가 비어 있으면 거부한다", () => {
    expect(() => parseActionType({ ...postJournalEntry, writes: [] })).toThrow();
  });

  it("parameters가 닫힌 서브셋 밖이면 거부한다", () => {
    expect(() =>
      parseActionType({
        ...postJournalEntry,
        parameters: { type: "object", properties: { x: { oneOf: [] } } },
      }),
    ).toThrow();
  });

  it("edits.kind가 declarative/function 외면 거부한다", () => {
    expect(() =>
      parseActionType({ ...postJournalEntry, edits: { kind: "script", code: "…" } }),
    ).toThrow();
  });

  it("미지 필드를 거부한다 (strict)", () => {
    expect(() => parseActionType({ ...postJournalEntry, onSuccess: "notify" })).toThrow();
  });
});

describe("declarative 치환 — 거부", () => {
  const edits = postJournalEntry.edits;
  if (edits.kind !== "declarative") throw new Error("fixture");

  it("없는 파라미터 참조를 거부한다", () => {
    expect(() =>
      substituteDeclarativeEdits(edits, { entryNo: "JE-1", postedAt: "2026-08-01" }),
    ).toThrow(ParamSubstitutionError);
  });

  it("치환 결과가 GraphEdits 스키마에 어긋나면 거부한다 (id 자리에 non-uuid)", () => {
    expect(() =>
      substituteDeclarativeEdits(edits, {
        entryNo: "JE-1", postedAt: "2026-08-01",
        debitAccountId: "not-a-uuid", creditAccountId: SALES, amount: 100,
      }),
    ).toThrow();
  });
});

describe("declarative 치환 — 통과", () => {
  it("파라미터를 꽂아 GraphEdits 3건을 만든다", () => {
    const edits = postJournalEntry.edits;
    if (edits.kind !== "declarative") throw new Error("fixture");
    const out = substituteDeclarativeEdits(edits, {
      entryNo: "JE-1", postedAt: "2026-08-01",
      debitAccountId: CASH, creditAccountId: SALES, amount: 1200,
    });
    expect(out.edits).toHaveLength(3);
    const [n, e1, e2] = out.edits;
    expect(n?.op).toBe("create_node");
    if (n?.op === "create_node") expect(n.title).toBe("JE-1");
    if (e1?.op === "create_edge") expect(e1.properties.debit).toBe(1200);
    if (e2?.op === "create_edge") expect(e2.properties.credit).toBe(1200);
  });
});
