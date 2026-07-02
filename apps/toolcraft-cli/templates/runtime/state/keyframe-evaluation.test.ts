import { describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { createToolcraftState } from "./create-template-state";
import {
  evaluateToolcraftTimelineValue,
  evaluateToolcraftTimelineValues,
} from "./keyframe-evaluation";

function createKeyframedState() {
  const app = defineToolcraft({
    canvas: { enabled: true },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              opacity: {
                defaultValue: 0,
                target: "shape.opacity",
                type: "slider",
              },
              position: {
                defaultValue: { x: 0, y: 0 },
                target: "shape.position",
                type: "vector",
              },
              preset: {
                defaultValue: "linear",
                options: [
                  { label: "Linear", value: "linear" },
                  { label: "Radial", value: "radial" },
                ],
                target: "shape.preset",
                type: "select",
              },
            },
          },
        ],
        title: "Controls",
      },
      timeline: { mode: "keyframes" },
    },
  });

  return createToolcraftState(app, {
    timeline: {
      currentTimeSeconds: 4,
      durationSeconds: 8,
      keyframeGroups: [
        {
          controlId: "shape.opacity",
          keyframes: [
            {
              controlId: "shape.opacity",
              controlLabel: "Opacity",
              id: "shape.opacity::0",
              timeSeconds: 0,
              value: 0,
              valueLabel: "0%",
            },
            {
              controlId: "shape.opacity",
              controlLabel: "Opacity",
              id: "shape.opacity::8",
              timeSeconds: 8,
              value: 100,
              valueLabel: "100%",
            },
          ],
          label: "Opacity",
        },
        {
          controlId: "shape.position",
          keyframes: [
            {
              controlId: "shape.position",
              controlLabel: "Position",
              id: "shape.position::0",
              timeSeconds: 0,
              value: { x: 0, y: 10 },
              valueLabel: "0.00, 10.00",
            },
            {
              controlId: "shape.position",
              controlLabel: "Position",
              id: "shape.position::8",
              timeSeconds: 8,
              value: { x: 100, y: 30 },
              valueLabel: "100.00, 30.00",
            },
          ],
          label: "Position",
        },
        {
          controlId: "shape.preset",
          keyframes: [
            {
              controlId: "shape.preset",
              controlLabel: "Preset",
              id: "shape.preset::0",
              timeSeconds: 0,
              value: "linear",
              valueLabel: "Linear",
            },
            {
              controlId: "shape.preset",
              controlLabel: "Preset",
              id: "shape.preset::8",
              timeSeconds: 8,
              value: "radial",
              valueLabel: "Radial",
            },
          ],
          label: "Preset",
        },
      ],
    },
  });
}

describe("Toolcraft keyframe evaluation", () => {
  it("evaluates typed keyframe values at the current timeline time", () => {
    const state = createKeyframedState();
    const values = evaluateToolcraftTimelineValues(state);
    const position = values["shape.position"] as { x: number; y: number };

    expect(values["shape.opacity"]).toBeCloseTo(50, 5);
    expect(position.x).toBeCloseTo(50, 5);
    expect(position.y).toBeCloseTo(20, 5);
    expect(values["shape.preset"]).toBe("linear");
  });

  it("evaluates a single target and falls back to raw values without typed keyframes", () => {
    const state = createKeyframedState();

    expect(evaluateToolcraftTimelineValue(state, "shape.opacity", 8)).toBe(100);
    expect(evaluateToolcraftTimelineValue(state, "shape.preset", 8)).toBe("radial");
    expect(evaluateToolcraftTimelineValue(state, "missing.target", 4)).toBeUndefined();
  });
});
