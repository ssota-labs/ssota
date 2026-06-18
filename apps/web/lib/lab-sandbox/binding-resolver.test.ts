import { describe, expect, it } from "vitest";
import { resolveSandboxBindings } from "./binding-resolver";
import { DEFAULT_LAB_SANDBOX } from "./default-fixtures";

describe("resolveSandboxBindings", () => {
  it("resolves query bindings by catalogKey", () => {
    const data = resolveSandboxBindings(DEFAULT_LAB_SANDBOX, {
      rows: { kind: "query", catalogKey: "market_research" },
    });
    expect(Array.isArray(data.rows)).toBe(true);
    expect((data.rows as unknown[]).length).toBe(2);
  });

  it("resolves singleton with ensure", () => {
    const data = resolveSandboxBindings(DEFAULT_LAB_SANDBOX, {
      doc: { kind: "singleton", catalogKey: "roadmap", ensure: true },
    });
    expect(data.doc).toMatchObject({ catalogKey: "roadmap" });
  });
});
