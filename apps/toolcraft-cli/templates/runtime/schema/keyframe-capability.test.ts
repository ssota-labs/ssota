import { describe, expect, it } from "vitest";

import { getToolcraftControlKeyframeCapability } from "./keyframe-capability";
import type { ToolcraftControlSchema } from "./types";

function control(
  type: ToolcraftControlSchema["type"],
  target: string,
  extra: Partial<ToolcraftControlSchema> = {},
): ToolcraftControlSchema {
  return {
    defaultValue: 0,
    label: "Control",
    target,
    type,
    ...extra,
  };
}

describe("getToolcraftControlKeyframeCapability", () => {
  it("marks numeric and visual parameter controls as keyframe-capable by component type", () => {
    for (const type of [
      "slider",
      "rangeSlider",
      "rangeInput",
      "vector",
      "color",
      "gradient",
      "curves",
      "anchorGrid",
      "channelMixer",
    ]) {
      expect(
        getToolcraftControlKeyframeCapability(control(type, `effect.${type}`)),
      ).toEqual({
        capable: true,
        reason: "control-type",
      });
    }
  });

  it("does not let schema keyframeable false hide diamonds for capable control types", () => {
    expect(
      getToolcraftControlKeyframeCapability(
        control("slider", "mesh.blur", { keyframeable: false }),
      ),
    ).toEqual({
      capable: true,
      reason: "control-type",
    });
  });

  it("blocks runtime-owned canvas size targets even when the visual type could otherwise animate", () => {
    expect(
      getToolcraftControlKeyframeCapability(control("slider", "canvas.aspectRatio")),
    ).toEqual({
      capable: false,
      reason: "runtime-owned-target",
    });

    expect(
      getToolcraftControlKeyframeCapability(control("text", "canvas.size.width")),
    ).toEqual({
      capable: false,
      reason: "runtime-owned-target",
    });

    expect(
      getToolcraftControlKeyframeCapability(control("slider", "canvas.size.height")),
    ).toEqual({
      capable: false,
      reason: "runtime-owned-target",
    });
  });

  it("blocks command, source, mode, boolean, text, and choice controls", () => {
    for (const type of [
      "actions",
      "checkbox",
      "code",
      "fileDrop",
      "imagePicker",
      "panelActions",
      "select",
      "segmented",
      "switch",
      "text",
    ]) {
      expect(
        getToolcraftControlKeyframeCapability(control(type, `effect.${type}`)),
      ).toEqual({
        capable: false,
        reason: "control-type",
      });
    }
  });
});
