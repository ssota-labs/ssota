import { describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { createToolcraftState } from "./create-template-state";

describe("createToolcraftState", () => {
  it("initializes values from control defaults by target", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  target: "selectedLayer.opacity",
                  type: "slider",
                },
                prompt: {
                  defaultValue: "",
                  target: "generation.prompt",
                  type: "textarea",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    const state = createToolcraftState(app);

    expect(state.values).toEqual({
      "generation.prompt": "",
      "selectedLayer.opacity": 75,
    });
    expect(state.defaults).toEqual(state.values);
    expect(state.values).not.toBe(state.defaults);
  });

  it("initializes editable canvas size control defaults only for editable output apps", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, sizing: { mode: "editable-output" } },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });

    const state = createToolcraftState(app);

    expect(state.values).toMatchObject({
      "canvas.aspectRatio": {
        height: 9,
        mode: "preset",
        value: "16:9",
        width: 16,
      },
      "canvas.size.height": 1080,
      "canvas.size.width": 1920,
    });
  });

  it("keeps runtime timeline presentation out of product values and defaults", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, renderScale: true, sizing: { mode: "editable-output" } },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
        timeline: { mode: "playback" },
      },
    });

    const state = createToolcraftState(app);

    expect(state.values).not.toHaveProperty("panels.timeline.extended");
    expect(state.values).not.toHaveProperty("panels.timeline.visible");
    expect(state.defaults).not.toHaveProperty("panels.timeline.extended");
    expect(state.defaults).not.toHaveProperty("panels.timeline.visible");
    expect(state.panels.timeline.extended).toBeUndefined();
    expect(state.panels.timeline.hidden).toBeUndefined();
  });

  it("initializes timeline duration from the schema loop duration", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        timeline: { defaultDurationSeconds: 14, mode: "playback" },
      },
    });

    const state = createToolcraftState(app);

    expect(state.timeline.durationSeconds).toBe(14);
    expect(state.timeline.isLooping).toBe(true);
  });

  it("initializes canvas state from resolved canvas size", () => {
    const size = { width: 1200, height: 900, unit: "px" } as const;
    const app = defineToolcraft({
      canvas: { enabled: true, size },
      panels: {},
    });

    const state = createToolcraftState(app);

    expect(state.canvas.size).toEqual(size);
    expect(state.canvas.zoom).toBe(100);
  });

  it("preserves seeded canvas width", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    const state = createToolcraftState(app, {
      canvas: {
        size: { width: 640, height: 900, unit: "px" },
      },
    });

    expect(state.canvas.size).toEqual({ width: 640, height: 900, unit: "px" });
  });

  it("initializes default panel offsets", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    const state = createToolcraftState(app);

    expect(state.panels).toEqual({
      controls: { offset: { x: 0, y: 0 } },
      layers: { offset: { x: 0, y: 0 } },
      timeline: { offset: { x: 0, y: 0 } },
      toolbar: { offset: { x: 0, y: 0 } },
    });
  });

  it("initializes media and layer state as empty", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    const state = createToolcraftState(app);

    expect(state.layers).toEqual([]);
    expect(state.mediaAssets).toEqual([]);
    expect(state.selectedLayerId).toBeNull();
  });

  it("initializes predefined media files as runtime attachments", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      media: {
        defaultAssets: [
          {
            dataUrl: "data:image/png;base64,AAAA",
            fileName: "background.png",
            id: "default-background",
            layerId: "default-background-layer",
            mimeType: "image/png",
            size: { height: 1080, unit: "px", width: 1920 },
            sourceTarget: "media.background",
          },
        ],
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                background: {
                  defaultValue: null,
                  target: "media.background",
                  type: "fileDrop",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    const state = createToolcraftState(app);

    expect(state.mediaAssets).toEqual([
      expect.objectContaining({
        dataUrl: "data:image/png;base64,AAAA",
        fileName: "background.png",
        id: "default-background",
        layerId: "default-background-layer",
        mimeType: "image/png",
        sourceTarget: "media.background",
      }),
    ]);
    expect(state.layers).toEqual([
      expect.objectContaining({
        id: "default-background-layer",
        name: "background",
        visible: true,
      }),
    ]);
    expect(state.selectedLayerId).toBe("default-background-layer");
  });

  it("lets persisted media state override schema default media", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      media: {
        defaultAssets: [
          {
            dataUrl: "data:image/png;base64,AAAA",
            fileName: "background.png",
            sourceTarget: "media.background",
          },
        ],
      },
      panels: {},
    });

    const state = createToolcraftState(app, { mediaAssets: [] });

    expect(state.mediaAssets).toEqual([]);
    expect(state.layers).toEqual([]);
    expect(state.selectedLayerId).toBeNull();
  });

  it("restores default media layer names when persisted media omits layer state", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      media: {
        defaultAssets: [
          {
            dataUrl: "data:image/png;base64,AAAA",
            fileName: "background.png",
            id: "default-background",
            layerId: "default-background-layer",
            layerName: "Hero source",
            sourceTarget: "media.background",
          },
        ],
      },
      panels: {},
    });

    const state = createToolcraftState(app, {
      mediaAssets: [
        {
          dataUrl: "data:image/png;base64,AAAA",
          fileName: "background.png",
          id: "default-background",
          layerId: "default-background-layer",
          mimeType: "image/png",
          position: { x: 0, y: 0 },
          sourceTarget: "media.background",
        },
      ],
    });

    expect(state.layers).toEqual([
      expect.objectContaining({
        displayName: "Hero source",
        id: "default-background-layer",
        name: "Hero source",
      }),
    ]);
    expect(state.selectedLayerId).toBe("default-background-layer");
  });

  it("accepts seeded runtime layer state", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    const state = createToolcraftState(app, {
      layers: [
        {
          displayName: "Layer 1",
          id: "layer-1",
          kind: "layer",
          name: "layer-1",
          visible: true,
        },
      ],
      selectedLayerId: "layer-1",
    });

    expect(state.layers).toHaveLength(1);
    expect(state.layers[0]?.displayName).toBe("Layer 1");
    expect(state.selectedLayerId).toBe("layer-1");
    expect(state.history.undo).toEqual([]);
  });

  it("creates timeline runtime state", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    const state = createToolcraftState(app, {
      timeline: {
        currentTimeSeconds: 2,
        durationSeconds: 10,
        isPlaying: false,
      },
    });

    expect(state.timeline.currentTimeSeconds).toBe(2);
    expect(state.timeline.durationSeconds).toBe(10);
    expect(state.timeline.expanded).toBe(false);
    expect(state.timeline.isLooping).toBe(true);
    expect(state.timeline.isPlaying).toBe(false);
    expect(state.timeline.keyframeGroups).toEqual([]);
  });

  it("keeps upload-dependent intrinsic-media timelines paused until media exists", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
        upload: true,
      },
      panels: {
        timeline: { mode: "playback" },
      },
    });

    const state = createToolcraftState(app);

    expect(state.timeline.currentTimeSeconds).toBe(0);
    expect(state.timeline.isPlaying).toBe(false);
  });

  it("allows upload-dependent intrinsic-media timelines to start ready when media is seeded", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
        upload: true,
      },
      panels: {
        timeline: { mode: "playback" },
      },
    });

    const state = createToolcraftState(app, {
      mediaAssets: [
        {
          dataUrl: "data:image/png;base64,AAAA",
          fileName: "source.png",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "image/png",
          position: { x: 0, y: 0 },
          size: { height: 320, unit: "px", width: 512 },
        },
      ],
    });

    expect(state.timeline.isPlaying).toBe(true);
  });

  it("accepts seeded timeline keyframes without making them runtime defaults", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    const state = createToolcraftState(app, {
      timeline: {
        keyframeGroups: [
          {
            controlId: "opacity",
            keyframes: [
              {
                controlId: "opacity",
                controlLabel: "Opacity",
                easing: { controlPoints: [0.65, 0, 0.35, 1], type: "bezier" },
                id: "opacity-0",
                timeSeconds: 0,
                valueLabel: "Opacity 75%",
              },
            ],
            label: "Opacity",
          },
        ],
      },
    });

    expect(state.timeline.keyframeGroups.map((group) => group.controlId)).toEqual(["opacity"]);
  });
});
