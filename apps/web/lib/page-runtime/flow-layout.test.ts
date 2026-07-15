import { describe, expect, it } from "vitest";
import { coerceFlow } from "./flow-model";
import {
  hasExplicitCoords,
  layoutFlow,
  layoutFlowWithDagre,
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

  it("dagre LR places a chain left-to-right (React Flow official pattern)", () => {
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
    const pos = layoutFlowWithDagre(model, "LR");
    expect(Object.keys(pos).sort()).toEqual(["a", "b", "c"]);
    expect(pos.b!.x).toBeGreaterThan(pos.a!.x);
    expect(pos.c!.x).toBeGreaterThan(pos.b!.x);
  });

  it("dagre returns persisted coordinates as-is", () => {
    const model = coerceFlow({
      nodes: [
        { id: "a", title: "A", x: 1, y: 2 },
        { id: "b", title: "B", x: 3, y: 4 },
      ],
      edges: [{ source: "a", target: "b" }],
    });
    expect(layoutFlowWithDagre(model, "LR")).toEqual({
      a: { x: 1, y: 2 },
      b: { x: 3, y: 4 },
    });
  });
});
