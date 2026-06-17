import { describe, expect, it } from "vitest";
import { createContractsCatalogReadPort } from "./contracts-catalog-read-port.js";

describe("createContractsCatalogReadPort", () => {
  const catalog = createContractsCatalogReadPort();

  it("lists all node and edge types from contracts SSOT", () => {
    expect(catalog.listNodeTypes()).toHaveLength(34);
    expect(catalog.listEdgeTypes()).toHaveLength(17);
  });

  it("returns null for unknown node_type", () => {
    expect(catalog.getNodeTypeEntry("not_a_real_type")).toBeNull();
  });

  it("validates known node properties", () => {
    const parsed = catalog.validateNodeProperties("hypothesis", {
      status: "validated",
      summary: "Test",
    });
    expect(parsed.status).toBe("validated");
  });

  it("rejects invalid properties for known node_type", () => {
    expect(() =>
      catalog.validateNodeProperties("hypothesis", { status: "invalid" }),
    ).toThrow();
  });

  it("rejects unknown node_type on validate", () => {
    expect(() =>
      catalog.validateNodeProperties("unknown_type", { foo: "bar" }),
    ).toThrow(/UNKNOWN_NODE_TYPE/);
  });
});
