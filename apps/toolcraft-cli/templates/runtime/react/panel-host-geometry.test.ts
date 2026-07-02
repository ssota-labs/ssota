import { describe, expect, it } from "vitest";

import { resolvePanelSnapPosition } from "./panel-host-geometry";
import type { PanelViewport } from "./panel-host-types";

const viewport = {
  height: 500,
  offsetLeft: 0,
  offsetTop: 0,
  width: 800,
} satisfies PanelViewport;

const dimensions = {
  height: 100,
  width: 200,
};

describe("resolvePanelSnapPosition", () => {
  it("snaps a side panel to the left edge", () => {
    expect(
      resolvePanelSnapPosition({
        dimensions,
        edges: ["left", "right"],
        position: { x: 12, y: 80 },
        velocity: { x: 0, y: 0 },
        viewport,
      }),
    ).toEqual({ x: 10, y: 80 });
  });

  it("snaps a top or bottom panel to the bottom edge", () => {
    expect(
      resolvePanelSnapPosition({
        dimensions,
        edges: ["top", "bottom"],
        position: { x: 160, y: 360 },
        velocity: { x: 0, y: 0 },
        viewport,
      }),
    ).toEqual({ x: 160, y: 390 });
  });

  it("returns null when the panel is outside the snap zone", () => {
    expect(
      resolvePanelSnapPosition({
        dimensions,
        edges: ["left"],
        position: { x: 120, y: 80 },
        velocity: { x: 0, y: 0 },
        viewport,
      }),
    ).toBeNull();
  });

  it("clamps snapped panel positions inside the viewport", () => {
    expect(
      resolvePanelSnapPosition({
        dimensions,
        edges: ["top"],
        position: { x: -100, y: 4 },
        velocity: { x: 0, y: 0 },
        viewport,
      }),
    ).toEqual({ x: 10, y: 10 });
  });
});
