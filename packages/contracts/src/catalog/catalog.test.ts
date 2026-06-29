import { describe, expect, it } from "vitest";
import {
  EDGE_CATALOG,
  EDGE_TYPES,
  NODE_CATALOG,
  NODE_TYPES,
  PLATFORM_DESIGN_THEME_TOKENS,
  getNodeTypeEntry,
  mergeDesignThemeTokens,
  parseNodeProperties,
  parseThemeCssContent,
  rankCatalogCandidates,
  requiresNodeContent,
  resolveSemanticColorValue,
  scoreCatalogCandidate,
  tokensToThemeCss,
  parseUiComponentContent,
  parseUiComponentFromProperties,
  uiComponentContentSchemaV2,
  uiComponentDocumentSchema,
} from "./index.js";

describe("v2.7 catalog SSOT", () => {
  it("defines 36 node types and 18 edge types", () => {
    expect(NODE_TYPES).toHaveLength(36);
    expect(EDGE_TYPES).toHaveLength(18);
  });

  it("authors a description and keywords for every node and edge type", () => {
    for (const key of NODE_TYPES) {
      const entry = NODE_CATALOG[key];
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
    for (const key of EDGE_TYPES) {
      const entry = EDGE_CATALOG[key];
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
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

  it("parses archived roadmap doc_status", () => {
    const parsed = parseNodeProperties("product_roadmap", {
      doc_status: "archived",
    });
    expect(parsed.doc_status).toBe("archived");
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
      entry: "Component.tsx",
    });
    expect(parsed.slug).toBe("primary-button");
    expect(parsed.tier).toBe("primitive");
    expect(parsed.entry).toBe("Component.tsx");
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

  it("requires content for ui_component", () => {
    expect(
      requiresNodeContent("ui_component", {
        slug: "btn",
        tier: "primitive",
        entry: "Component.tsx",
        files: { "Component.tsx": "export default function C() {}" },
      }),
    ).toBe(true);
    expect(
      requiresNodeContent("ui_component", {
        slug: "btn",
        tier: "primitive",
        entry: "Component.tsx",
      }),
    ).toBe(false);
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

  it("parses ui_component from properties.files", () => {
    const parsed = parseUiComponentFromProperties({
      slug: "btn",
      tier: "primitive",
      entry: "Component.tsx",
      files: {
        "Component.tsx": "export default function Component() { return null; }",
      },
    });
    expect(parsed.files["Component.tsx"]).toContain("export default");
  });

  it("parses ui_component from legacy properties.content", () => {
    const parsed = parseUiComponentFromProperties({
      slug: "btn",
      tier: "primitive",
      entry: "Component.tsx",
      content: {
        schemaVersion: 2,
        files: {
          "Component.tsx": "export default function Component() { return null; }",
        },
      },
    });
    expect(parsed.files["Component.tsx"]).toContain("export default");
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

describe("catalog search scorer", () => {
  const candidate = {
    kind: "node" as const,
    key: "retrospective",
    label: "회고",
    description: "스프린트·프로젝트 회고.",
    keywords: ["회고", "retrospective", "retro"],
  };

  it("scores exact key/label above substring and description matches", () => {
    const exact = scoreCatalogCandidate("retrospective", candidate);
    const keyword = scoreCatalogCandidate("retro", candidate);
    const description = scoreCatalogCandidate("프로젝트", candidate);
    expect(exact).toBeGreaterThan(keyword);
    expect(keyword).toBeGreaterThan(description);
    expect(description).toBeGreaterThan(0);
  });

  it("returns 0 when nothing matches", () => {
    expect(scoreCatalogCandidate("zzz", candidate)).toBe(0);
  });

  it("ranks, filters non-matches, and caps to the limit", () => {
    const candidates = [
      candidate,
      {
        kind: "node" as const,
        key: "feature",
        label: "기능",
        description: "사용자에게 제공되는 기능 단위.",
        keywords: ["feature"],
      },
      {
        kind: "edge" as const,
        key: "informs",
        label: "근거",
        description: "근거가 되는 정보.",
        keywords: ["informs"],
      },
    ];
    const hits = rankCatalogCandidates("retro", candidates, 5);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.key).toBe("retrospective");
    expect(hits[0]?.snippet.length).toBeGreaterThan(0);
  });
});

describe("design_theme catalog", () => {
  it("parses design_theme properties with tokens", () => {
    const parsed = parseNodeProperties("design_theme", {
      schema_version: 1,
      tokens: {
        "--primary": "oklch(0.4 0.1 200)",
      },
    });
    expect(parsed.schema_version).toBe(1);
    expect((parsed.tokens as Record<string, string>)["--primary"]).toBe(
      "oklch(0.4 0.1 200)",
    );
  });

  it("merges user tokens with platform defaults", () => {
    const merged = mergeDesignThemeTokens({
      "--primary": "oklch(0.4 0.1 200)",
    });
    expect(merged["--primary"]).toBe("oklch(0.4 0.1 200)");
    expect(merged["--foreground"]).toBe(
      PLATFORM_DESIGN_THEME_TOKENS["--foreground"],
    );
  });

  it("generates theme css declarations", () => {
    const css = tokensToThemeCss({
      "--primary": "oklch(0.52 0.105 223.128)",
      "--foreground": "oklch(0.141 0.005 285.823)",
    });
    expect(css).toContain("--primary: oklch(0.52 0.105 223.128);");
    expect(css).toContain("--foreground: oklch(0.141 0.005 285.823);");
  });

  it("resolves semantic color token names", () => {
    const tokens = mergeDesignThemeTokens({
      "--primary": "oklch(0.4 0.1 200)",
    });
    expect(resolveSemanticColorValue("primary", tokens)).toBe(
      "oklch(0.4 0.1 200)",
    );
    expect(resolveSemanticColorValue("--foreground", tokens)).toBe(
      PLATFORM_DESIGN_THEME_TOKENS["--foreground"],
    );
  });

  it("parses legacy css content into token map", () => {
    const parsed = parseThemeCssContent(`
      :root {
        --primary: oklch(0.5 0.1 200);
        --foreground: #111111;
      }
    `);
    expect(parsed["--primary"]).toBe("oklch(0.5 0.1 200)");
    expect(parsed["--foreground"]).toBe("#111111");
  });
});

describe("design_toolchain catalog", () => {
  it("parses design_toolchain properties", () => {
    const parsed = parseNodeProperties("design_toolchain", {
      schema_version: 1,
      package_json: {
        name: "studio-user-components",
        dependencies: { react: "^19.1.0" },
      },
      lockfile: "lockfileVersion: '9.0'\n",
    });
    expect(parsed.schema_version).toBe(1);
    expect((parsed.package_json as { name: string }).name).toBe(
      "studio-user-components",
    );
  });
});
