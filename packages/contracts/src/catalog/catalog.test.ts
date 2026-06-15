import { describe, expect, it } from "vitest";
import {
  EDGE_TYPES,
  NODE_TYPES,
  getNodeTypeEntry,
  parseNodeProperties,
} from "./index.js";

describe("v2.7 catalog SSOT", () => {
  it("defines 34 node types and 16 edge types", () => {
    expect(NODE_TYPES).toHaveLength(34);
    expect(EDGE_TYPES).toHaveLength(16);
  });

  it("parses hypothesis properties", () => {
    const parsed = parseNodeProperties("hypothesis", {
      status: "validated",
      summary: "Users want faster onboarding",
    });
    expect(parsed.status).toBe("validated");
  });

  it("rejects invalid hypothesis status", () => {
    expect(() =>
      parseNodeProperties("hypothesis", { status: "invalid" }),
    ).toThrow();
  });

  it("parses roadmap properties with kind and year", () => {
    const parsed = parseNodeProperties("roadmap", {
      kind: "quarter",
      year: 2026,
      quarter: 1,
      doc_status: "draft",
    });
    expect(parsed.kind).toBe("quarter");
    expect(parsed.year).toBe(2026);
    expect(parsed.quarter).toBe(1);
  });

  it("rejects annual roadmap with quarter set", () => {
    expect(() =>
      parseNodeProperties("roadmap", {
        kind: "annual",
        year: 2026,
        quarter: 1,
      }),
    ).toThrow();
  });

  it("exposes catalog entries for representative types", () => {
    expect(getNodeTypeEntry("initiative")?.mutability).toBe("living");
    expect(getNodeTypeEntry("pull_request")?.mutability).toBe("immutable");
    expect(getNodeTypeEntry("unknown_type")).toBeNull();
  });
});
