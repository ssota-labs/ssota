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

  it("exposes catalog entries for representative types", () => {
    expect(getNodeTypeEntry("initiative")?.mutability).toBe("living");
    expect(getNodeTypeEntry("pull_request")?.mutability).toBe("immutable");
    expect(getNodeTypeEntry("unknown_type")).toBeNull();
  });

  it("parses objective priority enum", () => {
    const parsed = parseNodeProperties("objective", {
      period: "Q2 2026",
      priority: "high",
      status: "on_track",
    });
    expect(parsed.priority).toBe("high");
    expect(parsed.status).toBe("on_track");
  });

  it("rejects invalid objective priority", () => {
    expect(() =>
      parseNodeProperties("objective", { priority: "urgent" }),
    ).toThrow();
  });

  it("parses key_result baseline and direction", () => {
    const parsed = parseNodeProperties("key_result", {
      baseline: 2,
      target: 4,
      direction: "increase",
      unit: "%",
    });
    expect(parsed.baseline).toBe(2);
    expect(parsed.direction).toBe("increase");
  });

  it("rejects invalid key_result direction", () => {
    expect(() =>
      parseNodeProperties("key_result", { direction: "up" }),
    ).toThrow();
  });

  it("parses metric_snapshot snapshot_kind", () => {
    const parsed = parseNodeProperties("metric_snapshot", {
      value: 42,
      snapshot_kind: "baseline",
      source: "manual",
    });
    expect(parsed.snapshot_kind).toBe("baseline");
  });

  it("rejects invalid metric_snapshot snapshot_kind", () => {
    expect(() =>
      parseNodeProperties("metric_snapshot", { snapshot_kind: "weekly" }),
    ).toThrow();
  });
});
