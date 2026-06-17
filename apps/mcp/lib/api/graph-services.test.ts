import { describe, expect, it } from "vitest";
import {
  getNodeTypeForMcp,
  listEdgeTypesForMcp,
  listNodeTypesForMcp,
} from "@/lib/api/graph-services";

describe("graph-services catalog", () => {
  it("lists node types from contracts", () => {
    const types = listNodeTypesForMcp();
    expect(types.length).toBeGreaterThan(30);
    expect(types.some((entry) => entry.nodeType === "initiative")).toBe(true);
  });

  it("returns node type entry", () => {
    const entry = getNodeTypeForMcp("hypothesis");
    expect(entry?.nodeType).toBe("hypothesis");
    expect(entry?.label).toBeTruthy();
  });

  it("lists edge types from contracts", () => {
    const types = listEdgeTypesForMcp();
    expect(types.length).toBeGreaterThan(10);
    expect(types.some((entry) => entry.edgeType === "for_initiative")).toBe(true);
  });
});
