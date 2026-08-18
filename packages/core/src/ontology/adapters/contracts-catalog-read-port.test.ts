import { parseNodeContent, parseUiComponentFromProperties } from "@ssota/contracts";
import { describe, expect, it } from "vitest";
import { createContractsCatalogReadPort } from "./contracts-catalog-read-port.js";

describe("createContractsCatalogReadPort", () => {
  const catalog = createContractsCatalogReadPort();

  it("lists all node and edge catalog entries from contracts SSOT", async () => {
    expect((await catalog.listNodeCatalog()).length).toBe(41);
    expect((await catalog.listEdgeCatalog()).length).toBe(21);
  });

  it("returns null for unknown catalog key", async () => {
    expect(await catalog.getNodeCatalogByKey("not_a_real_type")).toBeNull();
  });

  it("populates description and keywords on catalog rows", async () => {
    const node = await catalog.getNodeCatalogByKey("retrospective");
    expect(node?.description).toMatch(/회고/);
    expect(node?.keywords).toContain("retro");
    const edge = await catalog.getEdgeCatalogByKey("informs");
    expect(edge?.keywords).toContain("informs");
  });

  describe("searchCatalog", () => {
    it("finds a node type by english keyword", async () => {
      const hits = await catalog.searchCatalog({
        query: "retrospective",
        limit: 10,
      });
      expect(hits[0]?.key).toBe("retrospective");
      expect(hits[0]?.kind).toBe("node");
    });

    it("finds a node type by korean label/keyword", async () => {
      const hits = await catalog.searchCatalog({ query: "회고", limit: 10 });
      expect(hits.map((h) => h.key)).toContain("retrospective");
    });

    it("matches via keyword aliases (metric → kpi)", async () => {
      const hits = await catalog.searchCatalog({ query: "metric", limit: 10 });
      const keys = hits.map((h) => h.key);
      expect(keys).toContain("kpi");
    });

    it("respects the kind filter", async () => {
      const nodeHits = await catalog.searchCatalog({
        query: "page",
        kind: "node",
        limit: 20,
      });
      expect(nodeHits.every((h) => h.kind === "node")).toBe(true);
      const edgeHits = await catalog.searchCatalog({
        query: "page",
        kind: "edge",
        limit: 20,
      });
      expect(edgeHits.every((h) => h.kind === "edge")).toBe(true);
      expect(edgeHits.map((h) => h.key)).toContain("for_page");
    });

    it("orders better matches first and caps to limit", async () => {
      const hits = await catalog.searchCatalog({ query: "design", limit: 2 });
      expect(hits.length).toBeLessThanOrEqual(2);
      // exact-ish design types should outrank incidental description matches
      expect(hits.map((h) => h.key)).toContain("design_theme");
    });

    it("returns no hits for a nonsense query", async () => {
      const hits = await catalog.searchCatalog({
        query: "zzzznotareal",
        limit: 10,
      });
      expect(hits).toEqual([]);
    });
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

  it("parses ui_component v2 from properties.files", () => {
    const parsed = parseUiComponentFromProperties({
      slug: "btn",
      tier: "primitive",
      representation: "source",
      entry: "Component.tsx",
      files: { "Component.tsx": "export default function C() {}" },
    });
    expect(parsed.schemaVersion).toBe(2);
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
