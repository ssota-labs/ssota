import { describe, expect, it } from "vitest";
import {
  getNodeTypeForMcp,
  listEdgeTypesForMcp,
  listNodeTypesForMcp,
} from "@/lib/api/graph-services";

describe("graph-services catalog", () => {
  it("lists node types from contracts", async () => {
    const types = await listNodeTypesForMcp();
    expect(types.length).toBeGreaterThan(30);
    expect(types.some((entry) => entry.catalogKey === "initiative")).toBe(true);
  });

  it("returns node type entry", () => {
    const entry = getNodeTypeForMcp("hypothesis");
    expect(entry?.catalogKey).toBe("hypothesis");
    expect(entry?.label).toBeTruthy();
  });

  it("lists edge types from contracts", () => {
    const types = listEdgeTypesForMcp();
    expect(types.length).toBeGreaterThan(10);
    expect(types.some((entry) => entry.catalogKey === "for_initiative")).toBe(
      true,
    );
  });
});
