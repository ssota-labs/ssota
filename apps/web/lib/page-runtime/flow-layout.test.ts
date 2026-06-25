import { describe, expect, it } from "vitest";
import { coerceFlow } from "./flow-model";
import { hasExplicitCoords, layoutFlow } from "./flow-layout";

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
});
