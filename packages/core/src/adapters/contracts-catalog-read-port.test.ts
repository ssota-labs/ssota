import { parseNodeContent } from "@ssota/contracts";
import { describe, expect, it } from "vitest";
import { createContractsCatalogReadPort } from "./contracts-catalog-read-port.js";

describe("createContractsCatalogReadPort", () => {
  const catalog = createContractsCatalogReadPort();

  it("lists all node and edge catalog entries from contracts SSOT", async () => {
    expect((await catalog.listNodeCatalog()).length).toBe(34);
    expect((await catalog.listEdgeCatalog()).length).toBe(17);
  });

  it("returns null for unknown catalog key", async () => {
    expect(await catalog.getNodeCatalogByKey("not_a_real_type")).toBeNull();
  });

  it("validates known node properties", () => {
    const parsed = catalog.validateNodeProperties("hypothesis", {
      status: "validated",
      summary: "Test",
    });
    expect(parsed.status).toBe("validated");
  });

  it("rejects invalid properties for known catalog key", () => {
    expect(() =>
      catalog.validateNodeProperties("hypothesis", { status: "invalid" }),
    ).toThrow();
  });

  it("rejects unknown catalog key on validate", () => {
    expect(() =>
      catalog.validateNodeProperties("unknown_type", { foo: "bar" }),
    ).toThrow(/UNKNOWN_NODE_TYPE/);
  });

  it("parses ui_component v2 content from properties convention", () => {
    const parsed = parseNodeContent(
      "ui_component",
      JSON.stringify({
        schemaVersion: 2,
        files: { "Component.tsx": "export default function C() {}" },
      }),
      {
        slug: "btn",
        tier: "primitive",
        representation: "source",
        entry: "Component.tsx",
      },
    ) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(2);
  });
});
