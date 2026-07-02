import { describe, expect, it } from "vitest";

import { starterPerformance } from "./starter-performance";
import { starterSchema } from "./starter-schema";

describe("starterSchema", () => {
  it("publishes the base Toolcraft template app contract for AI assembly", () => {
    expect(starterSchema.canvas.draggable).toBe(true);
    expect(starterSchema.canvas.enabled).toBe(true);
    expect(starterSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(starterSchema.canvas.upload).toBe(true);
    expect(starterSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(starterSchema.panels.controls?.sections[0]?.controls.settingsTransfer).toMatchObject({
      target: "runtime.settingsTransfer",
      type: "settingsTransfer",
    });
    expect(starterSchema.panels.controls?.sections[0]?.controls.canvasAspectRatio).toMatchObject({
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(starterSchema.panels.controls?.sections[0]?.controls.canvasWidth).toMatchObject({
      target: "canvas.size.width",
      type: "text",
    });
    expect(starterSchema.panels.controls?.sections[0]?.controls.canvasHeight).toMatchObject({
      target: "canvas.size.height",
      type: "text",
    });
    expect(starterSchema.panels.layers).toBeUndefined();
    expect(starterSchema.panels.timeline).toBeUndefined();
    expect(starterSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
    expect(starterSchema.assembly.components).toEqual([
      "canvas",
      "controlsPanel",
      "toolbar",
    ]);
    expect(starterSchema.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "canvas.draggable",
        "canvas.editableSize",
        "canvas.upload",
        "controls.defaults",
        "controls.panel",
        "toolbar.history",
        "toolbar.radar",
        "toolbar.theme",
        "toolbar.zoom",
      ]),
    );
    expect(starterSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(starterSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(starterSchema.assembly.commands).toEqual(
      expect.arrayContaining([
        "canvas.center",
        "canvas.setSize",
        "canvas.setViewport",
        "canvas.zoomIn",
        "controls.reset",
        "controls.setValue",
        "history.undo",
        "media.delete",
        "media.import",
      ]),
    );
    expect(starterSchema.assembly.commands).not.toContain("timeline.setCurrentTime");
  });

  it("starts with runtime setup but without product-specific panels or controls", () => {
    const productSections =
      starterSchema.panels.controls?.sections.filter((section) => section.title !== "Setup") ??
      [];

    expect(starterSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(productSections).toEqual([]);
    expect(starterSchema.panels.layers).toBeUndefined();
    expect(starterSchema.panels.timeline).toBeUndefined();
  });

  it("does not imply timeline behavior before a product needs it", () => {
    expect(starterSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(starterSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(starterSchema.assembly.commands).not.toContain("timeline.toggleControlKeyframes");
    expect(starterSchema.assembly.commands).not.toContain("timeline.moveKeyframe");
  });

  it("keeps starter performance empty until the generated product adds controls", () => {
    expect(starterPerformance.scenarios).toEqual([]);
    expect(starterPerformance.workloadTargets).toEqual([]);
  });
});
