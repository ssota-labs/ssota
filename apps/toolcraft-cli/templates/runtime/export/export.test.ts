import { describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { ToolcraftState } from "../state/types";
import {
  createToolcraftPngExportCanvas,
  getToolcraftImageExportSize,
  getToolcraftRetinaExportPixelRatio,
  getToolcraftRetinaExportSize,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
  shouldIncludeToolcraftPreviewBackground,
} from "./export";

function createState(schema = defineToolcraft({ canvas: { enabled: true }, panels: {} })): ToolcraftState {
  return {
    canvas: {
      offset: { x: 0, y: 0 },
      size: { height: 100, unit: "px", width: 200 },
      zoom: 70,
    },
    defaults: {},
    history: {
      redo: [],
      undo: [],
    },
    layers: [],
    mediaAssets: [],
    panels: {
      controls: { offset: { x: 0, y: 0 } },
      layers: { offset: { x: 0, y: 0 } },
      timeline: { offset: { x: 0, y: 0 } },
      toolbar: { offset: { x: 0, y: 0 } },
    },
    schema,
    selectedLayerId: null,
    timeline: {
      currentTimeSeconds: 0,
      durationSeconds: 8,
      expanded: false,
      isLooping: true,
      isPlaying: false,
      keyframeGroups: [],
      selectedKeyframeId: null,
    },
    values: {},
  };
}

function createMockCanvas() {
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
  };
  const canvas = {
    getContext: vi.fn(() => context),
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement;

  return { canvas, context };
}

describe("Toolcraft export helpers", () => {
  it("normalizes png export background to include by default", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    expect(schema.export.png.background).toBe("include");
  });

  it("preserves transparent png export background option", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      export: {
        png: {
          background: "transparent",
        },
      },
      panels: {},
    });

    expect(schema.export.png.background).toBe("transparent");
    expect(shouldIncludeToolcraftExportBackground({ format: "png", schema })).toBe(false);
    expect(shouldIncludeToolcraftExportBackground({ format: "video", schema })).toBe(true);
  });

  it("uses include-background runtime state for live preview background", () => {
    const state = createState();

    expect(shouldIncludeToolcraftPreviewBackground({ state })).toBe(true);

    state.values["export.includeBackground"] = false;
    expect(shouldIncludeToolcraftPreviewBackground({ state })).toBe(false);

    state.values["export.includeBackground"] = true;
    expect(shouldIncludeToolcraftPreviewBackground({ state })).toBe(true);
  });

  it("keeps video export background independent from preview include state", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      export: {
        png: {
          background: "transparent",
        },
      },
      panels: {},
    });
    const state = createState(schema);

    state.values["export.includeBackground"] = false;

    expect(shouldIncludeToolcraftPreviewBackground({ state })).toBe(false);
    expect(shouldIncludeToolcraftExportBackground({ format: "video", schema })).toBe(true);
  });

  it("uses at least 2x pixel ratio for retina export", () => {
    expect(getToolcraftRetinaExportPixelRatio(1)).toBe(2);
    expect(getToolcraftRetinaExportPixelRatio(1.5)).toBe(2);
    expect(getToolcraftRetinaExportPixelRatio(3)).toBe(3);
  });

  it("resolves retina export size from canvas size rather than viewport zoom", () => {
    const state = createState();
    state.canvas.zoom = 35;

    expect(getToolcraftRetinaExportSize({ devicePixelRatio: 2, state })).toEqual({
      height: 200,
      pixelRatio: 2,
      width: 400,
    });
  });

  it("resolves image export resolution presets from canvas aspect ratio", () => {
    const state = createState();

    expect(getToolcraftImageExportSize({ resolution: "2k", state })).toEqual({
      height: 1024,
      pixelRatio: 10.24,
      width: 2048,
    });
    expect(getToolcraftImageExportSize({ resolution: "4k", state })).toEqual({
      height: 2048,
      pixelRatio: 20.48,
      width: 4096,
    });
    expect(getToolcraftImageExportSize({ resolution: "8k", state })).toEqual({
      height: 4096,
      pixelRatio: 40.96,
      width: 8192,
    });
  });

  it("preserves portrait aspect ratio for image export resolution presets", () => {
    const state = createState();
    state.canvas.size = { height: 200, unit: "px", width: 100 };

    expect(getToolcraftImageExportSize({ resolution: "4k", state })).toEqual({
      height: 4096,
      pixelRatio: 20.48,
      width: 2048,
    });
  });

  it("falls back to retina sizing for current or unknown image export resolution", () => {
    const state = createState();

    expect(getToolcraftImageExportSize({ devicePixelRatio: 2, resolution: "current", state }))
      .toEqual({
        height: 200,
        pixelRatio: 2,
        width: 400,
      });
    expect(getToolcraftImageExportSize({ devicePixelRatio: 2, resolution: "source", state }))
      .toEqual({
        height: 200,
        pixelRatio: 2,
        width: 400,
      });
  });

  it("resolves current video export to even current output dimensions", () => {
    const state = createState();
    state.canvas.size = { height: 101, unit: "px", width: 201 };

    expect(getToolcraftVideoExportSize({ devicePixelRatio: 2, resolution: "current", state }))
      .toEqual({
        height: 102,
        pixelRatio: 102 / 101,
        width: 202,
      });
  });

  it("keeps current video export distinct from 4k export at default canvas size", () => {
    const state = createState();
    state.canvas.size = { height: 1080, unit: "px", width: 1920 };

    expect(getToolcraftVideoExportSize({ devicePixelRatio: 2, resolution: "current", state }))
      .toEqual({
        height: 1080,
        pixelRatio: 1,
        width: 1920,
      });
    expect(getToolcraftVideoExportSize({ resolution: "4k", state })).toEqual({
      height: 2160,
      pixelRatio: 2,
      width: 3840,
    });
  });

  it("fits 4k video export inside an encoder-safe UHD box", () => {
    const state = createState();
    state.canvas.size = { height: 900, unit: "px", width: 1440 };

    expect(getToolcraftVideoExportSize({ resolution: "4k", state })).toEqual({
      height: 2160,
      pixelRatio: 2.4,
      width: 3456,
    });
  });

  it("preserves 16:9 at UHD dimensions for 4k video export", () => {
    const state = createState();
    state.canvas.size = { height: 1080, unit: "px", width: 1920 };

    expect(getToolcraftVideoExportSize({ resolution: "4k", state })).toEqual({
      height: 2160,
      pixelRatio: 2,
      width: 3840,
    });
  });

  it("reports the actual rounded pixel ratio for 4k video export", () => {
    const state = createState();
    state.canvas.size = { height: 201, unit: "px", width: 333 };

    expect(getToolcraftVideoExportSize({ resolution: "4k", state })).toEqual({
      height: 2160,
      pixelRatio: 2160 / 201,
      width: 3578,
    });
  });

  it("creates a transparent retina png canvas when png background is disabled", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      export: {
        png: {
          background: "transparent",
        },
      },
      panels: {},
    });
    const state = createState(schema);
    const { canvas, context } = createMockCanvas();
    const render = vi.fn();

    const exportedCanvas = createToolcraftPngExportCanvas({
      canvasFactory: () => canvas,
      devicePixelRatio: 2,
      render,
      state,
    });

    expect(exportedCanvas.width).toBe(400);
    expect(exportedCanvas.height).toBe(200);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 400, 200);
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        cssHeight: 100,
        cssWidth: 200,
        includeBackground: false,
        pixelHeight: 200,
        pixelRatio: 2,
        pixelWidth: 400,
      }),
    );
  });

  it("fills the png background when png background is enabled", () => {
    const state = createState();
    const { canvas, context } = createMockCanvas();

    createToolcraftPngExportCanvas({
      background: "#112233",
      canvasFactory: () => canvas,
      devicePixelRatio: 2,
      render: vi.fn(),
      state,
    });

    expect(context.fillStyle).toBe("#112233");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 200);
  });

  it("creates a png canvas at the selected image export resolution", () => {
    const state = createState();
    const { canvas, context } = createMockCanvas();

    createToolcraftPngExportCanvas({
      canvasFactory: () => canvas,
      render: vi.fn(),
      resolution: "4k",
      state,
    });

    expect(canvas.width).toBe(4096);
    expect(canvas.height).toBe(2048);
    expect(context.scale).toHaveBeenCalledWith(20.48, 20.48);
  });

  it("allows runtime controls to disable the png background", () => {
    const state = createState();
    const { canvas, context } = createMockCanvas();

    createToolcraftPngExportCanvas({
      background: "#112233",
      canvasFactory: () => canvas,
      devicePixelRatio: 2,
      includeBackground: false,
      render: vi.fn(),
      state,
    });

    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("allows runtime controls to include the png background for transparent schema defaults", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      export: {
        png: {
          background: "transparent",
        },
      },
      panels: {},
    });
    const state = createState(schema);
    const { canvas, context } = createMockCanvas();

    createToolcraftPngExportCanvas({
      background: "#445566",
      canvasFactory: () => canvas,
      devicePixelRatio: 2,
      includeBackground: true,
      render: vi.fn(),
      state,
    });

    expect(context.fillStyle).toBe("#445566");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 200);
  });
});
