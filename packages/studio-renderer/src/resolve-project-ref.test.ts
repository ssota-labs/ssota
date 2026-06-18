import { describe, expect, it } from "vitest";
import type { StudioNode, UiComponentDocument } from "@ssota/contracts/catalog";
import {
  buildResolvedComponentMap,
  inlineProjectRefs,
  resolvePublishedDocument,
} from "./resolve-project-ref";

const buttonDoc: UiComponentDocument = {
  schemaVersion: 1,
  root: {
    kind: "element",
    id: "btn-root",
    tag: "button",
    className: "px-4 py-2",
    children: [{ kind: "text", id: "btn-label", text: "Button" }],
  },
};

describe("resolve-project-ref", () => {
  it("parses published document", () => {
    const doc = resolvePublishedDocument(JSON.stringify(buttonDoc));
    expect(doc?.root.kind).toBe("element");
  });

  it("returns null for empty content", () => {
    expect(resolvePublishedDocument(null)).toBeNull();
  });

  it("builds resolved map from entries", () => {
    const map = buildResolvedComponentMap([
      {
        nodeId: "00000000-0000-4000-8000-000000000001",
        content: JSON.stringify(buttonDoc),
      },
    ]);
    expect(map["00000000-0000-4000-8000-000000000001"]?.schemaVersion).toBe(1);
  });

  it("inlines project component refs", () => {
    const tree: StudioNode = {
      kind: "component",
      id: "card-btn",
      ref: {
        type: "project",
        nodeId: "00000000-0000-4000-8000-000000000001",
        slug: "button",
      },
      children: [],
    };
    const resolved = buildResolvedComponentMap([
      {
        nodeId: "00000000-0000-4000-8000-000000000001",
        content: JSON.stringify(buttonDoc),
      },
    ]);
    const inlined = inlineProjectRefs(tree, resolved);
    expect(inlined.kind).toBe("element");
    if (inlined.kind === "element") {
      expect(inlined.tag).toBe("button");
    }
  });

  it("detects circular refs", () => {
    const nodeId = "00000000-0000-4000-8000-000000000001";
    const tree: StudioNode = {
      kind: "component",
      id: "a",
      ref: { type: "project", nodeId, slug: "a" },
      children: [],
    };
    const selfDoc: UiComponentDocument = {
      schemaVersion: 1,
      root: tree,
    };
    const resolved = buildResolvedComponentMap([
      { nodeId, content: JSON.stringify(selfDoc) },
    ]);
    const inlined = inlineProjectRefs(tree, resolved);
    expect(inlined.kind).toBe("element");
    if (inlined.kind === "element") {
      const textChild = inlined.children[0];
      expect(textChild?.kind).toBe("text");
      if (textChild?.kind === "text") {
        expect(textChild.text).toContain("Circular");
      }
    }
  });
});
