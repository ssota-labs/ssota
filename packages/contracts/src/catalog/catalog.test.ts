import { describe, expect, it } from "vitest";
import {
  EDGE_TYPES,
  NODE_TYPES,
  getNodeTypeEntry,
  parseNodeProperties,
  requiresNodeContent,
  parseUiComponentContent,
  uiComponentContentSchemaV2,
  uiComponentDocumentSchema,
} from "./index.js";

describe("v2.7 catalog SSOT", () => {
  it("defines 34 node types and 17 edge types", () => {
    expect(NODE_TYPES).toHaveLength(34);
    expect(EDGE_TYPES).toHaveLength(17);
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

  it("parses ui_component properties", () => {
    const parsed = parseNodeProperties("ui_component", {
      slug: "primary-button",
      tier: "primitive",
    });
    expect(parsed.slug).toBe("primary-button");
    expect(parsed.tier).toBe("primitive");
  });

  it("rejects invalid ui_component tier", () => {
    expect(() =>
      parseNodeProperties("ui_component", {
        slug: "btn",
        tier: "builtin",
      }),
    ).toThrow();
  });

  it("exposes ui_component catalog entry with tree-aware contentRequired", () => {
    expect(getNodeTypeEntry("ui_component")?.contentRequired).toBe(true);
    expect(getNodeTypeEntry("ui_component")?.mutability).toBe("living");
  });

  it("requires content only for ui_component source representation", () => {
    expect(
      requiresNodeContent("ui_component", {
        slug: "btn",
        tier: "primitive",
      }),
    ).toBe(false);
    expect(
      requiresNodeContent("ui_component", {
        slug: "btn",
        tier: "primitive",
        representation: "source",
        entry: "Component.tsx",
      }),
    ).toBe(true);
  });

  it("parses ui_component v2 properties with entry", () => {
    const parsed = parseNodeProperties("ui_component", {
      slug: "primary-button",
      tier: "primitive",
      representation: "source",
      contentSchemaVersion: 2,
      entry: "Component.tsx",
      fileKeys: ["Component.tsx"],
    });
    expect(parsed.representation).toBe("source");
    expect(parsed.entry).toBe("Component.tsx");
  });

  it("rejects ui_component source without entry", () => {
    expect(() =>
      parseNodeProperties("ui_component", {
        slug: "btn",
        tier: "primitive",
        representation: "source",
      }),
    ).toThrow();
  });

  it("parses ui_component content v2", () => {
    const parsed = uiComponentContentSchemaV2.parse({
      schemaVersion: 2,
      files: {
        "Component.tsx": "export default function Component() { return null; }",
      },
    });
    expect(parsed.files["Component.tsx"]).toContain("export default");
  });

  it("rejects ui_component source content with schemaVersion 1", () => {
    expect(() =>
      parseUiComponentContent(
        JSON.stringify({
          schemaVersion: 1,
          root: {
            kind: "element",
            id: "root",
            tag: "div",
            children: [],
          },
        }),
        "source",
      ),
    ).toThrow();
  });

  it("parses UiComponentDocument with element tree", () => {
    const doc = uiComponentDocumentSchema.parse({
      schemaVersion: 1,
      root: {
        kind: "element",
        id: "root",
        tag: "div",
        className: "flex gap-2",
        children: [
          {
            kind: "text",
            id: "label",
            text: "Click me",
          },
        ],
      },
    });
    expect(doc.root.kind).toBe("element");
    if (doc.root.kind === "element") {
      expect(doc.root.children).toHaveLength(1);
    }
  });

  it("parses UiComponentDocument with project component ref", () => {
    const doc = uiComponentDocumentSchema.parse({
      schemaVersion: 1,
      root: {
        kind: "component",
        id: "btn",
        ref: {
          type: "project",
          nodeId: "00000000-0000-4000-8000-000000000001",
          slug: "button",
        },
        children: [],
      },
    });
    expect(doc.root.kind).toBe("component");
  });

  it("rejects builtin component ref type", () => {
    expect(() =>
      uiComponentDocumentSchema.parse({
        schemaVersion: 1,
        root: {
          kind: "component",
          id: "btn",
          ref: { type: "builtin", name: "Button" },
          children: [],
        },
      }),
    ).toThrow();
  });
});
