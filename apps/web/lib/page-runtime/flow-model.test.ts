import { describe, expect, it } from "vitest";
import {
  coerceFlow,
  coercePresentation,
  flowFromNodes,
  resolveNodeStyle,
  type FlowNodeData,
} from "./flow-model";

describe("flowFromNodes (model 2)", () => {
  const nodes = [
    { id: "ceo", catalogKey: "org_unit", title: "CEO", properties: { headcount: 24 } },
    { id: "eng", catalogKey: "org_unit", title: "Engineering", properties: { x: 10, y: 20 } },
  ];

  it("maps RenderNodes → flow nodes (nodeType=catalogKey, props=properties, x/y)", () => {
    const model = flowFromNodes(nodes, []);
    expect(model.nodes[0]).toMatchObject({
      id: "ceo",
      nodeType: "org_unit",
      title: "CEO",
      props: { headcount: 24 },
    });
    expect(model.nodes[1]).toMatchObject({ id: "eng", x: 10, y: 20 });
  });

  it("accepts edge field aliases and drops dangling edges", () => {
    const model = flowFromNodes(nodes, [
      { source: "ceo", target: "eng" }, // ok
      { sourceNodeId: "ceo", targetNodeId: "eng", edgeType: "part_of" }, // alias + label
      { from: "ceo", to: "zzz" }, // dangling → dropped
    ]);
    expect(model.edges).toHaveLength(2);
    expect(model.edges[0]).toMatchObject({ source: "ceo", target: "eng" });
    expect(model.edges[1]?.label).toBe("part_of");
  });
});

describe("coerceFlow", () => {
  it("returns empty model for junk / empty input", () => {
    expect(coerceFlow(undefined)).toEqual({ nodes: [], edges: [] });
    expect(coerceFlow(null)).toEqual({ nodes: [], edges: [] });
    expect(coerceFlow("nope")).toEqual({ nodes: [], edges: [] });
    expect(coerceFlow({})).toEqual({ nodes: [], edges: [] });
  });

  it("normalizes nodes and tolerates missing fields", () => {
    const { nodes } = coerceFlow({
      nodes: [
        { id: "a", title: "A", nodeType: "page", x: 10, y: 20 },
        { label: "B" }, // no id/title → id=n1, title from label
        "garbage",
      ],
    });
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ id: "a", title: "A", nodeType: "page", x: 10, y: 20 });
    expect(nodes[1]).toMatchObject({ id: "n1", title: "B" });
  });

  it("keeps only edges whose endpoints both exist", () => {
    const { edges } = coerceFlow({
      nodes: [{ id: "a", title: "A" }, { id: "b", title: "B" }],
      edges: [
        { source: "a", target: "b" }, // ok
        { source: "a", target: "zzz" }, // dangling → dropped
        { target: "b" }, // missing source → dropped
      ],
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: "a", target: "b" });
  });

  it("preserves status and props", () => {
    const { nodes } = coerceFlow({
      nodes: [{ id: "a", title: "A", status: "loading", props: { k: 1 } }],
    });
    expect(nodes[0]?.status).toBe("loading");
    expect(nodes[0]?.props).toEqual({ k: 1 });
  });
});

describe("resolveNodeStyle", () => {
  const manifest = coercePresentation([
    { match: { nodeType: "section" }, variant: "section", color: "purple" },
    { match: { property: "kind", eq: "action" }, color: "gray", shape: "pill" },
    { match: { nodeType: "page" }, color: "blue", titleFrom: "label", badgeFrom: "status" },
  ]);

  it("matches by nodeType and falls back to gray for unknown", () => {
    const n: FlowNodeData = { id: "a", title: "Auth", nodeType: "section" };
    expect(resolveNodeStyle(n, manifest)).toMatchObject({ color: "purple", title: "Auth" });
    const unknown: FlowNodeData = { id: "x", title: "X", nodeType: "mystery" };
    expect(resolveNodeStyle(unknown, manifest).color).toBe("gray");
  });

  it("matches by property value and applies shape", () => {
    const n: FlowNodeData = { id: "a", title: "Do", props: { kind: "action" } };
    expect(resolveNodeStyle(n, manifest)).toMatchObject({ color: "gray", shape: "pill" });
  });

  it("reads titleFrom and badgeFrom from props", () => {
    const n: FlowNodeData = {
      id: "p",
      title: "fallback",
      nodeType: "page",
      props: { label: "Home", status: "main" },
    };
    expect(resolveNodeStyle(n, manifest)).toMatchObject({
      color: "blue",
      title: "Home",
      badge: "main",
    });
  });

  it("first matching rule wins", () => {
    // a page node that also has kind=action → nodeType:section doesn't match,
    // property:kind=action comes before page rule → gray pill
    const n: FlowNodeData = { id: "a", title: "T", nodeType: "page", props: { kind: "action" } };
    expect(resolveNodeStyle(n, manifest).shape).toBe("pill");
  });
});
