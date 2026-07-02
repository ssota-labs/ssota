import { describe, expect, it } from "vitest";

import { toolcraftRuntimeCommandTypes } from "../state/types";
import { defineToolcraft } from "./define-toolcraft";
import {
  toolcraftReservedTargets,
  toolcraftRuntimeOwnedTargets,
  getToolcraftCanvasSizeTargetDimension,
  isToolcraftReservedTarget,
  isToolcraftRuntimeOwnedTarget,
} from "./runtime-targets";

describe("defineToolcraft", () => {
  function createSliderControls(count: number) {
    return Object.fromEntries(
      Array.from({ length: count }, (_, index) => [
        `control${index}`,
        {
          defaultValue: index,
          target: `values.control${index}`,
          type: "slider",
        },
      ]),
    );
  }

  function getProductSections(app: ReturnType<typeof defineToolcraft>) {
    return app.panels.controls?.sections.filter((section) => section.title !== "Setup") ?? [];
  }

  it("defaults enabled canvas to draggable with canvas toolbar features", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    expect(app.canvas.draggable).toBe(true);
    expect(app.canvas.size).toEqual({ height: 1080, unit: "px", width: 1920 });
    expect(app.canvas.sizeSource).toBe("runtime-default");
    expect(app.canvas.sizing).toEqual({ mode: "intrinsic-media" });
    expect(app.toolbar).toEqual({ history: true, radar: true, theme: true, zoom: true });
  });

  it("defaults upload canvases to editable output unless intrinsic media is explicit", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {},
    });

    expect(app.canvas.size).toEqual({ height: 1080, unit: "px", width: 1920 });
    expect(app.canvas.sizeSource).toBe("runtime-default");
    expect(app.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(app.assembly.capabilities).toContain("canvas.editableSize");
    expect(app.assembly.commands).toContain("canvas.setSize");
  });

  it("preserves explicit intrinsic media sizing for source-native upload apps", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, sizing: { mode: "intrinsic-media" }, upload: true },
      panels: {},
    });

    expect(app.canvas.sizing).toEqual({ mode: "intrinsic-media" });
    expect(app.assembly.capabilities).not.toContain("canvas.editableSize");
    expect(app.assembly.commands).not.toContain("canvas.setSize");
  });

  it("disables app state persistence by default", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    expect(app.persistence).toEqual({ storage: "none" });
  });

  it("preserves explicit localStorage persistence policy without writing storage", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
      persistence: {
        include: ["values", "canvas", "panels"],
        key: "toolcraft:test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });

    expect(app.persistence).toEqual({
      include: ["values", "canvas", "panels"],
      key: "toolcraft:test:state:v1",
      storage: "localStorage",
      version: 1,
    });
  });

  it("keeps settings transfer visible for small auto schemas", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, size: { height: 320, unit: "px", width: 320 } },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  target: "style.opacity",
                  type: "slider",
                },
              },
              title: "Style",
            },
          ],
          title: "Mini App",
        },
      },
    });

    expect(app.settingsTransfer).toMatchObject({
      appId: "mini-app",
      enabled: true,
      fileName: "mini-app-settings.json",
      mode: "auto",
    });
    expect(app.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(app.panels.controls?.sections[0]?.controls.settingsTransfer).toMatchObject({
      target: "runtime.settingsTransfer",
      type: "settingsTransfer",
    });
    expect(app.panels.controls?.sections[0]?.controls.canvasAspectRatio).toMatchObject({
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(app.panels.controls?.sections[0]?.controls.canvasWidth).toBeTruthy();
  });

  it("keeps runtime setup controls outside product sections", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
      panels: {
        controls: {
          sections: [
            {
              controls: createSliderControls(10),
              title: "Product Controls",
            },
          ],
          title: "Runtime Size App",
        },
      },
      settingsTransfer: false,
    });

    expect(app.settingsTransfer.enabled).toBe(true);
    expect(app.panels.controls?.sections[0]?.controls.settingsTransfer).toMatchObject({
      target: "runtime.settingsTransfer",
      type: "settingsTransfer",
    });
    expect(app.panels.controls?.sections[0]?.controls.canvasAspectRatio).toBeTruthy();
    expect(app.panels.controls?.sections[0]?.controls.canvasWidth).toBeTruthy();
    expect(app.panels.controls?.sections[0]?.controls.canvasHeight).toBeTruthy();
    expect(getProductSections(app)).toHaveLength(1);
    expect(getProductSections(app)[0]?.title).toBe("Product Controls");
  });

  it("injects settings transfer as the first section for complex auto schemas", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Prompt",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
                mask: {
                  defaultValue: "Mask",
                  label: "Mask",
                  target: "generation.mask",
                  type: "code",
                },
                font: {
                  defaultValue: { fontId: "inter" },
                  label: "Font",
                  target: "typography.font",
                  type: "fontPicker",
                },
                gradient: {
                  label: "Gradient",
                  target: "style.gradient",
                  type: "gradient",
                },
              },
              title: "Text",
            },
            {
              controls: {
                opacity: { defaultValue: 80, target: "style.opacity", type: "slider" },
                blur: { defaultValue: 4, target: "style.blur", type: "slider" },
                threshold: { defaultValue: 50, target: "style.threshold", type: "slider" },
                seed: { defaultValue: 123, target: "style.seed", type: "text" },
                spacing: { defaultValue: 8, target: "style.spacing", type: "slider" },
                density: { defaultValue: 16, target: "style.density", type: "slider" },
                speed: { defaultValue: 1, target: "style.speed", type: "slider" },
              },
              title: "Style",
            },
            {
              controls: {
                anchor: { defaultValue: "center", target: "layout.anchor", type: "anchorGrid" },
              },
              layout: "standalone",
              title: "Layout",
            },
          ],
          title: "Complex App",
        },
        timeline: { mode: "playback" },
      },
    });

    const [runtimeSettingsSection, firstProductSection] =
      app.panels.controls?.sections ?? [];

    expect(app.settingsTransfer.enabled).toBe(true);
    expect(runtimeSettingsSection?.title).toBe("Setup");
    expect(Object.keys(runtimeSettingsSection?.controls ?? {})).toEqual([
      "settingsTransfer",
      "canvasAspectRatio",
      "canvasWidth",
      "canvasHeight",
      "timelineExtended",
    ]);
    expect(runtimeSettingsSection?.controls.canvasAspectRatio).toMatchObject({
      defaultValue: {
        height: 9,
        mode: "preset",
        value: "16:9",
        width: 16,
      },
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(runtimeSettingsSection?.controls.canvasWidth).toBeTruthy();
    expect(runtimeSettingsSection?.controls.canvasHeight).toBeTruthy();
    expect(runtimeSettingsSection?.controls.settingsTransfer?.type).toBe(
      "settingsTransfer",
    );
    expect(runtimeSettingsSection?.layout).toBe("standalone");
    expect(runtimeSettingsSection?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["canvasWidth", "canvasHeight"],
        layout: "inline",
      },
    ]);
    expect(firstProductSection?.title).toBe("Text");
  });

  it("uses explicit settings transfer naming while keeping the setup controls mandatory", () => {
    const forced = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [],
          title: "Tiny Tool",
        },
      },
      settingsTransfer: {
        appId: "Tiny Tool Presets",
        enabled: true,
        fileName: "tiny-presets",
      },
    });
    const disabled = defineToolcraft({
      canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
      panels: {
        controls: {
          sections: [
            {
              controls: Object.fromEntries(
                Array.from({ length: 12 }, (_, index) => [
                  `control${index}`,
                  {
                    defaultValue: index,
                    target: `values.control${index}`,
                    type: "slider",
                  },
                ]),
              ),
              title: "Many Controls",
            },
          ],
          title: "Heavy Tool",
        },
      },
      settingsTransfer: false,
    });

    expect(forced.settingsTransfer).toMatchObject({
      appId: "tiny-tool-presets",
      enabled: true,
      fileName: "tiny-presets.json",
    });
    expect(forced.panels.controls?.sections[0]?.controls.settingsTransfer?.type).toBe(
      "settingsTransfer",
    );
    expect(disabled.settingsTransfer).toMatchObject({
      enabled: true,
      mode: false,
    });
    expect(disabled.panels.controls?.sections[0]?.controls.settingsTransfer?.type).toBe(
      "settingsTransfer",
    );
  });

  it("preserves conditional visibility on sections and controls", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                partnerLogo: {
                  target: "coBrand.partnerLogo",
                  type: "fileDrop",
                  visibleWhen: {
                    equals: "logo",
                    target: "coBrand.identityMode",
                  },
                },
              },
              title: "Partner Logo",
              visibleWhen: {
                equals: "co-brand",
                target: "cover.templateId",
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    const [section] = getProductSections(app);

    expect(section?.visibleWhen).toEqual({
      equals: "co-brand",
      target: "cover.templateId",
    });
    expect(section?.controls.partnerLogo?.visibleWhen).toEqual({
      equals: "logo",
      target: "coBrand.identityMode",
    });
  });

  it("requires panel persistence when localStorage apps render draggable runtime panels", () => {
    expect(() =>
      defineToolcraft({
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
                },
              },
            ],
            title: "Controls",
          },
        },
        persistence: {
          include: ["values"],
          key: "toolcraft:panel-test:state:v1",
          storage: "localStorage",
          version: 1,
        },
      }),
    ).toThrow(
      'Toolcraft apps with visible runtime panels and localStorage persistence must include "panels" so dragged panel positions survive reload.',
    );
  });

  it("derives an AI assembly contract from app surfaces", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
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
        layers: true,
        timeline: true,
      },
    });

    expect(app.assembly.components).toEqual([
      "canvas",
      "controlsPanel",
      "layersPanel",
      "timelinePanel",
      "toolbar",
    ]);
    expect(app.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "canvas.draggable",
        "canvas.upload",
        "controls.defaults",
        "layers.selection",
        "timeline.keyframes",
        "toolbar.history",
        "toolbar.radar",
        "toolbar.theme",
        "toolbar.zoom",
      ]),
    );
    expect(app.assembly.commands).toEqual(
      expect.arrayContaining([
        "controls.reset",
        "controls.resetTargets",
        "history.undo",
        "media.delete",
        "media.import",
        "media.reorder",
        "media.transform",
        "layers.reorder",
        "timeline.setCurrentTime",
        "canvas.center",
        "canvas.setViewport",
      ]),
    );
    expect(app.assembly.surfaces.panels.layers?.defaultPlacement).toBe("left");
    expect(app.assembly.surfaces.panels.timeline?.snapEdges).toEqual(["top", "bottom"]);
    expect(app.panels.timeline).toEqual({
      defaultDurationSeconds: 8,
      enabled: true,
      mode: "keyframes",
    });
    expect(app.assembly.surfaces.panels.toolbar.enabled).toBe(true);
  });

  it("supports playback-only timeline apps without keyframe editing commands", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        timeline: { mode: "playback" },
      },
    });

    expect(app.panels.timeline).toEqual({
      defaultDurationSeconds: 8,
      enabled: true,
      mode: "playback",
    });
    expect(app.assembly.components).toContain("timelinePanel");
    expect(app.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "timeline.duration",
        "timeline.panel",
        "timeline.playback",
      ]),
    );
    expect(app.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(app.assembly.commands).toEqual(
      expect.arrayContaining([
        "timeline.setCurrentTime",
        "timeline.setDuration",
        "timeline.setPlaying",
        "timeline.toggleLoop",
        "timeline.togglePlayback",
      ]),
    );
    expect(app.assembly.commands).not.toContain("timeline.toggleExpanded");
    expect(app.assembly.commands).not.toContain("timeline.toggleControlKeyframes");
    expect(app.assembly.commands).not.toContain("timeline.moveKeyframe");
  });

  it("uses schema timeline default duration as the animation loop duration", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        timeline: {
          defaultDurationSeconds: 12,
          mode: "playback",
        },
      },
    });
    const clamped = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        timeline: {
          defaultDurationSeconds: 120,
          mode: "playback",
        },
      },
    });

    expect(app.panels.timeline?.defaultDurationSeconds).toBe(12);
    expect(clamped.panels.timeline?.defaultDurationSeconds).toBe(60);
  });

  it("only publishes commands supported by the runtime command bus", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
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
        layers: true,
        timeline: true,
      },
    });
    const supportedCommands = new Set<string>(toolcraftRuntimeCommandTypes);

    expect(app.assembly.commands.filter((command) => !supportedCommands.has(command))).toEqual([]);
  });

  it("publishes reserved targets for AI assembly boundaries", () => {
    expect(toolcraftRuntimeOwnedTargets).toEqual([
      "canvas.aspectRatio",
      "canvas.renderScale",
      "canvas.size.width",
      "canvas.size.height",
      "runtime.settingsTransfer",
      "panels.timeline.extended",
      "panels.timeline.visible",
    ]);
    expect(toolcraftReservedTargets).toEqual([
      "canvas.aspectRatio",
      "canvas.renderScale",
      "canvas.size.width",
      "canvas.size.height",
      "runtime.settingsTransfer",
      "panels.timeline.extended",
      "panels.timeline.visible",
      "selectedLayer.opacity",
      "selectedLayer.visible",
    ]);
    expect(getToolcraftCanvasSizeTargetDimension("canvas.size.width")).toBe("width");
    expect(getToolcraftCanvasSizeTargetDimension("canvas.size.height")).toBe("height");
    expect(getToolcraftCanvasSizeTargetDimension("generation.prompt")).toBeNull();
    expect(isToolcraftRuntimeOwnedTarget("canvas.aspectRatio")).toBe(true);
    expect(isToolcraftRuntimeOwnedTarget("runtime.settingsTransfer")).toBe(true);
    expect(isToolcraftRuntimeOwnedTarget("panels.timeline.extended")).toBe(true);
    expect(isToolcraftRuntimeOwnedTarget("panels.timeline.visible")).toBe(true);
    expect(isToolcraftReservedTarget("selectedLayer.opacity")).toBe(true);
    expect(isToolcraftReservedTarget("generation.prompt")).toBe(false);
  });

  it("removes disabled toolbar capabilities from the assembly contract", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
      toolbar: {
        history: false,
        radar: false,
        theme: false,
        zoom: false,
      },
    });

    expect(app.assembly.components).toEqual(["canvas"]);
    expect(app.assembly.commands).not.toContain("history.undo");
    expect(app.assembly.commands).not.toContain("canvas.center");
    expect(app.assembly.commands).not.toContain("canvas.zoomIn");
    expect(app.assembly.surfaces.panels.toolbar.enabled).toBe(false);
  });

  it("does not enable the layers panel implicitly for single-layer or upload apps", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, upload: true },
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

    expect(app.panels.layers).toBeUndefined();
    expect(app.assembly.components).not.toContain("layersPanel");
    expect(app.assembly.capabilities).not.toContain("layers.panel");
    expect(app.assembly.commands).not.toContain("layers.reorder");
  });

  it("defaults explicit canvas size to editable output", () => {
    const size = { width: 1365, height: 768, unit: "px" } as const;

    const app = defineToolcraft({
      canvas: { enabled: true, size },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });

    expect(app.canvas.size).toBe(size);
    expect(app.canvas.size).toEqual({ width: 1365, height: 768, unit: "px" });
    expect(app.canvas.sizeSource).toBe("app");
    expect(app.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(app.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(app.panels.controls?.sections[0]?.controls.canvasAspectRatio).toMatchObject({
      defaultValue: {
        height: 256,
        mode: "custom",
        value: "455:256",
        width: 455,
      },
      label: "Aspect ratio",
      performanceRole: "workload",
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(app.panels.controls?.sections[0]?.controls.canvasWidth).toMatchObject({
      defaultValue: 1365,
      performanceRole: "workload",
      target: "canvas.size.width",
    });
    expect(app.panels.controls?.sections[0]?.controls.canvasHeight).toMatchObject({
      defaultValue: 768,
      performanceRole: "workload",
      target: "canvas.size.height",
    });
  });

  it("preserves app-chosen canvas widths below the app shell minimum", () => {
    const app = defineToolcraft({
      canvas: { enabled: true, size: { width: 640, height: 768, unit: "px" } },
      panels: {},
    });

    expect(app.canvas.size).toEqual({ width: 640, height: 768, unit: "px" });
    expect(app.canvas.sizeSource).toBe("app");
  });

  it("prepends canvas size controls to controls panels", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 900, unit: "px", width: 1440 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Generation",
            },
          ],
          title: "Controls",
        },
      },
    });

    const [canvasSection, generationSection] = app.panels.controls?.sections ?? [];

    expect(canvasSection?.title).toBe("Setup");
    expect(canvasSection?.controls.canvasAspectRatio).toMatchObject({
      defaultValue: {
        height: 5,
        mode: "custom",
        value: "8:5",
        width: 8,
      },
      label: "Aspect ratio",
      performanceRole: "workload",
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(canvasSection?.controls.canvasWidth).toMatchObject({
      defaultValue: 1440,
      label: "Canvas width",
      performanceRole: "workload",
      target: "canvas.size.width",
      type: "text",
    });
    expect(canvasSection?.controls.canvasHeight).toMatchObject({
      defaultValue: 900,
      label: "Canvas height",
      performanceRole: "workload",
      target: "canvas.size.height",
      type: "text",
    });
    expect(canvasSection?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["canvasWidth", "canvasHeight"],
        layout: "inline",
      },
    ]);
    expect(generationSection?.title).toBe("Generation");
  });

  it("appends raster render scale to the technical setup controls when enabled", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
        size: { height: 900, unit: "px", width: 1440 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });

    const setupSection = app.panels.controls?.sections[0];

    expect(app.canvas.renderScale).toEqual({
      defaultValue: 2,
      enabled: true,
      max: 2,
      min: 1,
      step: 0.25,
    });
    expect(app.assembly.capabilities).toContain("canvas.renderScale");
    expect(Object.keys(setupSection?.controls ?? {})).toEqual([
      "settingsTransfer",
      "canvasAspectRatio",
      "canvasWidth",
      "canvasHeight",
      "canvasRenderScale",
    ]);
    expect(setupSection?.controls.canvasRenderScale).toMatchObject({
      defaultValue: 2,
      label: "Resolution scale",
      markerCount: 5,
      max: 2,
      min: 1,
      step: 0.25,
      target: "canvas.renderScale",
      type: "slider",
      variant: "discrete",
    });
  });

  it("appends timeline visibility to the bottom of setup controls when timeline is enabled", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
        size: { height: 900, unit: "px", width: 1440 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
        timeline: { mode: "playback" },
      },
    });

    const setupSection = app.panels.controls?.sections[0];

    expect(Object.keys(setupSection?.controls ?? {})).toEqual([
      "settingsTransfer",
      "canvasAspectRatio",
      "canvasWidth",
      "canvasHeight",
      "canvasRenderScale",
      "timelineExtended",
    ]);
    expect(setupSection?.controls.timelineExtended).toMatchObject({
      defaultValue: false,
      description:
        "Shows the extended runtime timeline with scrubber, duration, loop, and keyframe controls; compact mode keeps only Play visible.",
      label: "Timeline",
      target: "panels.timeline.extended",
      type: "switch",
    });
  });

  it("does not let app-authored runtime targets suppress mandatory setup controls", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
        size: { height: 1080, unit: "px", width: 1920 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                manualWidth: {
                  defaultValue: 1280,
                  label: "Width",
                  target: "canvas.size.width",
                  type: "text",
                },
                manualRenderScale: {
                  defaultValue: 1,
                  label: "Scale",
                  max: 2,
                  min: 1,
                  target: "canvas.renderScale",
                  type: "slider",
                },
                manualTimeline: {
                  defaultValue: true,
                  label: "Timeline",
                  target: "panels.timeline.extended",
                  type: "switch",
                },
              },
              title: "Manual Runtime Duplicates",
            },
          ],
          title: "Controls",
        },
        timeline: { mode: "playback" },
      },
    });

    const [setupSection, duplicateSection] = app.panels.controls?.sections ?? [];

    expect(Object.keys(setupSection?.controls ?? {})).toEqual([
      "settingsTransfer",
      "canvasAspectRatio",
      "canvasWidth",
      "canvasHeight",
      "canvasRenderScale",
      "timelineExtended",
    ]);
    expect(duplicateSection?.controls.manualWidth?.target).toBe("canvas.size.width");
    expect(duplicateSection?.controls.manualRenderScale?.target).toBe("canvas.renderScale");
    expect(duplicateSection?.controls.manualTimeline?.target).toBe(
      "panels.timeline.extended",
    );
  });

  it("can prepend render scale without editable output sizing", () => {
    const app = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: { defaultValue: 1.5 },
        size: { height: 900, unit: "px", width: 1440 },
        sizing: { mode: "fixed-output" },
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });

    expect(app.panels.controls?.sections[0]).toMatchObject({
      controls: {
        canvasRenderScale: {
          defaultValue: 1.5,
          target: "canvas.renderScale",
          type: "slider",
        },
      },
      title: "Setup",
    });
  });

  it("does not prepend canvas size controls for intrinsic media or explicitly fixed output", () => {
    const intrinsicApp = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
        upload: true,
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Generation",
            },
          ],
          title: "Controls",
        },
      },
    });
    const fixedApp = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 900, unit: "px", width: 1440 },
        sizing: { mode: "fixed-output" },
      },
      panels: intrinsicApp.panels,
    });

    expect(intrinsicApp.canvas.sizing).toEqual({ mode: "intrinsic-media" });
    expect(fixedApp.canvas.sizing).toEqual({ mode: "fixed-output" });
    expect(intrinsicApp.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(fixedApp.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(intrinsicApp.panels.controls?.sections[1]?.title).toBe("Generation");
    expect(fixedApp.panels.controls?.sections.at(-1)?.title).toBe("Generation");
    expect(intrinsicApp.panels.controls?.sections[0]?.controls.canvasWidth).toBeUndefined();
    expect(fixedApp.panels.controls?.sections[0]?.controls.canvasWidth).toBeUndefined();
    expect(intrinsicApp.panels.controls?.sections[0]?.controls.settingsTransfer).toBeTruthy();
    expect(fixedApp.panels.controls?.sections[0]?.controls.settingsTransfer).toBeTruthy();
  });

  it("adds runtime layout groups only for compact numeric text pairs", () => {
    const app = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                format: {
                  defaultValue: "png",
                  label: "Format",
                  options: [
                    { label: "PNG", value: "png" },
                    { label: "JPEG", value: "jpeg" },
                  ],
                  target: "export.format",
                  type: "select",
                },
                quality: {
                  defaultValue: "balanced",
                  label: "Quality",
                  options: [
                    { label: "Balanced", value: "balanced" },
                    { label: "High", value: "high" },
                  ],
                  target: "export.quality",
                  type: "select",
                },
                width: {
                  defaultValue: "1024",
                  label: "Width",
                  target: "export.width",
                  type: "text",
                },
                height: {
                  defaultValue: "768",
                  label: "Height",
                  target: "export.height",
                  type: "text",
                },
                prompt: {
                  defaultValue: "Describe the generated asset",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
                seed: {
                  defaultValue: "42",
                  label: "Seed",
                  target: "generation.seed",
                  type: "text",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    const [outputSection] = getProductSections(app);

    expect(outputSection?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["width", "height"],
        layout: "inline",
      },
    ]);
  });

  it("adds runtime layout groups for compact numeric and color opacity pairs", () => {
    const app = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                maskSize: {
                  defaultValue: "180",
                  label: "Mask size",
                  target: "mask.size",
                  type: "text",
                },
                maskColor: {
                  defaultValue: { hex: "#0EA5E9", opacity: 82 },
                  label: "Color",
                  target: "mask.color",
                  type: "colorOpacity",
                },
              },
              title: "Mask",
            },
          ],
          title: "Controls",
        },
      },
    });

    const [maskSection] = getProductSections(app);

    expect(maskSection?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["maskSize", "maskColor"],
        layout: "inline",
      },
    ]);
  });

  it("does not auto-pair mixed compact fields without visible labels", () => {
    const app = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                maskSize: {
                  defaultValue: "180",
                  label: "Mask size",
                  target: "mask.size",
                  type: "text",
                },
                maskColor: {
                  defaultValue: { hex: "#0EA5E9", opacity: 82 },
                  target: "mask.color",
                  type: "colorOpacity",
                },
              },
              title: "Mask",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(app.panels.controls?.sections[0]?.layoutGroups).toBeUndefined();
  });

  it("preserves explicit inline select combinations without auto-pairing ordinary selects", () => {
    const app = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                colorSpace: {
                  defaultValue: "srgb",
                  label: "Color space",
                  options: [
                    { label: "sRGB", value: "srgb" },
                    { label: "Display P3", value: "display-p3" },
                  ],
                  target: "export.colorSpace",
                  type: "select",
                },
                bitDepth: {
                  defaultValue: "8",
                  label: "Bit depth",
                  options: [
                    { label: "8-bit", value: "8" },
                    { label: "16-bit", value: "16" },
                  ],
                  target: "export.bitDepth",
                  type: "select",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["colorSpace", "bitDepth"],
                  layout: "inline",
                },
              ],
              title: "Format Pair",
            },
            {
              controls: {
                format: {
                  defaultValue: "png",
                  label: "Format",
                  options: [
                    { label: "PNG", value: "png" },
                    { label: "JPEG", value: "jpeg" },
                  ],
                  target: "export.format",
                  type: "select",
                },
                quality: {
                  defaultValue: "balanced",
                  label: "Quality",
                  options: [
                    { label: "Balanced", value: "balanced" },
                    { label: "High", value: "high" },
                  ],
                  target: "export.quality",
                  type: "select",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    const [formatPairSection, outputSection] = getProductSections(app);

    expect(formatPairSection?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["colorSpace", "bitDepth"],
        layout: "inline",
      },
    ]);
    expect(outputSection?.layoutGroups).toBeUndefined();
  });

  it("splits standalone controls out of grouped control sections", () => {
    const app = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  target: "selectedLayer.opacity",
                  type: "slider",
                },
                threshold: {
                  defaultValue: 50,
                  label: "Threshold",
                  target: "selectedLayer.threshold",
                  type: "slider",
                },
                anchor: {
                  defaultValue: "center",
                  label: "Anchor",
                  target: "selectedLayer.anchor",
                  type: "anchorGrid",
                },
              },
              title: "Basic",
            },
          ],
          title: "Controls",
        },
      },
    });

    const [basicSection, anchorSection] = getProductSections(app);

    expect(Object.keys(basicSection?.controls ?? {})).toEqual(["opacity", "threshold"]);
    expect(basicSection?.title).toBe("Basic");
    expect(anchorSection?.layout).toBe("standalone");
    expect(anchorSection?.title).toBe("Anchor");
    expect(Object.keys(anchorSection?.controls ?? {})).toEqual(["anchor"]);
  });

  it("forces disabled canvas to non-draggable while preserving explicit toolbar choices", () => {
    const app = defineToolcraft({
      canvas: { draggable: true, enabled: false },
      panels: {},
      toolbar: { history: true },
    });

    expect(app.canvas.draggable).toBe(false);
    expect(app.toolbar).toEqual({ history: true, radar: false, theme: true, zoom: false });
  });

  it("adds an implicit title while preserving standalone section layout intent", () => {
    const sections = [
      {
        controls: {
          palette: {
            target: "style.palette",
            type: "palette",
          },
        },
        layout: "standalone",
      },
    ] as const;

    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections,
          title: "Controls",
        },
      },
    });

    expect(getProductSections(app)[0]?.layout).toBe("standalone");
    expect(getProductSections(app)[0]?.title).toBe("Palette");
  });

  it("adds semantic implicit titles to standalone color sections", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fill: {
                  defaultValue: { hex: "#C1FF00" },
                  label: "Fill",
                  target: "style.fill",
                  type: "color",
                },
                stroke: {
                  defaultValue: { hex: "#FF6A00" },
                  label: "Stroke",
                  target: "style.stroke",
                  type: "color",
                },
              },
              layout: "standalone",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(getProductSections(app)[0]?.layout).toBe("standalone");
    expect(getProductSections(app)[0]?.title).toBe("Fill & Stroke");

    const inferredLayoutApp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fill: {
                  defaultValue: { hex: "#C1FF00" },
                  label: "Fill",
                  target: "style.fill",
                  type: "color",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(getProductSections(inferredLayoutApp)[0]?.title).toBe("Fill");
  });

  it("replaces generic color section titles with a semantic fallback", () => {
    const genericColorApp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                color: {
                  defaultValue: { hex: "#C1FF00" },
                  label: "Color",
                  target: "style.color",
                  type: "color",
                },
              },
              layout: "standalone",
            },
          ],
          title: "Controls",
        },
      },
    });

    const genericColorsApp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                color: {
                  defaultValue: { hex: "#C1FF00" },
                  label: "Color",
                  target: "style.color",
                  type: "color",
                },
                colors: {
                  defaultValue: { hex: "#FF6A00" },
                  label: "Colors",
                  target: "style.colors",
                  type: "color",
                },
              },
              layout: "standalone",
            },
          ],
          title: "Controls",
        },
      },
    });
    const explicitGenericTitleApp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                accent: {
                  defaultValue: { hex: "#C1FF00" },
                  label: "Accent",
                  target: "style.accent",
                  type: "color",
                },
              },
              layout: "standalone",
              title: "Colors",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(getProductSections(genericColorApp)[0]?.title).toBe("Appearance");
    expect(getProductSections(genericColorsApp)[0]?.title).toBe("Appearance");
    expect(getProductSections(explicitGenericTitleApp)[0]?.title).toBe("Appearance");
  });

  it("keeps color controls inside semantic mixed sections", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                connections: {
                  defaultValue: 10,
                  label: "Connections",
                  target: "animation.square1.connections",
                  type: "text",
                },
                hoverRadius: {
                  defaultValue: 200,
                  label: "Hover radius",
                  max: 500,
                  min: 50,
                  target: "animation.square1.hoverRadius",
                  type: "slider",
                  unit: "px",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  target: "animation.square1.color",
                  type: "color",
                },
              },
              title: "Square 1 (Right)",
            },
          ],
          title: "Controls",
        },
      },
    });

    const productSections = getProductSections(app);

    expect(productSections).toHaveLength(1);
    expect(productSections[0]?.title).toBe("Square 1 (Right)");
    expect(Object.keys(productSections[0]?.controls ?? {})).toEqual([
      "connections",
      "hoverRadius",
      "color",
    ]);
  });

  it("keeps mode-gated standalone controls inside their semantic section", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                sourceMode: {
                  defaultValue: "preset",
                  label: "Source",
                  options: [
                    { label: "Preset", value: "preset" },
                    { label: "Image", value: "image" },
                  ],
                  target: "source.mode",
                  type: "segmented",
                },
                sourceUpload: {
                  accept: "image/*",
                  assetKind: "image",
                  defaultValue: null,
                  label: "Image",
                  target: "source.upload",
                  type: "fileDrop",
                  visibleWhen: { equals: "image", target: "source.mode" },
                },
              },
              title: "Source",
            },
          ],
          title: "Controls",
        },
      },
    });

    const productSections = getProductSections(app);

    expect(productSections).toHaveLength(1);
    expect(productSections[0]?.title).toBe("Source");
    expect(productSections[0]?.layout).toBeUndefined();
    expect(Object.keys(productSections[0]?.controls ?? {})).toEqual([
      "sourceMode",
      "sourceUpload",
    ]);
  });

  it("preserves controls panel action sections and render metadata", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              actionGroup: "secondary",
              controls: {
                footer: {
                  actions: [
                    {
                      command: "controls.reset",
                      label: "Reset",
                      value: "reset",
                      variant: "outline",
                    },
                    {
                      command: "controls.apply",
                      label: "Apply",
                      value: "apply",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
              },
              layout: "standalone",
            },
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  markerCount: 11,
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "selectedLayer.opacity",
                  type: "slider",
                  unit: "%",
                  variant: "discrete",
                },
              },
              title: "Sliders",
            },
          ],
          title: "Controls",
        },
      },
    });

    const [slidersSection, actionsSection] = getProductSections(app);

    expect(slidersSection?.controls.opacity?.markerCount).toBe(101);
    expect(slidersSection?.controls.opacity?.variant).toBe("discrete");
    expect(actionsSection?.actionGroup).toBe("secondary");
    expect(actionsSection?.controls.footer?.actions?.[0]).toMatchObject({
      command: "controls.reset",
      value: "reset",
    });
  });

  it("keeps stepped continuous sliders plain and normalizes explicit discrete markers", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 118,
                  label: "Reveal speed",
                  markerCount: 6,
                  max: 150,
                  min: 0,
                  step: 1,
                  target: "ascii.speed",
                  type: "slider",
                },
                toneSteps: {
                  defaultValue: 2,
                  label: "Tone steps",
                  markerCount: 4,
                  max: 4,
                  min: 0,
                  step: 1,
                  target: "ascii.toneSteps",
                  type: "slider",
                  variant: "discrete",
                },
                duration: {
                  defaultValue: 0.6,
                  label: "Flip duration",
                  markerCount: 6,
                  max: 5,
                  min: 0,
                  step: 0.1,
                  target: "ascii.flipDurationSec",
                  type: "slider",
                  variant: "continuous",
                },
                range: {
                  defaultValue: [2, 8],
                  label: "Range",
                  markerCount: 3,
                  max: 10,
                  min: 0,
                  step: 0.5,
                  target: "ascii.range",
                  type: "rangeSlider",
                },
              },
              title: "Sliders",
            },
          ],
          title: "Controls",
        },
      },
    });

    const controls = getProductSections(app)[0]?.controls;

    expect(controls?.speed?.variant).toBeUndefined();
    expect(controls?.speed?.markerCount).toBe(6);
    expect(controls?.toneSteps?.variant).toBe("discrete");
    expect(controls?.toneSteps?.markerCount).toBe(5);
    expect(controls?.duration?.variant).toBe("continuous");
    expect(controls?.duration?.markerCount).toBe(6);
    expect(controls?.range?.variant).toBeUndefined();
    expect(controls?.range?.markerCount).toBe(3);
  });

  it("hoists panel action controls into the sticky footer even without actionGroup", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                footer: {
                  actions: [
                    {
                      command: "controls.reset",
                      label: "Reset",
                      value: "reset",
                      variant: "outline",
                    },
                    {
                      command: "controls.apply",
                      label: "Apply",
                      value: "apply",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
                prompt: {
                  defaultValue: "Describe the output",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
      },
    });

    const sections = app.panels.controls?.sections ?? [];
    const promptSection = sections.find((section) => section.controls.prompt);
    const footerSection = sections.at(-1);

    expect(promptSection?.title).toBe("Prompt");
    expect(promptSection?.controls.footer).toBeUndefined();
    expect(footerSection?.actionGroup).toBe("secondary");
    expect(footerSection?.layout).toBe("standalone");
    expect(footerSection?.title).toBe("Export");
    expect(footerSection?.controls.footer?.type).toBe("panelActions");
  });

  it("merges split footer action sections into one compact footer row", () => {
    const app = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              actionGroup: "primary",
              controls: {
                export: {
                  actions: [
                    {
                      label: "Export PNG",
                      value: "export",
                      variant: "default",
                    },
                  ],
                  target: "panel.export",
                  type: "panelActions",
                },
              },
            },
            {
              actionGroup: "secondary",
              controls: {
                copy: {
                  actions: [
                    {
                      label: "Copy PNG",
                      value: "copy",
                      variant: "outline",
                    },
                  ],
                  target: "panel.copy",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    const sections = app.panels.controls?.sections ?? [];
    const footerSections = sections.filter((section) => section.actionGroup);
    const footerActions = footerSections[0]?.controls.footer?.actions ?? [];

    expect(footerSections).toHaveLength(1);
    expect(footerActions).toHaveLength(2);
    expect(footerActions[0]).toMatchObject({
      value: "copy",
      variant: "outline",
    });
    expect(footerActions[1]).toMatchObject({
      value: "export",
      variant: "default",
    });
  });
});
