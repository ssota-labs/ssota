import { describe, expect, it } from "vitest";
import {
  compilePropertySchema,
  parsePropertySchemaDefinition,
  PropertySchemaCompileError,
  type PropertySchemaDefinition,
} from "./property-schema.js";

/**
 * P0 검증 층 — 런타임 정의 타입의 property_schema를 실제 validator로 만든다.
 * 거부 케이스가 통과 케이스보다 먼저다 [TEST-01].
 */

const invoice: PropertySchemaDefinition = {
  type: "object",
  properties: {
    amount: { type: "number", minimum: 0 },
    currency: { type: "string", enum: ["KRW", "USD"] },
    memo: { type: "string" },
    dueOn: { type: "string", format: "date" },
    tags: { type: "array", items: { type: "string" } },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          qty: { type: "integer", minimum: 1 },
        },
        required: ["sku", "qty"],
      },
    },
  },
  required: ["amount", "currency"],
};

describe("property_schema 거부 케이스", () => {
  const validate = compilePropertySchema(invoice);

  it("필수 필드 누락을 거부한다", () => {
    expect(() => validate({ amount: 100 })).toThrow(/currency/);
  });

  it("타입 불일치를 거부한다", () => {
    expect(() => validate({ amount: "100", currency: "KRW" })).toThrow(/amount/);
  });

  it("enum 밖 값을 거부한다", () => {
    expect(() => validate({ amount: 1, currency: "JPY" })).toThrow(/currency/);
  });

  it("minimum 위반을 거부한다", () => {
    expect(() => validate({ amount: -1, currency: "KRW" })).toThrow(/amount/);
  });

  it("integer에 소수를 거부한다", () => {
    expect(() =>
      validate({ amount: 1, currency: "KRW", lineItems: [{ sku: "a", qty: 1.5 }] }),
    ).toThrow(/qty/);
  });

  it("중첩 객체의 필수 누락을 거부한다", () => {
    expect(() =>
      validate({ amount: 1, currency: "KRW", lineItems: [{ sku: "a" }] }),
    ).toThrow(/qty/);
  });

  it("date 형식 위반을 거부한다", () => {
    expect(() => validate({ amount: 1, currency: "KRW", dueOn: "not-a-date" })).toThrow(
      /dueOn/,
    );
  });

  it("배열 원소 타입 위반을 거부한다", () => {
    expect(() => validate({ amount: 1, currency: "KRW", tags: [1] })).toThrow(/tags/);
  });
});

describe("property_schema 정의 자체의 거부 (닫힌 서브셋)", () => {
  it("지원하지 않는 키워드(oneOf 등)를 거부한다", () => {
    expect(() =>
      parsePropertySchemaDefinition({
        type: "object",
        properties: { x: { oneOf: [{ type: "string" }, { type: "number" }] } },
      }),
    ).toThrow();
  });

  it("$ref를 거부한다", () => {
    expect(() =>
      parsePropertySchemaDefinition({ type: "object", properties: { x: { $ref: "#/foo" } } }),
    ).toThrow();
  });

  it("루트가 object가 아니면 거부한다", () => {
    expect(() => parsePropertySchemaDefinition({ type: "string" })).toThrow();
  });

  it("required에 properties에 없는 키가 있으면 컴파일을 거부한다", () => {
    expect(() =>
      compilePropertySchema({
        type: "object",
        properties: { a: { type: "string" } },
        required: ["b"],
      }),
    ).toThrow(PropertySchemaCompileError);
  });
});

describe("property_schema 통과 케이스", () => {
  const validate = compilePropertySchema(invoice);

  it("유효한 properties를 그대로 돌려준다", () => {
    const input = {
      amount: 1200,
      currency: "USD",
      dueOn: "2026-09-01",
      tags: ["q3"],
      lineItems: [{ sku: "A-1", qty: 2 }],
    };
    expect(validate(input)).toEqual(input);
  });

  it("선언되지 않은 키는 통과시킨다 (롱테일 payload 허용 — ADR JSONB 정책)", () => {
    const out = validate({ amount: 1, currency: "KRW", extra: { anything: true } });
    expect(out.extra).toEqual({ anything: true });
  });

  it("빈 스키마 `{type:'object'}`는 모든 객체를 통과시킨다 (시드 기본값 호환)", () => {
    const v = compilePropertySchema({ type: "object" });
    expect(v({ whatever: 1 })).toEqual({ whatever: 1 });
  });

  it("객체가 아닌 properties는 빈 스키마에서도 거부한다", () => {
    const v = compilePropertySchema({ type: "object" });
    expect(() => v("nope" as unknown as Record<string, unknown>)).toThrow();
  });
});
