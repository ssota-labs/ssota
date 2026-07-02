import { describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { ToolcraftInitialState } from "./types";
import { createToolcraftState } from "./create-template-state";
import { toolcraftReducer } from "./reducer";

function createState(initialState?: ToolcraftInitialState) {
  const app = defineToolcraft({
    canvas: {
      enabled: true,
      size: { width: 1024, height: 768, unit: "px" },
    },
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
            },
          },
        ],
        title: "Controls",
      },
    },
  });

  return createToolcraftState(app, initialState);
}

describe("toolcraftReducer", () => {
  it("resets controls to defaults and records history", () => {
    const changed = toolcraftReducer(createState(), {
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 12,
    });

    const state = toolcraftReducer(changed, { type: "controls.reset" });

    expect(state.values["selectedLayer.opacity"]).toBe(75);
    expect(state.history.undo.at(-1)?.label).toBe("Reset controls");
  });

  it("resets selected control targets to defaults and records one history patch", () => {
    const app = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                contrast: {
                  defaultValue: 22,
                  target: "style.contrast",
                  type: "slider",
                },
                opacity: {
                  defaultValue: 75,
                  target: "selectedLayer.opacity",
                  type: "slider",
                },
              },
              title: "Tone",
            },
          ],
          title: "Controls",
        },
      },
    });
    const changedOpacity = toolcraftReducer(createToolcraftState(app), {
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 12,
    });
    const changedBoth = toolcraftReducer(changedOpacity, {
      target: "style.contrast",
      type: "controls.setValue",
      value: 9,
    });

    const state = toolcraftReducer(changedBoth, {
      label: "Reset Tone section",
      targets: ["selectedLayer.opacity"],
      type: "controls.resetTargets",
    });

    expect(state.values["selectedLayer.opacity"]).toBe(75);
    expect(state.values["style.contrast"]).toBe(9);
    expect(state.history.undo).toHaveLength(3);
    expect(state.history.undo.at(-1)).toMatchObject({
      after: { "selectedLayer.opacity": 75 },
      before: { "selectedLayer.opacity": 12 },
      label: "Reset Tone section",
    });
  });

  it("clears single-layer fileDrop media on global reset", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  defaultValue: null,
                  target: "media.source",
                  type: "fileDrop",
                },
              },
              title: "Source",
            },
          ],
          title: "Controls",
        },
      },
    });
    const imported = toolcraftReducer(createToolcraftState(app), {
      asset: {
        dataUrl: "data:image/png;base64,test",
        fileName: "source.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { height: 768, unit: "px", width: 1024 },
        sourceTarget: "media.source",
      },
      type: "media.import",
    });

    const state = toolcraftReducer(imported, { type: "controls.reset" });
    const undone = toolcraftReducer(state, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(imported.mediaAssets).toHaveLength(1);
    expect(state.mediaAssets).toEqual([]);
    expect(state.values["media.source"]).toBeNull();
    expect(undone.mediaAssets).toEqual(imported.mediaAssets);
    expect(redone.mediaAssets).toEqual([]);
    expect(state.history.undo.at(-1)).toMatchObject({
      after: { mediaAssets: [] },
      before: { mediaAssets: imported.mediaAssets },
      label: "Reset controls",
    });
  });

  it("restores predefined fileDrop media on global and section reset", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      media: {
        defaultAssets: [
          {
            dataUrl: "data:image/png;base64,AAAA",
            fileName: "default-background.png",
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
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });
    const initial = createToolcraftState(app);
    const deleted = toolcraftReducer(initial, {
      mediaId: "default-background",
      type: "media.delete",
    });
    const sectionReset = toolcraftReducer(deleted, {
      label: "Reset Background section",
      targets: ["media.background"],
      type: "controls.resetTargets",
    });
    const deletedAgain = toolcraftReducer(sectionReset, {
      mediaId: "default-background",
      type: "media.delete",
    });
    const globalReset = toolcraftReducer(deletedAgain, { type: "controls.reset" });

    expect(initial.mediaAssets.map((asset) => asset.id)).toEqual(["default-background"]);
    expect(deleted.mediaAssets).toEqual([]);
    expect(sectionReset.mediaAssets.map((asset) => asset.id)).toEqual([
      "default-background",
    ]);
    expect(sectionReset.layers.map((layer) => layer.id)).toEqual([
      "default-background-layer",
    ]);
    expect(sectionReset.selectedLayerId).toBe("default-background-layer");
    expect(globalReset.mediaAssets.map((asset) => asset.id)).toEqual([
      "default-background",
    ]);
  });

  it("stores arbitrary fileDrop media without image dimensions and clears it on reset", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  assetKind: "file",
                  defaultValue: null,
                  target: "files.source",
                  type: "fileDrop",
                },
              },
              title: "Files",
            },
          ],
          title: "Controls",
        },
      },
    });
    const imported = toolcraftReducer(createToolcraftState(app), {
      asset: {
        assetKind: "file",
        dataUrl: "data:text/plain;base64,aGVsbG8=",
        fileName: "notes.txt",
        mimeType: "text/plain",
        position: { x: 0, y: 0 },
        sourceTarget: "files.source",
      },
      type: "media.import",
    });

    const state = toolcraftReducer(imported, { type: "controls.reset" });

    expect(imported.mediaAssets).toHaveLength(1);
    expect(imported.mediaAssets[0]).toMatchObject({
      assetKind: "file",
      fileName: "notes.txt",
      sourceTarget: "files.source",
    });
    expect(imported.mediaAssets[0]?.size).toBeUndefined();
    expect(imported.canvas.size).toEqual(createToolcraftState(app).canvas.size);
    expect(state.mediaAssets).toEqual([]);
  });

  it("records image media rotate and flip transforms in runtime history", () => {
    const imported = toolcraftReducer(createState(), {
      asset: {
        assetKind: "image",
        dataUrl: "data:image/png;base64,test",
        fileName: "source.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { height: 768, unit: "px", width: 1024 },
      },
      type: "media.import",
    });

    const rotated = toolcraftReducer(imported, {
      mediaId: imported.mediaAssets[0]?.id ?? "",
      operation: "rotate-right",
      type: "media.transform",
    });
    const flipped = toolcraftReducer(rotated, {
      mediaId: imported.mediaAssets[0]?.id ?? "",
      operation: "flip-horizontal",
      type: "media.transform",
    });
    const undone = toolcraftReducer(flipped, { type: "history.undo" });

    expect(rotated.mediaAssets[0]?.transform).toEqual({ rotationDeg: 90 });
    expect(flipped.mediaAssets[0]?.transform).toEqual({
      flipHorizontal: true,
      rotationDeg: 90,
    });
    expect(flipped.history.undo.at(-1)).toMatchObject({
      before: { mediaAssets: rotated.mediaAssets },
      label: "Transform media",
    });
    expect(undone.mediaAssets[0]?.transform).toEqual({ rotationDeg: 90 });
  });

  it("ignores image transforms for arbitrary file media", () => {
    const imported = toolcraftReducer(createState(), {
      asset: {
        assetKind: "file",
        dataUrl: "data:text/plain;base64,aGVsbG8=",
        fileName: "notes.txt",
        mimeType: "text/plain",
        position: { x: 0, y: 0 },
      },
      type: "media.import",
    });

    const transformed = toolcraftReducer(imported, {
      mediaId: imported.mediaAssets[0]?.id ?? "",
      operation: "rotate-right",
      type: "media.transform",
    });

    expect(transformed).toBe(imported);
  });

  it("clears only selected fileDrop media on section reset", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                primary: {
                  defaultValue: null,
                  target: "media.primary",
                  type: "fileDrop",
                },
                secondary: {
                  defaultValue: null,
                  target: "media.secondary",
                  type: "fileDrop",
                },
              },
              title: "Sources",
            },
          ],
          title: "Controls",
        },
      },
    });
    const first = toolcraftReducer(createToolcraftState(app), {
      asset: {
        dataUrl: "data:image/png;base64,primary",
        fileName: "primary.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { height: 768, unit: "px", width: 1024 },
        sourceTarget: "media.primary",
      },
      replaceExisting: false,
      type: "media.import",
    });
    const second = toolcraftReducer(first, {
      asset: {
        dataUrl: "data:image/png;base64,secondary",
        fileName: "secondary.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { height: 768, unit: "px", width: 1024 },
        sourceTarget: "media.secondary",
      },
      replaceExisting: false,
      type: "media.import",
    });

    const state = toolcraftReducer(second, {
      label: "Reset Primary section",
      targets: ["media.primary"],
      type: "controls.resetTargets",
    });

    expect(state.mediaAssets).toHaveLength(1);
    expect(state.mediaAssets[0]?.fileName).toBe("secondary.png");
    expect(state.history.undo.at(-1)).toMatchObject({
      after: { mediaAssets: state.mediaAssets },
      before: { mediaAssets: second.mediaAssets },
      label: "Reset Primary section",
    });
  });

  it("keeps layer-owned media on global reset", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  defaultValue: null,
                  target: "media.source",
                  type: "fileDrop",
                },
              },
              title: "Source",
            },
          ],
          title: "Controls",
        },
        layers: true,
      },
    });
    const imported = toolcraftReducer(createToolcraftState(app), {
      asset: {
        dataUrl: "data:image/png;base64,test",
        fileName: "source.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { height: 768, unit: "px", width: 1024 },
        sourceTarget: "media.source",
      },
      type: "media.import",
    });

    const state = toolcraftReducer(imported, { type: "controls.reset" });

    expect(state.mediaAssets).toEqual(imported.mediaAssets);
  });

  it("updates canvas size and records history", () => {
    const size = { width: 1200, height: 900, unit: "px" } as const;

    const state = toolcraftReducer(createState(), {
      size,
      type: "canvas.setSize",
    });

    expect(state.canvas.size).toEqual(size);
    expect(state.history.undo.at(-1)?.label).toBe("Resize canvas");
  });

  it("preserves app-chosen canvas size changes below the app shell minimum", () => {
    const state = toolcraftReducer(createState(), {
      size: { width: 640, height: 900, unit: "px" },
      type: "canvas.setSize",
    });

    expect(state.canvas.size).toEqual({ width: 640, height: 900, unit: "px" });
    expect(state.history.undo.at(-1)?.after).toEqual({
      "canvas.size": { width: 640, height: 900, unit: "px" },
    });
  });

  it("routes canvas size control targets through canvas runtime state", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        size: { width: 1200, height: 768, unit: "px" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                width: {
                  defaultValue: 1200,
                  target: "canvas.size.width",
                  type: "text",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    const changed = toolcraftReducer(createToolcraftState(app), {
      target: "canvas.size.width",
      type: "controls.setValue",
      value: "640",
    });
    const reset = toolcraftReducer(changed, { type: "controls.reset" });
    const undone = toolcraftReducer(changed, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(changed.canvas.size.width).toBe(640);
    expect(changed.canvas.size.height).toBe(768);
    expect(changed.values["canvas.aspectRatio"]).toEqual({
      height: 6,
      mode: "custom",
      value: "5:6",
      width: 5,
    });
    expect(changed.values["canvas.size.width"]).toBe(640);
    expect(changed.values["canvas.size.height"]).toBe(768);
    expect(changed.history.undo.at(-1)?.label).toBe("canvas.size.width");
    expect(reset.canvas.size.width).toBe(1200);
    expect(reset.canvas.size.height).toBe(768);
    expect(reset.values["canvas.size.width"]).toBe(1200);
    expect(reset.values["canvas.size.height"]).toBe(768);
    expect(reset.history.undo.at(-1)?.label).toBe("Reset controls");
    expect(undone.canvas.size.width).toBe(1200);
    expect(undone.canvas.size.height).toBe(768);
    expect(redone.canvas.size.width).toBe(640);
    expect(redone.canvas.size.height).toBe(768);
  });

  it("routes canvas aspect ratio presets through canvas runtime state", () => {
    const state = createState();

    const changed = toolcraftReducer(state, {
      target: "canvas.aspectRatio",
      type: "controls.setValue",
      value: {
        height: 9,
        mode: "preset",
        value: "16:9",
        width: 16,
      },
    });

    expect(changed.canvas.size).toEqual({ height: 1080, unit: "px", width: 1920 });
    expect(changed.values["canvas.aspectRatio"]).toEqual({
      height: 9,
      mode: "preset",
      value: "16:9",
      width: 16,
    });
    expect(changed.values["canvas.size.width"]).toBe(1920);
    expect(changed.values["canvas.size.height"]).toBe(1080);
    expect(changed.history.undo.at(-1)?.label).toBe("canvas.aspectRatio");
  });

  it("turns manual canvas size edits into a custom aspect ratio", () => {
    const state = toolcraftReducer(createState(), {
      target: "canvas.aspectRatio",
      type: "controls.setValue",
      value: {
        height: 9,
        mode: "preset",
        value: "16:9",
        width: 16,
      },
    });

    const changed = toolcraftReducer(state, {
      target: "canvas.size.height",
      type: "controls.setValue",
      value: "720",
    });

    expect(changed.canvas.size).toEqual({ height: 720, unit: "px", width: 1920 });
    expect(changed.values["canvas.aspectRatio"]).toEqual({
      height: 3,
      mode: "custom",
      value: "8:3",
      width: 8,
    });
    expect(changed.values["canvas.size.height"]).toBe(720);
    expect(changed.values["canvas.size.width"]).toBe(1920);
  });

  it("keeps repeated canvas size values as no-op without changing aspect ratio mode", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 1080, unit: "px", width: 1920 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });
    const state = createToolcraftState(app);

    const unchanged = toolcraftReducer(state, {
      target: "canvas.size.width",
      type: "controls.setValue",
      value: "1920",
    });

    expect(unchanged).toBe(state);
    expect(unchanged.values["canvas.aspectRatio"]).toEqual({
      height: 9,
      mode: "preset",
      value: "16:9",
      width: 16,
    });
    expect(unchanged.history.undo).toEqual([]);
  });

  it("updates canvas offset without recording history", () => {
    const state = createState();

    const next = toolcraftReducer(state, {
      offset: { x: 12, y: -8 },
      type: "canvas.setOffset",
    });

    expect(next.canvas.offset).toEqual({ x: 12, y: -8 });
    expect(next.history.undo).toHaveLength(0);
  });

  it("pans canvas by a delta", () => {
    const moved = toolcraftReducer(createState(), {
      offset: { x: 12, y: -8 },
      type: "canvas.setOffset",
    });

    const next = toolcraftReducer(moved, {
      delta: { x: 3, y: 10 },
      type: "canvas.panBy",
    });

    expect(next.canvas.offset).toEqual({ x: 15, y: 2 });
  });

  it("undoes canvas size changes", () => {
    const changed = toolcraftReducer(createState(), {
      size: { width: 1200, height: 900, unit: "px" },
      type: "canvas.setSize",
    });

    const state = toolcraftReducer(changed, { type: "history.undo" });

    expect(state.canvas.size).toEqual({ width: 1024, height: 768, unit: "px" });
    expect(state.values).not.toHaveProperty("canvas.size");
  });

  it("redoes canvas size changes", () => {
    const changed = toolcraftReducer(createState(), {
      size: { width: 1200, height: 900, unit: "px" },
      type: "canvas.setSize",
    });

    const undone = toolcraftReducer(changed, { type: "history.undo" });
    const state = toolcraftReducer(undone, { type: "history.redo" });

    expect(state.canvas.size).toEqual({ width: 1200, height: 900, unit: "px" });
    expect(state.values).not.toHaveProperty("canvas.size");
  });

  it("zooms in, out, and resets", () => {
    let state = createState();

    state = toolcraftReducer(state, { type: "canvas.zoomOut" });
    state = toolcraftReducer(state, { type: "canvas.zoomOut" });
    state = toolcraftReducer(state, { type: "canvas.zoomIn" });

    expect(state.canvas.zoom).toBe(90);

    state = toolcraftReducer(state, { type: "canvas.zoomReset" });

    expect(state.canvas.zoom).toBe(100);
  });

  it("sets viewport zoom and offset for gesture zoom", () => {
    const state = toolcraftReducer(createState(), {
      offset: { x: -100, y: 24 },
      type: "canvas.setViewport",
      zoom: 999,
    });

    expect(state.canvas.offset).toEqual({ x: -100, y: 24 });
    expect(state.canvas.zoom).toBe(400);
  });

  it("updates panel offsets without changing control values", () => {
    const state = createState();

    const next = toolcraftReducer(state, {
      offset: { x: 24, y: -12 },
      panelId: "controls",
      type: "panels.setOffset",
    });

    expect(next.panels.controls.offset).toEqual({ x: 24, y: -12 });
    expect(next.values).toBe(state.values);
  });

  it("stores timeline extended presentation outside control values", () => {
    const state = createState();

    const extended = toolcraftReducer(state, {
      target: "panels.timeline.extended",
      type: "controls.setValue",
      value: true,
    });

    expect(extended.panels.timeline.extended).toBe(true);
    expect(extended.values).toBe(state.values);
    expect(extended.history).toBe(state.history);

    const compact = toolcraftReducer(extended, {
      target: "panels.timeline.extended",
      type: "controls.setValue",
      value: false,
    });

    expect(compact.panels.timeline.extended).toBe(false);
    expect(compact.values).toBe(state.values);
  });

  it("keeps legacy timeline panel visibility outside control values", () => {
    const state = createState();

    const hidden = toolcraftReducer(state, {
      target: "panels.timeline.visible",
      type: "controls.setValue",
      value: false,
    });

    expect(hidden.panels.timeline.hidden).toBe(true);
    expect(hidden.values).toBe(state.values);
    expect(hidden.history).toBe(state.history);

    const shown = toolcraftReducer(hidden, {
      hidden: false,
      panelId: "timeline",
      type: "panels.setHidden",
    });

    expect(shown.panels.timeline.hidden).toBe(false);
    expect(shown.values).toBe(state.values);
  });

  it("resets a panel offset to its default position", () => {
    const moved = toolcraftReducer(createState(), {
      offset: { x: 40, y: 80 },
      panelId: "controls",
      type: "panels.setOffset",
    });

    const next = toolcraftReducer(moved, {
      panelId: "controls",
      type: "panels.resetOffset",
    });

    expect(next.panels.controls.offset).toEqual({ x: 0, y: 0 });
  });

  it("imports media as an editable-canvas-sized layer and records history", () => {
    const state = createState();

    const next = toolcraftReducer(state, {
      asset: {
        dataUrl: "data:image/png;base64,test",
        fileName: "material.png",
        mimeType: "image/png",
        position: { x: 10, y: 20 },
        size: state.canvas.size,
      },
      type: "media.import",
    });

    expect(next.layers).toEqual([
      {
        displayName: "material",
        id: "layer-1",
        kind: "layer",
        name: "material",
        visible: true,
      },
    ]);
    expect(next.mediaAssets).toEqual([
      {
        dataUrl: "data:image/png;base64,test",
        fileName: "material.png",
        id: "media-1",
        layerId: "layer-1",
        mimeType: "image/png",
        position: { x: 10, y: 20 },
        size: state.canvas.size,
      },
    ]);
    expect(next.selectedLayerId).toBe("layer-1");
    expect(next.history.undo.at(-1)?.label).toBe("Import media");
  });

  it("deletes imported media without deleting the owning layer", () => {
    const state = toolcraftReducer(createState(), {
      asset: {
        dataUrl: "data:image/png;base64,test",
        fileName: "material.png",
        mimeType: "image/png",
        position: { x: 10, y: 20 },
        size: { height: 512, unit: "px", width: 512 },
      },
      type: "media.import",
    });

    const next = toolcraftReducer(state, {
      mediaId: "media-1",
      type: "media.delete",
    });

    expect(next.layers).toEqual(state.layers);
    expect(next.selectedLayerId).toBe("layer-1");
    expect(next.mediaAssets).toEqual([]);
    expect(next.history.undo.at(-1)?.label).toBe("Delete media");
  });

  it("keeps the current editable-output canvas size when importing background/source images", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 720, unit: "px", width: 1280 },
        upload: true,
      },
      panels: {},
    });
    const state = createToolcraftState(app);
    const imported = toolcraftReducer(state, {
      asset: {
        dataUrl: "data:image/png;base64,wide",
        fileName: "wide-source.png",
        mimeType: "image/png",
        position: { x: 42, y: 24 },
        size: { height: 1000, unit: "px", width: 4000 },
      },
      type: "media.import",
    });

    expect(imported.schema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(imported.canvas.size).toEqual({ height: 720, unit: "px", width: 1280 });
    expect(imported.mediaAssets[0]).toMatchObject({
      fileName: "wide-source.png",
      position: { x: 42, y: 24 },
      size: { height: 1000, unit: "px", width: 4000 },
    });
    expect(imported.history.undo.at(-1)?.after).not.toHaveProperty("canvas.size");
  });

  it("keeps manually edited editable-output canvas size when importing source images", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        upload: true,
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });
    const widthChanged = toolcraftReducer(createToolcraftState(app), {
      target: "canvas.size.width",
      type: "controls.setValue",
      value: "1440",
    });
    const heightChanged = toolcraftReducer(widthChanged, {
      target: "canvas.size.height",
      type: "controls.setValue",
      value: "900",
    });
    const imported = toolcraftReducer(heightChanged, {
      asset: {
        dataUrl: "data:image/png;base64,tall",
        fileName: "tall-source.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { height: 4000, unit: "px", width: 1000 },
      },
      type: "media.import",
    });

    expect(imported.schema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(imported.canvas.size).toEqual({ height: 900, unit: "px", width: 1440 });
    expect(imported.values["canvas.size.width"]).toBe(1440);
    expect(imported.values["canvas.size.height"]).toBe(900);
    expect(imported.mediaAssets[0]).toMatchObject({
      fileName: "tall-source.png",
      size: { height: 4000, unit: "px", width: 1000 },
    });
    expect(imported.history.undo.at(-1)?.after).not.toHaveProperty("canvas.size");
  });

  it("sizes explicit intrinsic media apps from the imported image and replaces single-layer media", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, sizing: { mode: "intrinsic-media" }, upload: true },
      panels: {},
    });
    const state = createToolcraftState(app);
    const first = toolcraftReducer(state, {
      asset: {
        dataUrl: "data:image/png;base64,first",
        fileName: "first.png",
        mimeType: "image/png",
        position: { x: 42, y: 24 },
        size: { height: 600, unit: "px", width: 800 },
      },
      type: "media.import",
    });
    const second = toolcraftReducer(first, {
      asset: {
        dataUrl: "data:image/png;base64,second",
        fileName: "second.png",
        mimeType: "image/png",
        position: { x: -20, y: 10 },
        size: { height: 720, unit: "px", width: 1280 },
      },
      type: "media.import",
    });

    expect(first.canvas.size).toEqual({ height: 600, unit: "px", width: 800 });
    expect(first.mediaAssets[0]).toMatchObject({
      fileName: "first.png",
      position: { x: 0, y: 0 },
      size: { height: 600, unit: "px", width: 800 },
    });
    expect(first.history.undo.at(-1)?.after).toMatchObject({
      "canvas.size": { height: 600, unit: "px", width: 800 },
    });
    expect(second.canvas.size).toEqual({ height: 720, unit: "px", width: 1280 });
    expect(second.layers).toHaveLength(1);
    expect(second.mediaAssets).toHaveLength(1);
    expect(second.mediaAssets[0]).toMatchObject({
      fileName: "second.png",
      id: "media-1",
      layerId: "layer-1",
      position: { x: 0, y: 0 },
      size: { height: 720, unit: "px", width: 1280 },
    });
  });

  it("appends single-layer media when import is explicitly non-replacing", () => {
    const state = createState();
    const first = toolcraftReducer(state, {
      asset: {
        dataUrl: "data:image/png;base64,first",
        fileName: "first.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });
    const second = toolcraftReducer(first, {
      asset: {
        dataUrl: "data:image/png;base64,second",
        fileName: "second.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });

    expect(second.layers.map((layer) => layer.id)).toEqual(["layer-1", "layer-2"]);
    expect(second.mediaAssets.map((asset) => asset.id)).toEqual(["media-1", "media-2"]);
    expect(second.mediaAssets.map((asset) => asset.fileName)).toEqual([
      "first.png",
      "second.png",
    ]);
    expect(second.selectedLayerId).toBe("layer-2");
  });

  it("reorders imported media assets and records undo history", () => {
    const state = createState();
    const first = toolcraftReducer(state, {
      asset: {
        dataUrl: "data:image/png;base64,first",
        fileName: "first.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });
    const second = toolcraftReducer(first, {
      asset: {
        dataUrl: "data:image/png;base64,second",
        fileName: "second.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });
    const third = toolcraftReducer(second, {
      asset: {
        dataUrl: "data:image/png;base64,third",
        fileName: "third.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });

    const reordered = toolcraftReducer(third, {
      mediaIds: ["media-3", "media-1", "media-2"],
      type: "media.reorder",
    });
    const undone = toolcraftReducer(reordered, { type: "history.undo" });

    expect(reordered.mediaAssets.map((asset) => asset.id)).toEqual([
      "media-3",
      "media-1",
      "media-2",
    ]);
    expect(reordered.history.undo.at(-1)?.label).toBe("Reorder media");
    expect(undone.mediaAssets.map((asset) => asset.id)).toEqual([
      "media-1",
      "media-2",
      "media-3",
    ]);
  });

  it("keeps omitted media assets after explicitly reordered media", () => {
    const state = createState();
    const first = toolcraftReducer(state, {
      asset: {
        dataUrl: "data:image/png;base64,first",
        fileName: "first.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });
    const second = toolcraftReducer(first, {
      asset: {
        dataUrl: "data:image/png;base64,second",
        fileName: "second.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });
    const third = toolcraftReducer(second, {
      asset: {
        dataUrl: "data:image/png;base64,third",
        fileName: "third.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: state.canvas.size,
      },
      replaceExisting: false,
      type: "media.import",
    });

    const reordered = toolcraftReducer(third, {
      mediaIds: ["media-2"],
      type: "media.reorder",
    });

    expect(reordered.mediaAssets.map((asset) => asset.id)).toEqual([
      "media-2",
      "media-1",
      "media-3",
    ]);
  });

  it("adds and selects runtime layers and groups", () => {
    const withGroup = toolcraftReducer(createState(), {
      layer: {
        displayName: "Scene Group",
        id: "group-1",
        kind: "group",
        name: "scene-group",
      },
      type: "layers.add",
    });
    const state = toolcraftReducer(withGroup, {
      insertIndex: 1,
      layer: {
        displayName: "Layer 1",
        id: "layer-1",
        name: "layer-1",
        parentGroupId: "group-1",
      },
      type: "layers.add",
    });

    expect(state.layers).toEqual([
      {
        collapsed: false,
        displayName: "Scene Group",
        id: "group-1",
        kind: "group",
        name: "scene-group",
        parentGroupId: undefined,
        visible: true,
      },
      {
        collapsed: undefined,
        displayName: "Layer 1",
        id: "layer-1",
        kind: "layer",
        name: "layer-1",
        parentGroupId: "group-1",
        visible: true,
      },
    ]);
    expect(state.selectedLayerId).toBe("layer-1");
  });

  it("renames layers and toggles visibility and collapsed groups", () => {
    const withGroup = toolcraftReducer(createState(), {
      layer: { id: "group-1", kind: "group", name: "Scene Group" },
      type: "layers.add",
    });
    const hidden = toolcraftReducer(withGroup, {
      layerId: "group-1",
      type: "layers.toggleVisibility",
    });
    const collapsed = toolcraftReducer(hidden, {
      layerId: "group-1",
      type: "layers.toggleCollapsed",
    });
    const renamed = toolcraftReducer(collapsed, {
      layerId: "group-1",
      name: "Main Scene",
      type: "layers.rename",
    });

    expect(renamed.layers[0]).toMatchObject({
      collapsed: true,
      displayName: "Main Scene",
      visible: false,
    });
    expect(renamed.history.undo.at(-1)?.label).toBe("Rename layer");
  });

  it("deletes groups with their children", () => {
    const withGroup = toolcraftReducer(createState(), {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    const withChild = toolcraftReducer(withGroup, {
      layer: { id: "layer-1", name: "Layer 1", parentGroupId: "group-1" },
      type: "layers.add",
    });
    const withSibling = toolcraftReducer(withChild, {
      layer: { id: "layer-2", name: "Layer 2" },
      type: "layers.add",
    });

    const state = toolcraftReducer(withSibling, {
      layerId: "group-1",
      type: "layers.delete",
    });

    expect(state.layers.map((layer) => layer.id)).toEqual(["layer-2"]);
    expect(state.selectedLayerId).toBe("layer-2");
  });

  it("deletes nested groups with every descendant layer", () => {
    let state = createState();

    state = toolcraftReducer(state, {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    state = toolcraftReducer(state, {
      layer: { id: "group-2", kind: "group", name: "Group 2", parentGroupId: "group-1" },
      type: "layers.add",
    });
    state = toolcraftReducer(state, {
      layer: { id: "layer-1", name: "Layer 1", parentGroupId: "group-2" },
      type: "layers.add",
    });
    state = toolcraftReducer(state, {
      layer: { id: "layer-2", name: "Layer 2" },
      type: "layers.add",
    });

    const deleted = toolcraftReducer(state, {
      layerId: "group-1",
      type: "layers.delete",
    });

    expect(deleted.layers.map((layer) => layer.id)).toEqual(["layer-2"]);
    expect(deleted.selectedLayerId).toBe("layer-2");
  });

  it("deletes media assets attached to a layer", () => {
    const imported = toolcraftReducer(createState(), {
      asset: {
        dataUrl: "data:image/png;base64,test",
        fileName: "material.png",
        mimeType: "image/png",
        position: { x: 0, y: 0 },
        size: { width: 1024, height: 768, unit: "px" },
      },
      type: "media.import",
    });

    const state = toolcraftReducer(imported, {
      layerId: "layer-1",
      type: "layers.delete",
    });

    expect(state.layers).toEqual([]);
    expect(state.mediaAssets).toEqual([]);
    expect(state.selectedLayerId).toBeNull();
  });

  it("moves layers into groups and back to root", () => {
    const withGroup = toolcraftReducer(createState(), {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    const withLayer = toolcraftReducer(withGroup, {
      layer: { id: "layer-1", name: "Layer 1" },
      type: "layers.add",
    });

    const grouped = toolcraftReducer(withLayer, {
      layerIds: ["layer-1"],
      parentGroupId: "group-1",
      type: "layers.moveToGroup",
    });
    const rooted = toolcraftReducer(grouped, {
      layerIds: ["layer-1"],
      parentGroupId: null,
      type: "layers.moveToGroup",
    });

    expect(grouped.layers.find((layer) => layer.id === "layer-1")?.parentGroupId).toBe("group-1");
    expect(grouped.history.undo.at(-1)?.label).toBe("Move layers to group");
    expect(rooted.layers.find((layer) => layer.id === "layer-1")?.parentGroupId).toBeUndefined();
    expect(rooted.history.undo.at(-1)?.label).toBe("Move layers to root");
  });

  it("opens collapsed groups when moving layers into them", () => {
    const withGroup = toolcraftReducer(createState(), {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    const withCollapsedGroup = toolcraftReducer(withGroup, {
      layerId: "group-1",
      type: "layers.toggleCollapsed",
    });
    const withLayer = toolcraftReducer(withCollapsedGroup, {
      layer: { id: "layer-1", name: "Layer 1" },
      type: "layers.add",
    });

    const grouped = toolcraftReducer(withLayer, {
      layerIds: ["layer-1"],
      parentGroupId: "group-1",
      type: "layers.moveToGroup",
    });

    expect(grouped.layers.find((layer) => layer.id === "group-1")?.collapsed).toBe(false);
    expect(grouped.layers.find((layer) => layer.id === "layer-1")?.parentGroupId).toBe("group-1");
  });

  it("places moved layers directly under the target group", () => {
    const withFirst = toolcraftReducer(createState(), {
      layer: { id: "layer-1", name: "Layer 1" },
      type: "layers.add",
    });
    const withGroup = toolcraftReducer(withFirst, {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    const withExistingChild = toolcraftReducer(withGroup, {
      layer: { id: "layer-2", name: "Layer 2", parentGroupId: "group-1" },
      type: "layers.add",
    });
    const withDraggedLayer = toolcraftReducer(withExistingChild, {
      layer: { id: "layer-3", name: "Layer 3" },
      type: "layers.add",
    });

    const state = toolcraftReducer(withDraggedLayer, {
      layerIds: ["layer-3"],
      parentGroupId: "group-1",
      type: "layers.moveToGroup",
    });

    expect(state.layers.map((layer) => layer.id)).toEqual([
      "layer-1",
      "group-1",
      "layer-3",
      "layer-2",
    ]);
    expect(state.layers.find((layer) => layer.id === "layer-3")?.parentGroupId).toBe("group-1");
  });

  it("does not move groups into their own descendants", () => {
    const withParent = toolcraftReducer(createState(), {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    const withChild = toolcraftReducer(withParent, {
      layer: { id: "group-2", kind: "group", name: "Group 2", parentGroupId: "group-1" },
      type: "layers.add",
    });

    const state = toolcraftReducer(withChild, {
      layerIds: ["group-1"],
      parentGroupId: "group-2",
      type: "layers.moveToGroup",
    });

    expect(state).toBe(withChild);
  });

  it("reorders layers and supports undo and redo", () => {
    const withFirst = toolcraftReducer(createState(), {
      layer: { id: "layer-1", name: "Layer 1" },
      type: "layers.add",
    });
    const withSecond = toolcraftReducer(withFirst, {
      layer: { id: "layer-2", name: "Layer 2" },
      type: "layers.add",
    });
    const reordered = toolcraftReducer(withSecond, {
      layers: [withSecond.layers[1]!, withSecond.layers[0]!],
      selectedLayerId: "layer-1",
      type: "layers.reorder",
    });
    const undone = toolcraftReducer(reordered, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(reordered.layers.map((layer) => layer.id)).toEqual(["layer-2", "layer-1"]);
    expect(reordered.selectedLayerId).toBe("layer-1");
    expect(undone.layers.map((layer) => layer.id)).toEqual(["layer-1", "layer-2"]);
    expect(redone.layers.map((layer) => layer.id)).toEqual(["layer-2", "layer-1"]);
  });

  it("preserves nested move undo and redo", () => {
    let state = createState();

    state = toolcraftReducer(state, {
      layer: { id: "group-1", kind: "group", name: "Group 1" },
      type: "layers.add",
    });
    state = toolcraftReducer(state, {
      layer: { id: "group-2", kind: "group", name: "Group 2" },
      type: "layers.add",
    });
    state = toolcraftReducer(state, {
      layer: { id: "layer-1", name: "Layer 1", parentGroupId: "group-1" },
      type: "layers.add",
    });

    const moved = toolcraftReducer(state, {
      layerIds: ["layer-1"],
      parentGroupId: "group-2",
      type: "layers.moveToGroup",
    });
    const undone = toolcraftReducer(moved, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(moved.layers.find((layer) => layer.id === "layer-1")?.parentGroupId).toBe("group-2");
    expect(undone.layers.find((layer) => layer.id === "layer-1")?.parentGroupId).toBe("group-1");
    expect(redone.layers.find((layer) => layer.id === "layer-1")?.parentGroupId).toBe("group-2");
  });

  it("undoes and redoes media imports", () => {
    const imported = toolcraftReducer(createState(), {
      asset: {
        dataUrl: "data:image/png;base64,test",
        fileName: "material.png",
        mimeType: "image/png",
        position: { x: 10, y: 20 },
        size: { width: 1024, height: 768, unit: "px" },
      },
      type: "media.import",
    });

    const undone = toolcraftReducer(imported, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(undone.layers).toEqual([]);
    expect(undone.mediaAssets).toEqual([]);
    expect(undone.selectedLayerId).toBeNull();
    expect(redone.layers).toHaveLength(1);
    expect(redone.mediaAssets).toHaveLength(1);
    expect(redone.selectedLayerId).toBe("layer-1");
  });

  it("undoes and redoes value changes", () => {
    const changed = toolcraftReducer(createState(), {
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 12,
    });

    const undone = toolcraftReducer(changed, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(undone.values["selectedLayer.opacity"]).toBe(75);
    expect(redone.values["selectedLayer.opacity"]).toBe(12);
  });

  it("merges live control changes from one editor gesture into one undo step", () => {
    const base = createState();
    const first = toolcraftReducer(base, {
      history: "merge",
      historyGroup: "opacity-drag-1",
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 76,
    });
    const second = toolcraftReducer(first, {
      history: "merge",
      historyGroup: "opacity-drag-1",
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 82,
    });
    const third = toolcraftReducer(second, {
      history: "merge",
      historyGroup: "opacity-drag-1",
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 91,
    });

    expect(third.values["selectedLayer.opacity"]).toBe(91);
    expect(third.history.undo).toHaveLength(1);
    expect(third.history.undo[0]).toMatchObject({
      after: { "selectedLayer.opacity": 91 },
      before: { "selectedLayer.opacity": 75 },
      group: "opacity-drag-1",
    });

    const undone = toolcraftReducer(third, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(undone.values["selectedLayer.opacity"]).toBe(75);
    expect(redone.values["selectedLayer.opacity"]).toBe(91);
  });

  it("starts a new undo step for a new live gesture on the same control", () => {
    const firstGesture = toolcraftReducer(createState(), {
      history: "merge",
      historyGroup: "opacity-drag-1",
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 82,
    });
    const secondGesture = toolcraftReducer(firstGesture, {
      history: "merge",
      historyGroup: "opacity-drag-2",
      target: "selectedLayer.opacity",
      type: "controls.setValue",
      value: 64,
    });

    expect(secondGesture.history.undo).toHaveLength(2);
    expect(secondGesture.history.undo[0]?.before).toEqual({
      "selectedLayer.opacity": 75,
    });
    expect(secondGesture.history.undo[0]?.after).toEqual({
      "selectedLayer.opacity": 82,
    });
    expect(secondGesture.history.undo[1]?.before).toEqual({
      "selectedLayer.opacity": 82,
    });
    expect(secondGesture.history.undo[1]?.after).toEqual({
      "selectedLayer.opacity": 64,
    });
  });

  it("updates timeline playback state without recording history", () => {
    const paused = toolcraftReducer(createState(), { type: "timeline.togglePlayback" });
    const loopDisabled = toolcraftReducer(paused, { type: "timeline.toggleLoop" });
    const scrubbed = toolcraftReducer(loopDisabled, {
      currentTimeSeconds: 4.25,
      type: "timeline.setCurrentTime",
    });

    expect(scrubbed.timeline.isPlaying).toBe(false);
    expect(scrubbed.timeline.isLooping).toBe(false);
    expect(scrubbed.timeline.currentTimeSeconds).toBe(4.25);
    expect(scrubbed.history.undo).toHaveLength(0);
  });

  it("keeps loop state when timeline duration changes", () => {
    const state = toolcraftReducer(
      createState({
        timeline: {
          currentTimeSeconds: 9,
          durationSeconds: 10,
          isLooping: true,
          isPlaying: true,
        },
      }),
      {
        target: "selectedLayer.opacity",
        type: "controls.setValue",
        value: 42,
      },
    );

    const resized = toolcraftReducer(state, {
      durationSeconds: 6,
      type: "timeline.setDuration",
    });

    expect(resized.timeline.durationSeconds).toBe(6);
    expect(resized.timeline.currentTimeSeconds).toBe(6);
    expect(resized.timeline.isPlaying).toBe(true);
    expect(resized.timeline.isLooping).toBe(true);
    expect(resized.values).toEqual(state.values);
    expect(resized.values["selectedLayer.opacity"]).toBe(42);
    expect(resized.defaults).toEqual(state.defaults);
  });

  it("restarts playback from the beginning when play is pressed at the non-looping end", () => {
    const paused = toolcraftReducer(createState(), { type: "timeline.togglePlayback" });
    const loopDisabled = toolcraftReducer(paused, { type: "timeline.toggleLoop" });
    const ended = toolcraftReducer(loopDisabled, {
      currentTimeSeconds: loopDisabled.timeline.durationSeconds,
      type: "timeline.setCurrentTime",
    });
    const replaying = toolcraftReducer(ended, { type: "timeline.togglePlayback" });

    expect(replaying.timeline.currentTimeSeconds).toBe(0);
    expect(replaying.timeline.isPlaying).toBe(true);
    expect(replaying.history.undo).toHaveLength(0);
  });

  it("pauses and resets upload-dependent timeline playback when deleting the last media asset", () => {
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
      timeline: {
        currentTimeSeconds: 3.5,
        isPlaying: true,
      },
    });

    const deleted = toolcraftReducer(state, {
      mediaId: "media-1",
      type: "media.delete",
    });

    expect(deleted.mediaAssets).toEqual([]);
    expect(deleted.timeline.currentTimeSeconds).toBe(0);
    expect(deleted.timeline.isPlaying).toBe(false);
    expect(deleted.history.undo.at(-1)?.after).toMatchObject({
      mediaAssets: [],
      timeline: expect.objectContaining({
        currentTimeSeconds: 0,
        isPlaying: false,
      }),
    });
  });

  it("stores timeline expanded state without recording history", () => {
    const expanded = toolcraftReducer(createState(), {
      expanded: true,
      type: "timeline.setExpanded",
    });
    const collapsed = toolcraftReducer(expanded, { type: "timeline.toggleExpanded" });

    expect(expanded.timeline.expanded).toBe(true);
    expect(expanded.history.undo).toHaveLength(0);
    expect(collapsed.timeline.expanded).toBe(false);
    expect(collapsed.history.undo).toHaveLength(0);
  });

  it("adds, updates, and removes control-owned timeline keyframes", () => {
    const baseState = createState();
    const emptyTimelineState = {
      ...baseState,
      timeline: {
        ...baseState.timeline,
        currentTimeSeconds: 2,
        expanded: false,
        keyframeGroups: [],
        selectedKeyframeId: null,
      },
    };
    const keyed = toolcraftReducer(emptyTimelineState, {
      controlId: "selectedLayer.opacity",
      controlLabel: "Opacity",
      type: "timeline.toggleControlKeyframes",
      value: 75,
      valueLabel: "75%",
    });

    expect(keyed.timeline.expanded).toBe(true);
    expect(keyed.timeline.selectedKeyframeId).toBe("selectedLayer.opacity::2");
    expect(keyed.timeline.keyframeGroups).toEqual([
      {
        controlId: "selectedLayer.opacity",
        keyframes: [
          {
            controlId: "selectedLayer.opacity",
            controlLabel: "Opacity",
            id: "selectedLayer.opacity::2",
            timeSeconds: 2,
            value: 75,
            valueLabel: "75%",
          },
        ],
        label: "Opacity",
      },
    ]);
    expect(keyed.history.undo.at(-1)?.label).toBe("Add control keyframe");

    const updated = toolcraftReducer(keyed, {
      controlId: "selectedLayer.opacity",
      controlLabel: "Opacity",
      type: "timeline.upsertControlKeyframe",
      value: 55,
      valueLabel: "55%",
    });

    expect(updated.timeline.keyframeGroups[0]?.keyframes).toHaveLength(1);
    expect(updated.timeline.keyframeGroups[0]?.keyframes[0]?.valueLabel).toBe("55%");
    expect(updated.timeline.keyframeGroups[0]?.keyframes[0]?.value).toBe(55);
    expect(updated.history.undo.at(-1)?.label).toBe("Set control keyframe");

    const removed = toolcraftReducer(updated, {
      controlId: "selectedLayer.opacity",
      controlLabel: "Opacity",
      type: "timeline.toggleControlKeyframes",
      value: 55,
      valueLabel: "55%",
    });

    expect(removed.timeline.keyframeGroups).toEqual([]);
    expect(removed.timeline.selectedKeyframeId).toBeNull();
    expect(removed.history.undo.at(-1)?.label).toBe("Delete control keyframes");
  });

  it("records timeline keyframe edits in history", () => {
    const baseState = createState();
    const stateWithKeyframe = {
      ...baseState,
      timeline: {
        ...baseState.timeline,
        keyframeGroups: [
          {
            controlId: "opacity",
            keyframes: [
              {
                controlId: "opacity",
                controlLabel: "Opacity",
                id: "opacity-0.75",
                timeSeconds: 0.75,
                valueLabel: "Opacity 20%",
              },
            ],
            label: "Opacity",
          },
        ],
      },
    };
    const moved = toolcraftReducer(stateWithKeyframe, {
      keyframeId: "opacity-0.75",
      timeSeconds: 2,
      type: "timeline.moveKeyframe",
    });
    const undone = toolcraftReducer(moved, { type: "history.undo" });
    const redone = toolcraftReducer(undone, { type: "history.redo" });

    expect(moved.timeline.selectedKeyframeId).toBe("opacity::2");
    expect(
      moved.timeline.keyframeGroups
        .flatMap((group) => group.keyframes)
        .find((keyframe) => keyframe.id === "opacity::2")?.timeSeconds,
    ).toBe(2);
    expect(moved.history.undo.at(-1)?.label).toBe("Move keyframe");
    expect(
      undone.timeline.keyframeGroups
        .flatMap((group) => group.keyframes)
        .some((keyframe) => keyframe.id === "opacity-0.75"),
    ).toBe(true);
    expect(
      redone.timeline.keyframeGroups
        .flatMap((group) => group.keyframes)
        .some((keyframe) => keyframe.id === "opacity::2"),
    ).toBe(true);
  });
});
