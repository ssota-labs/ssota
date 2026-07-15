import { describe, expect, it } from "vitest";
import { coerceFlow } from "./flow-model";
import {
  hasExplicitCoords,
  layoutFlow,
  layoutFlowWithEdges,
  redistributeSidePortsWithinNodes,
  synthesizeFeedbackRoutes,
} from "./flow-layout";

describe("flow-layout", () => {
  it("returns persisted coordinates as-is when all nodes have them", async () => {
    const model = coerceFlow({
      nodes: [
        { id: "a", title: "A", x: 5, y: 6 },
        { id: "b", title: "B", x: 7, y: 8 },
      ],
      edges: [{ source: "a", target: "b" }],
    });
    expect(hasExplicitCoords(model)).toBe(true);
    const pos = await layoutFlow(model, "LR");
    expect(pos).toEqual({ a: { x: 5, y: 6 }, b: { x: 7, y: 8 } });
  });

  it("assigns non-overlapping coordinates via ELK when coords are absent", async () => {
    const model = coerceFlow({
      nodes: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "C" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    });
    expect(hasExplicitCoords(model)).toBe(false);
    const pos = await layoutFlow(model, "LR");
    expect(Object.keys(pos).sort()).toEqual(["a", "b", "c"]);
    // layered LR: x should increase along the chain a → b → c
    expect(pos.b!.x).toBeGreaterThan(pos.a!.x);
    expect(pos.c!.x).toBeGreaterThan(pos.b!.x);
  });

  it("returns empty for an empty model", async () => {
    expect(await layoutFlow(coerceFlow({}), "LR")).toEqual({});
  });

  it("lays out a tree top-down with the tree (mrtree) algorithm", async () => {
    const model = coerceFlow({
      nodes: [
        { id: "root", title: "Root" },
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      edges: [
        { source: "root", target: "a" },
        { source: "root", target: "b" },
      ],
    });
    const pos = await layoutFlow(model, "TB", "tree");
    expect(Object.keys(pos).sort()).toEqual(["a", "b", "root"]);
    // TB tree: children sit below the root, side by side.
    expect(pos.a!.y).toBeGreaterThan(pos.root!.y);
    expect(pos.b!.y).toBeGreaterThan(pos.root!.y);
    expect(pos.a!.x).not.toEqual(pos.b!.x);
  });

  it("returns orthogonal edge bend points alongside positions", async () => {
    const model = coerceFlow({
      nodes: [
        { id: "a", title: "A", width: 120, height: 60 },
        { id: "b", title: "B", width: 120, height: 60 },
        { id: "c", title: "C", width: 120, height: 60 },
      ],
      edges: [
        { id: "a-b", source: "a", target: "b" },
        { id: "b-c", source: "b", target: "c" },
      ],
    });
    const { positions, edges } = await layoutFlowWithEdges(model, "LR");
    expect(positions.b!.x).toBeGreaterThan(positions.a!.x);
    expect(edges.length).toBe(2);
    for (const e of edges) {
      expect(e.points.length).toBeGreaterThanOrEqual(2);
      // Routes share the same coordinate space as node positions.
      expect(e.points[0]!.x).toBeGreaterThanOrEqual(positions.a!.x);
    }
    expect(edges.map((e) => e.id).toSorted()).toEqual(["a-b", "b-c"]);
  });

  it("keeps side-port attachments inside node height", () => {
    const nodes = [
      { id: "a", x: 0, y: 100, width: 100, height: 40 },
      { id: "b", x: 200, y: 100, width: 100, height: 40 },
    ];
    const edges = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "a", target: "b" },
      { id: "e3", source: "a", target: "b" },
    ];
    // ELK-like stubs that spill past the card top/bottom.
    const routes = [
      {
        id: "e1",
        points: [
          { x: 100, y: 80 },
          { x: 150, y: 80 },
          { x: 150, y: 80 },
          { x: 200, y: 80 },
        ],
      },
      {
        id: "e2",
        points: [
          { x: 100, y: 120 },
          { x: 150, y: 120 },
          { x: 150, y: 120 },
          { x: 200, y: 120 },
        ],
      },
      {
        id: "e3",
        points: [
          { x: 100, y: 160 },
          { x: 150, y: 160 },
          { x: 150, y: 160 },
          { x: 200, y: 160 },
        ],
      },
    ];
    const clamped = redistributeSidePortsWithinNodes(nodes, edges, routes, 8);
    for (const r of clamped) {
      const startY = r.points[0]!.y;
      const endY = r.points[r.points.length - 1]!.y;
      expect(startY).toBeGreaterThanOrEqual(108);
      expect(startY).toBeLessThanOrEqual(132);
      expect(endY).toBeGreaterThanOrEqual(108);
      expect(endY).toBeLessThanOrEqual(132);
    }
    const startYs = clamped.map((r) => r.points[0]!.y).toSorted((a, b) => a - b);
    expect(startYs[0]).toBeLessThan(startYs[2]!);
  });

  it("synthesizes non-overlapping feedback lanes below nodes", () => {
    const nodes = new Map([
      ["a", { id: "a", x: 0, y: 0, width: 100, height: 40 }],
      ["b", { id: "b", x: 200, y: 0, width: 100, height: 40 }],
    ]);
    const routes = synthesizeFeedbackRoutes(nodes, [
      { id: "b-a", source: "b", target: "a" },
      { id: "b-a-2", source: "b", target: "a" },
    ]);
    expect(routes).toHaveLength(2);
    expect(routes[0]!.points).toHaveLength(4);
    expect(routes[1]!.points[1]!.y).toBeGreaterThan(routes[0]!.points[1]!.y);
  });
});
