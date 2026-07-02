import { act, cleanup, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileDrop, Panel } from "@repo/ui";
import {
  DEFAULT_COLOR_FORMAT_MODE,
  getColorSurfaceModel,
  getColorSurfaceSliderConfig,
  getColorSurfaceStyle,
  getColorSurfaceThumbPosition,
  getSurfaceHsvColor,
  StyleGuideColorPicker,
} from "@repo/ui/controls";
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { ResolvedToolcraftAppSchema } from "../schema/types";
import type { ToolcraftInitialState } from "../state/types";
import { CanvasShell } from "./canvas-shell";
import { ControlsPanel } from "./controls-panel";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraft } from "./use-toolcraft";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
    writable: true,
  });

  window.requestAnimationFrame ??= ((callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0)) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame ??= ((handle: number) =>
    window.clearTimeout(handle)) as typeof window.cancelAnimationFrame;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function createSchema() {
  return defineToolcraft({
    canvas: { enabled: true, size: { height: 180, unit: "px", width: 320 } },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              prompt: {
                defaultValue: "Initial prompt",
                description: "Describe the generated result.",
                label: "Prompt",
                target: "generation.prompt",
                type: "text",
              },
              opacity: {
                defaultValue: 75,
                label: "Opacity",
                max: 100,
                min: 0,
                target: "selectedLayer.opacity",
                type: "slider",
                unit: "%",
              },
              staticOpacity: {
                defaultValue: 40,
                keyframeable: false,
                label: "Static opacity",
                max: 100,
                min: 0,
                target: "style.staticOpacity",
                type: "slider",
                unit: "%",
              },
              blend: {
                defaultValue: "normal",
                label: "Blend",
                options: [
                  { label: "Normal", value: "normal" },
                  { label: "Screen", value: "screen" },
                ],
                target: "style.blend",
                type: "segmented",
              },
              enabled: {
                defaultValue: true,
                label: "Enabled",
                target: "generation.enabled",
                type: "switch",
              },
            },
            title: "Basic",
          },
          {
            controls: {
              anchor: {
                defaultValue: "center",
                label: "Anchor",
                target: "generation.anchor",
                type: "anchorGrid",
              },
            },
            layout: "standalone",
          },
          {
            controls: {
              image: {
                defaultValue: "image-1",
                items: [
                  {
                    alt: "Image 1",
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E",
                    value: "image-1",
                  },
                  {
                    alt: "Image 2",
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E",
                    value: "image-2",
                  },
                ],
                label: "Image",
                target: "input.image",
                type: "imagePicker",
              },
            },
            layout: "standalone",
          },
          {
            controls: {
              outputMix: {
                label: "Output Mix",
                target: "style.outputMix",
                type: "channelMixer",
              },
            },
            layout: "standalone",
            title: "Output Mix",
          },
          {
            controls: {
              curves: {
                label: false,
                target: "style.curves",
                type: "curves",
              },
            },
            layout: "standalone",
          },
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
        ],
        title: "Generation Controls",
      },
      timeline: true,
    },
  });
}

function StateProbe() {
  const { dispatch, state } = useToolcraft();

  return (
    <>
      <button
        onClick={() => dispatch({ expanded: true, type: "timeline.setExpanded" })}
        type="button"
      >
        Expand timeline
      </button>
      <span data-testid="prompt-value">{String(state.values["generation.prompt"])}</span>
      <span data-testid="enabled-value">{String(state.values["generation.enabled"])}</span>
      <span data-testid="image-value">{String(state.values["input.image"])}</span>
      <span data-testid="font-value">
        {JSON.stringify(state.values["typography.font"])}
      </span>
      <span data-testid="text-color-value">
        {JSON.stringify(state.values["text.color"])}
      </span>
      <span data-testid="gradient-value">
        {JSON.stringify(state.values["style.gradient"])}
      </span>
      <span data-testid="canvas-size">
        {state.canvas.size.width},{state.canvas.size.height}
      </span>
      <span data-testid="media-count">{state.mediaAssets.length}</span>
      <span data-testid="media-ids">
        {state.mediaAssets.map((asset) => asset.id).join(",")}
      </span>
      <span data-testid="media-sizes">
        {state.mediaAssets
          .map((asset) =>
            asset.size ? `${asset.size.width}x${asset.size.height}` : "none",
          )
          .join(",")}
      </span>
      <span data-testid="media-transforms">
        {JSON.stringify(state.mediaAssets.map((asset) => asset.transform ?? null))}
      </span>
      <span data-testid="timeline-expanded">{String(state.timeline.expanded)}</span>
      <span data-testid="timeline-panel-extended">{String(state.panels.timeline.extended)}</span>
      <span data-testid="timeline-panel-hidden">{String(state.panels.timeline.hidden)}</span>
      <span data-testid="timeline-keyframes">
        {JSON.stringify(state.timeline.keyframeGroups)}
      </span>
      <span data-testid="values-json">{JSON.stringify(state.values)}</span>
    </>
  );
}

function renderControlsPanel(
  props: Partial<React.ComponentProps<typeof ControlsPanel>> = {},
  initialState?: ToolcraftInitialState,
) {
  return renderControlsPanelWithSchema(createSchema(), props, initialState);
}

function renderControlsPanelWithSchema(
  schema: ResolvedToolcraftAppSchema,
  props: Partial<React.ComponentProps<typeof ControlsPanel>> = {},
  initialState?: ToolcraftInitialState,
) {
  return render(
    <ToolcraftRoot initialState={initialState} schema={schema}>
      <ControlsPanel framed={false} {...props} />
      <StateProbe />
    </ToolcraftRoot>,
  );
}

describe("ControlsPanel", () => {
  it("renders schema sections and standalone controls through the panel visual shell", () => {
    const { container } = renderControlsPanel();

    expect(screen.getByText("Generation Controls")).toBeTruthy();
    expect(screen.getByText("Basic")).toBeTruthy();
    expect(screen.getByText("Prompt")).toBeTruthy();
    expect(screen.getByText("Enabled")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Center" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Image 1" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Prompt help" })
        .closest("[data-control-field-label]"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enabled help" })).toBeNull();
    expect(
      container.querySelector('[data-toolcraft-section-action-group="secondary"]'),
    ).toBeTruthy();
  });

  it("renders compact switch pairs inline", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glow: {
                  defaultValue: true,
                  label: "Glow",
                  target: "style.glow",
                  type: "switch",
                },
                loop: {
                  defaultValue: false,
                  label: "Loop",
                  target: "animation.loop",
                  type: "switch",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["glow", "loop"],
                  layout: "inline",
                },
              ],
              title: "Style",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(screen.getByText("Glow")).toBeTruthy();
    expect(screen.getByText("Loop")).toBeTruthy();
    expect(
      container.querySelector('[data-control-layout="inline"][data-control-layout-columns="2"]'),
    ).toBeTruthy();
  });

  it("automatically renders adjacent short switches for one entity inline", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                snapX: {
                  defaultValue: true,
                  label: "Snap X",
                  target: "icon.snapX",
                  type: "switch",
                },
                snapY: {
                  defaultValue: true,
                  label: "Snap Y",
                  target: "icon.snapY",
                  type: "switch",
                },
              },
              title: "Icon",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const inlineGroup = container.querySelector(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );

    expect(screen.getByText("Snap X")).toBeTruthy();
    expect(screen.getByText("Snap Y")).toBeTruthy();
    expect(inlineGroup).toBeTruthy();
    expect(inlineGroup?.textContent).toContain("Snap X");
    expect(inlineGroup?.textContent).toContain("Snap Y");
  });

  it("commits palette family and shade changes to runtime state immediately", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                inkPalette: {
                  defaultValue: { family: "Slate", shade: "900" },
                  label: "Palette",
                  target: "ink.palette",
                  type: "palette",
                },
              },
              title: "Ink",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    fireEvent.click(screen.getByRole("button", { name: "Primary family Red" }));
    let values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["ink.palette"]).toEqual({ family: "Red", shade: "900" });

    fireEvent.click(screen.getByRole("button", { name: "Primary shade 500" }));
    values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["ink.palette"]).toEqual({ family: "Red", shade: "500" });
  });

  it("renders local action buttons as a two-column grid below their label", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                masks: {
                  actions: [
                    { label: "Rect", value: "mask.add.rectangle" },
                    { label: "Circle", value: "mask.add.circle" },
                    { label: "Tri", value: "mask.add.triangle" },
                    { label: "Delete", value: "mask.delete" },
                  ],
                  defaultValue: [],
                  label: "Masks",
                  target: "composition.masks",
                  type: "actions",
                },
              },
              title: "Composition",
            },
          ],
          title: "Controls",
        },
      },
    });
    const { container } = renderControlsPanelWithSchema(schema);
    const actionField = container.querySelector('[data-slot="actions-control"]');
    const actionButtons = container.querySelector(
      '[data-slot="actions-control-buttons"]',
    );

    expect(actionField?.getAttribute("data-orientation")).toBe("vertical");
    expect(actionField?.className).not.toContain("justify-between");
    expect(actionButtons?.className).toContain("grid");
    expect(actionButtons?.className).toContain("w-full");
    expect(actionButtons?.className).toContain("grid-cols-2");
    expect(actionButtons?.className).not.toContain("justify-start");
    expect(actionButtons?.className).not.toContain("ml-auto");
    for (const label of ["Rect", "Circle", "Tri", "Delete"]) {
      expect(screen.getByRole("button", { name: label }).className).toContain(
        "w-full",
      );
    }
  });

  it("keeps a single local action button at half row width", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                paletteActions: {
                  actions: [{ label: "Randomize", value: "palette.randomize" }],
                  defaultValue: null,
                  label: "Actions",
                  target: "palette.actions",
                  type: "actions",
                },
              },
              title: "Palette",
            },
          ],
          title: "Controls",
        },
      },
    });
    const { container } = renderControlsPanelWithSchema(schema);
    const actionButtons = container.querySelector<HTMLElement>(
      '[data-slot="actions-control-buttons"]',
    );
    const button = screen.getByRole("button", { name: "Randomize" });

    expect(actionButtons?.getAttribute("data-actions-count")).toBe("1");
    expect(actionButtons?.className).toContain("w-1/2");
    expect(actionButtons?.className).toContain("grid-cols-1");
    expect(button.className).toContain("w-full");
  });

  it("renders the managed background toggle plus unlabeled color row as equal-width inline columns", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                includeBackground: {
                  defaultValue: true,
                  description:
                    "Controls PNG background transparency while preview and video keep the background.",
                  label: "Include",
                  target: "export.includeBackground",
                  type: "switch",
                },
                background: {
                  defaultValue: { hex: "#0F0F0F" },
                  label: false,
                  target: "appearance.background",
                  type: "color",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["includeBackground", "background"],
                  layout: "inline",
                },
              ],
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const toggleParameterGroup = container.querySelector(
      '[data-control-layout="inline"][data-control-layout-kind="toggleParameter"]',
    );

    expect(screen.getAllByText("Background")).toHaveLength(1);
    expect(screen.getByText("Include")).toBeTruthy();
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(toggleParameterGroup).toBeTruthy();
    expect(toggleParameterGroup?.className).toContain("gap-x-2.5");
    expect(toggleParameterGroup?.getAttribute("style")).toContain(
      "repeat(2, minmax(0, 1fr))",
    );
  });

  it("suppresses obvious help icons in sequential color sections", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                color1: {
                  defaultValue: { hex: "#DFFF1A" },
                  description: "Sets the first bead color.",
                  label: "Color 1",
                  target: "palette.accent1",
                  type: "color",
                },
                color2: {
                  defaultValue: { hex: "#8CFF3A" },
                  description: "Sets the second bead color.",
                  label: "Color 2",
                  target: "palette.accent2",
                  type: "color",
                },
                color3: {
                  defaultValue: { hex: "#F4FF5A" },
                  description: "Sets the third bead color.",
                  label: "Color 3",
                  target: "palette.accent3",
                  type: "color",
                },
                color4: {
                  defaultValue: { hex: "#B8FF2E" },
                  description: "Sets the fourth bead color.",
                  label: "Color 4",
                  target: "palette.accent4",
                  type: "color",
                },
                color5: {
                  defaultValue: { hex: "#ECFF68" },
                  description: "Sets the fifth bead color.",
                  label: "Color 5",
                  target: "palette.accent5",
                  type: "color",
                },
                colorSpread: {
                  defaultValue: 34,
                  description:
                    "Controls how often beads use colors 2-5 instead of Color 1.",
                  label: "Spread",
                  max: 100,
                  min: 0,
                  target: "palette.spread",
                  type: "slider",
                  unit: "%",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["color1", "color2"],
                  layout: "inline",
                },
                {
                  columns: 2,
                  controls: ["color3", "color4"],
                  layout: "inline",
                },
              ],
              title: "Accent Shades",
            },
            {
              controls: {
                includeBackground: {
                  defaultValue: true,
                  description:
                    "Controls PNG background transparency while preview and video keep the background.",
                  label: "Include",
                  target: "export.includeBackground",
                  type: "switch",
                },
              },
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.queryByRole("button", { name: "Color 5 help" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Spread help" })).toBeNull();
    expect(screen.getByRole("button", { name: "Include help" })).toBeTruthy();
  });

  it("renders short visible toggle plus parameter rows as equal-width toggle-parameter rows", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                loop: {
                  defaultValue: true,
                  label: "Loop",
                  target: "animation.loop",
                  type: "switch",
                },
                duration: {
                  defaultValue: "8",
                  label: "Duration",
                  target: "animation.duration",
                  type: "text",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["loop", "duration"],
                  layout: "inline",
                },
              ],
              title: "Playback",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const toggleParameterGroup = container.querySelector(
      '[data-control-layout="inline"][data-control-layout-kind="toggleParameter"]',
    );

    expect(screen.getByText("Loop")).toBeTruthy();
    expect(screen.queryByText("Duration")).toBeNull();
    expect(toggleParameterGroup).toBeTruthy();
    expect(toggleParameterGroup?.className).toContain("gap-x-2.5");
    expect(toggleParameterGroup?.getAttribute("style")).toContain(
      "repeat(2, minmax(0, 1fr))",
    );
  });

  it("keeps segmented controls full-width even when an inline row is requested", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                includeText: {
                  defaultValue: true,
                  label: "Include",
                  target: "text.enabled",
                  type: "switch",
                },
                dragTarget: {
                  defaultValue: "glass",
                  label: "Drag",
                  options: [
                    { label: "Glass", value: "glass" },
                    { label: "Text", value: "text" },
                  ],
                  target: "text.dragTarget",
                  type: "segmented",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["includeText", "dragTarget"],
                  layout: "inline",
                },
              ],
              title: "Glass Text",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(screen.getByText("Include")).toBeTruthy();
    expect(screen.getByText("Drag")).toBeTruthy();
    expect(container.querySelector('[data-control-layout="inline"]')).toBeNull();
    expect(container.querySelector('[data-slot="toggle-group"]')).toBeTruthy();
  });

  it("renders standalone select controls stacked full-width instead of compact side-label rows", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shape: {
                  defaultValue: "pill",
                  label: "Shape",
                  options: [
                    { label: "Pill", value: "pill" },
                    { label: "Circle", value: "circle" },
                  ],
                  target: "glass.shape",
                  type: "select",
                },
              },
              title: "Glass",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const trigger = screen.getByRole("combobox");
    const field = trigger.closest<HTMLElement>('[data-slot="field"]');

    expect(screen.getByText("Shape")).toBeTruthy();
    expect(trigger.textContent).toContain("Pill");
    expect(field?.dataset.orientation).toBe("vertical");
    expect(field?.className).toContain("gap-2");
    expect(trigger.closest("div")?.className).toContain("w-full");
  });

  it("renders compact select pairs inline with stacked full-width fields", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                videoFormat: {
                  defaultValue: "mp4",
                  label: "Format",
                  options: [
                    { label: "MP4", value: "mp4" },
                    { label: "WebM", value: "webm" },
                  ],
                  target: "export.video.format",
                  type: "select",
                },
                videoResolution: {
                  defaultValue: "current",
                  label: "Resolution",
                  options: [
                    { label: "Current", value: "current" },
                    { label: "4K", value: "4k" },
                  ],
                  target: "export.video.resolution",
                  type: "select",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["videoFormat", "videoResolution"],
                  layout: "inline",
                },
              ],
              title: "Video Export",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const inlineGroup = container.querySelector(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );
    const triggers = screen.getAllByRole("combobox");
    const fields = triggers.map((trigger) =>
      trigger.closest<HTMLElement>('[data-slot="field"]'),
    );

    expect(inlineGroup).toBeTruthy();
    expect(inlineGroup?.className).toContain("gap-x-2.5");
    expect(screen.getByText("Format")).toBeTruthy();
    expect(screen.getByText("Resolution")).toBeTruthy();
    expect(triggers).toHaveLength(2);
    expect(triggers[0]?.textContent).toContain("MP4");
    expect(fields.every((field) => field?.dataset.orientation === "vertical")).toBe(
      true,
    );
    expect(fields.every((field) => (field ? inlineGroup?.contains(field) : false))).toBe(
      true,
    );
  });

  it("stacks switch pairs when an inline label would truncate", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                background: {
                  defaultValue: true,
                  label: "Background",
                  target: "output.background",
                  type: "switch",
                },
                diagnosticOverlay: {
                  defaultValue: false,
                  label: "Diagnostic overlay",
                  target: "debug.diagnosticOverlay",
                  type: "switch",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["background", "diagnosticOverlay"],
                  layout: "inline",
                },
              ],
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(screen.getByText("Background")).toBeTruthy();
    expect(screen.getByText("Diagnostic overlay")).toBeTruthy();
    expect(
      container.querySelector('[data-control-layout="inline"][data-control-layout-columns="2"]'),
    ).toBeNull();
  });

  it("renders single curves without RGB channel tabs", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                easing: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  label: "Easing",
                  target: "animation.easing",
                  type: "curves",
                  variant: "single",
                },
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 2,
                  min: 0,
                  target: "animation.speed",
                  type: "slider",
                },
              },
              title: "Motion",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(screen.getByRole("img", { name: "Easing curve editor" })).toBeTruthy();
    expect(
      screen
        .getAllByText("Easing")
        .some((element) => element.closest("[data-control-field-label]")),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("img", { name: "Easing curve editor" })
        .closest("[data-control-item-compound-context]"),
    ).toBeNull();
    expect(
      container.querySelector('[data-curve-interpolation="monotone"]'),
    ).toBeTruthy();
    expect(screen.queryByText("RGB")).toBeNull();
    expect(screen.queryByText("R")).toBeNull();
    expect(screen.queryByText("G")).toBeNull();
    expect(screen.queryByText("B")).toBeNull();
  });

  it("keeps RGB curves as sectioned compound controls with channel tabs", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                curves: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      B: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      G: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      R: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  label: "Tone curves",
                  target: "tone.curves",
                  type: "curves",
                },
                intensity: {
                  defaultValue: 50,
                  label: "Intensity",
                  max: 100,
                  min: 0,
                  target: "tone.intensity",
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

    const { container } = renderControlsPanelWithSchema(schema);

    expect(screen.getByText("RGB")).toBeTruthy();
    expect(screen.getByText("R")).toBeTruthy();
    expect(
      container.querySelector('[data-control-section-divider="compound"]'),
    ).toBeTruthy();
  });

  it("passes explicit curve interpolation from schema", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                toneCurve: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 0.2, y: 0.85 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  interpolation: "smooth",
                  label: "Tone curve",
                  target: "tone.curve",
                  type: "curves",
                  variant: "single",
                },
              },
              title: "Tone",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(
      container.querySelector('[data-curve-interpolation="smooth"]'),
    ).toBeTruthy();
  });

  it("selects curve points with pointer events and deletes selected interior points", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                toneCurve: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 0.5, y: 0.5 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  label: "Tone curve",
                  target: "tone.curve",
                  type: "curves",
                  variant: "single",
                },
              },
              title: "Tone",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const point = screen.getByRole("button", { name: "Curve point 2" });

    fireEvent.pointerDown(point, { pointerId: 1 });
    fireEvent.pointerUp(point, { pointerId: 1 });

    await waitFor(() => expect(point.getAttribute("aria-pressed")).toBe("true"));

    fireEvent.keyDown(point, { key: "Delete" });

    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

      expect(values["tone.curve"].points.RGB).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]);
    });
  });

  it("renders editable text inputs and textareas with caret cursor affordance", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Short prompt",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
                instructions: {
                  defaultValue: "Long prompt instructions",
                  label: "Instructions",
                  target: "generation.instructions",
                  type: "code",
                },
              },
              title: "Text",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByDisplayValue("Short prompt").className).toContain("cursor-text");
    expect(screen.getByDisplayValue("Long prompt instructions").className).toContain(
      "cursor-text",
    );
    expect(screen.getByDisplayValue("Long prompt instructions").className).toContain(
      "max-h-[calc(12lh+12px)]",
    );
    expect(screen.getByDisplayValue("Long prompt instructions").className).toContain(
      "overflow-y-auto",
    );
  });

  it("preserves newline characters in code textarea values by default", () => {
    const initialInstructions = "First line\nSecond line";
    const editedInstructions = "Alpha\nBeta\nGamma";
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                instructions: {
                  defaultValue: initialInstructions,
                  label: "Instructions",
                  target: "generation.instructions",
                  type: "code",
                },
              },
              title: "Text",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const textarea = screen.getByLabelText("Instructions") as HTMLTextAreaElement;

    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.value).toBe(initialInstructions);

    fireEvent.change(textarea, { target: { value: editedInstructions } });

    expect(textarea.value).toBe(editedInstructions);
    expect(screen.getByTestId("values-json").textContent).toContain(
      `"generation.instructions":${JSON.stringify(editedInstructions)}`,
    );
  });

  it("applies text input values while typing", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Initial prompt",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Text",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const input = screen.getByDisplayValue("Initial prompt") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "Live prompt" } });

    expect(input.value).toBe("Live prompt");
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"generation.prompt":"Live prompt"',
    );
  });

  it("commits setting text inputs on blur or Enter", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fontSize: {
                  commitMode: "setting",
                  defaultValue: "16",
                  label: "Font size",
                  target: "typography.fontSize",
                  type: "text",
                },
              },
              title: "Typography",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const input = screen.getByDisplayValue("16") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "24" } });
    expect(input.value).toBe("24");
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"typography.fontSize":"16"',
    );

    fireEvent.blur(input);
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"typography.fontSize":"24"',
    );

    fireEvent.change(input, { target: { value: "32" } });
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"typography.fontSize":"24"',
    );

    fireEvent.keyDown(input, { code: "Enter", key: "Enter" });
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"typography.fontSize":"32"',
    );

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.blur(input);
    expect(screen.getByDisplayValue("16")).toBeTruthy();
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"typography.fontSize":"16"',
    );
  });

  it("binds image picker controls to runtime state", () => {
    renderControlsPanel();

    fireEvent.click(screen.getByRole("button", { name: "Image 2" }));

    expect(screen.getByTestId("image-value").textContent).toBe("image-2");
  });

  it("renders font picker as one compound popup control with font, spacing, and line-height state", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                font: {
                  defaultValue: {
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "uppercase",
                  },
                  label: "Font",
                  target: "typography.font",
                  type: "fontPicker",
                },
              },
              layout: "standalone",
              title: "Typography",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByText("Case")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Text case" }).textContent).toContain(
      "Uppercase",
    );
    const fontControlItem = screen
      .getByText("Weight")
      .closest("[data-control-item-compound-context]");
    expect(fontControlItem).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Select Font" }));

    const triggerValue = document.querySelector<HTMLElement>(
      '[data-slot="font-picker-trigger-value"]',
    );
    const trigger = triggerValue?.closest<HTMLElement>('[data-slot="select-trigger"]');
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute("data-variant")).toBe("default");
    expect(trigger?.getAttribute("data-size")).toBe("default");
    expect(trigger?.className).toContain("h-7");
    expect(trigger?.className).not.toContain("h-9");
    expect(triggerValue?.style.fontFamily).toContain("Inter");
    expect(triggerValue?.style.fontWeight).toBe("400");
    expect(screen.getByText("Weight")).toBeTruthy();
    const familyWeightRow = document.querySelector<HTMLElement>(
      '[data-slot="font-picker-family-weight-row"]',
    );
    expect(familyWeightRow?.className).toContain("grid-cols-2");
    expect(familyWeightRow?.className).not.toContain("max-content");
    expect(screen.getByText("Size")).toBeTruthy();
    expect((screen.getByLabelText("Font size") as HTMLInputElement).value).toBe("16");
    expect(screen.getByText("Color")).toBeTruthy();
    expect(screen.getByLabelText("Color opacity")).toBeTruthy();
    expect(screen.getByPlaceholderText("Find font")).toBeTruthy();
    expect(screen.getByText("Sans").closest("button")?.getAttribute("data-state")).toBe(
      "active",
    );
    expect(screen.getByLabelText("Letter spacing")).toBeTruthy();
    expect(screen.getByLabelText("Line height")).toBeTruthy();
    const footerLabels = document.querySelectorAll<HTMLElement>(
      '[data-slot="font-picker-footer-label"]',
    );
    expect(footerLabels).toHaveLength(0);
    const footerIcons = document.querySelectorAll<HTMLElement>(
      '[data-slot="font-picker-footer-icon"]',
    );
    expect(footerIcons).toHaveLength(2);
    expect(footerIcons[0]?.getAttribute("class")).toContain("size-4");
    expect(footerIcons[1]?.getAttribute("class")).toContain("size-4");
    const footerSliders = document.querySelectorAll<HTMLElement>(
      '[data-slot="font-picker-footer-slider"] [data-slot="slider"]',
    );
    expect(footerSliders).toHaveLength(2);
    expect(footerSliders[0]?.getAttribute("data-variant")).toBe("discrete");
    expect(footerSliders[1]?.getAttribute("data-variant")).toBe("discrete");
    expect(footerSliders[0]?.className).toContain("[&_[data-slot=slider-range]]:transition-none");
    expect(footerSliders[0]?.className).toContain("[&_[data-slot=slider-thumb]]:transition-none");
    expect(footerSliders[1]?.className).toContain("[&_[data-slot=slider-range]]:transition-none");
    expect(footerSliders[1]?.className).toContain("[&_[data-slot=slider-thumb]]:transition-none");
    expect(
      footerSliders[0]?.querySelectorAll('[data-slot="slider-marker"]'),
    ).toHaveLength(4);
    expect(
      footerSliders[1]?.querySelectorAll('[data-slot="slider-marker"]'),
    ).toHaveLength(4);
    const lineHeightMarkerOffsets = Array.from(
      footerSliders[1]?.querySelectorAll<HTMLElement>('[data-slot="slider-marker"]') ??
        [],
    ).map((marker) => Number.parseFloat(marker.style.left));
    expect(lineHeightMarkerOffsets).toHaveLength(4);
    expect(lineHeightMarkerOffsets[0]).toBeCloseTo(20);
    expect(lineHeightMarkerOffsets[1]).toBeCloseTo(40);
    expect(lineHeightMarkerOffsets[2]).toBeCloseTo(60);
    expect(lineHeightMarkerOffsets[3]).toBeCloseTo(80);

    fireEvent.click(screen.getByText("Roboto").closest("button") as HTMLButtonElement);
    fireEvent.change(screen.getByLabelText("Letter spacing"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Line height"), {
      target: { value: "5" },
    });

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("font-value").textContent ?? "{}")).toEqual({
        color: "#FFFFFF",
        fontId: "roboto",
        fontSize: 16,
        fontWeight: "400",
        letterSpacing: "wider",
        lineHeight: "loose",
        opacity: 100,
        textCase: "uppercase",
      });
    });
    expect(triggerValue?.style.fontFamily).toContain("Roboto");

    fireEvent.change(screen.getByLabelText("Line height"), {
      target: { value: "4.4" },
    });

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("font-value").textContent ?? "{}")).toEqual({
        color: "#FFFFFF",
        fontId: "roboto",
        fontSize: 16,
        fontWeight: "400",
        letterSpacing: "wider",
        lineHeight: "relaxed",
        opacity: 100,
        textCase: "uppercase",
      });
    });

    const fontSizeInput = screen.getByLabelText("Font size") as HTMLInputElement;

    fireEvent.change(fontSizeInput, {
      target: { value: "24" },
    });
    expect(JSON.parse(screen.getByTestId("font-value").textContent ?? "{}")).toEqual({
      color: "#FFFFFF",
      fontId: "roboto",
      fontSize: 16,
      fontWeight: "400",
      letterSpacing: "wider",
      lineHeight: "relaxed",
      opacity: 100,
      textCase: "uppercase",
    });

    fireEvent.blur(fontSizeInput);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("font-value").textContent ?? "{}")).toEqual({
        color: "#FFFFFF",
        fontId: "roboto",
        fontSize: 24,
        fontWeight: "400",
        letterSpacing: "wider",
        lineHeight: "relaxed",
        opacity: 100,
        textCase: "uppercase",
      });
    });

    fireEvent.change(fontSizeInput, {
      target: { value: "768" },
    });
    fireEvent.blur(fontSizeInput);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("font-value").textContent ?? "{}")).toEqual({
        color: "#FFFFFF",
        fontId: "roboto",
        fontSize: 768,
        fontWeight: "400",
        letterSpacing: "wider",
        lineHeight: "relaxed",
        opacity: 100,
        textCase: "uppercase",
      });
    });

    const colorHexInput = screen.getByLabelText("Color hex") as HTMLInputElement;
    fireEvent.change(colorHexInput, {
      target: { value: "#C1FF00" },
    });
    fireEvent.blur(colorHexInput);
    const colorOpacityInput = screen.getByLabelText("Color opacity") as HTMLInputElement;
    fireEvent.change(colorOpacityInput, {
      target: { value: "82" },
    });
    fireEvent.blur(colorOpacityInput);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("font-value").textContent ?? "{}")).toEqual({
        color: "#C1FF00",
        fontId: "roboto",
        fontSize: 768,
        fontWeight: "400",
        letterSpacing: "wider",
        lineHeight: "relaxed",
        opacity: 82,
        textCase: "uppercase",
      });
    });

    fireEvent.change(fontSizeInput, {
      target: { value: "" },
    });
    expect(fontSizeInput.value).toBe("");

    fireEvent.blur(fontSizeInput);
    expect((screen.getByLabelText("Font size") as HTMLInputElement).value).toBe("16");

    const listViewport = document.querySelector<HTMLElement>(
      '[data-slot="font-picker-list-viewport"]',
    );
    expect(listViewport).toBeTruthy();
    expect(listViewport?.className).toContain("toolcraft-scrollbar");
    expect(listViewport?.className).not.toContain("no-scrollbar");
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    Object.defineProperty(listViewport, "clientHeight", {
      configurable: true,
      value: 240,
    });
    listViewport!.scrollTop = 4800;
    fireEvent.scroll(listViewport!);
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    await waitFor(() => {
      const firstVirtualFont = document.querySelector<HTMLElement>(
        '[data-slot="font-picker-list"] button span',
      );
      expect(firstVirtualFont?.textContent).not.toBe("Inter");
    });
  });

  it("uses a square vector pad when vector is the only vector control in the panel", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                position: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Position",
                  target: "geometry.position",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(
      container
        .querySelector('[aria-label="Position X/Y pad"]')
        ?.getAttribute("data-vector-pad-shape"),
    ).toBe("square");
  });

  it("keeps compact vector pads when the panel has multiple vector controls", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                origin: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Origin",
                  target: "geometry.origin",
                  type: "vector",
                },
                target: {
                  defaultValue: { x: "0.50", y: "-0.50" },
                  label: "Target",
                  target: "geometry.target",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(
      [...container.querySelectorAll("[data-vector-pad-shape]")].map((pad) =>
        pad.getAttribute("data-vector-pad-shape"),
      ),
    ).toEqual(["compact", "compact"]);
  });

  it("passes supported vector pad variants from schema to the vector pad", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                whiteBalance: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "White Balance",
                  target: "color.whiteBalance",
                  type: "vector",
                  variant: "whiteBalance",
                },
                colorBalance: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Color Balance",
                  target: "color.balance",
                  type: "vector",
                  variant: "colorBalance",
                },
                chromaOffset: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Chroma Offset",
                  target: "effect.chromaOffset",
                  type: "vector",
                  variant: "chromaOffset",
                },
                toneBias: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Tone Bias",
                  target: "tone.bias",
                  type: "vector",
                  variant: "toneBias",
                },
                unknown: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Unknown",
                  target: "effect.unknown",
                  type: "vector",
                  variant: "unknown",
                },
              },
              title: "Color",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(
      [...container.querySelectorAll("[data-vector-pad-variant]")].map((pad) =>
        pad.getAttribute("data-vector-pad-variant"),
      ),
    ).toEqual([
      "whiteBalance",
      "colorBalance",
      "chromaOffset",
      "toneBias",
      "default",
    ]);
    expect(
      [...container.querySelectorAll("[data-vector-pad-coordinate-mode]")].map((pad) =>
        pad.getAttribute("data-vector-pad-coordinate-mode"),
      ),
    ).toEqual([
      "cartesian",
      "cartesian",
      "cartesian",
      "cartesian",
      "screen",
    ]);
  });

  it("maps default spatial vector pad movement to screen coordinates", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                position: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Position",
                  target: "geometry.position",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const pad = screen.getByRole("button", { name: "Position X/Y pad" });

    expect(pad.getAttribute("data-vector-pad-coordinate-mode")).toBe("screen");
    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => undefined,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(pad, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(pad, {
      buttons: 1,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");
    expect(values["geometry.position"]).toEqual({ x: "-1.00", y: "-1.00" });
  });

  it("resets a vector pad to its default value on double click", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                position: {
                  defaultValue: { x: "0.48", y: "-0.34" },
                  label: "Position",
                  target: "geometry.position",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const pad = screen.getByRole("button", { name: "Position X/Y pad" });

    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => undefined,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(pad, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(pad, {
      buttons: 1,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    expect(
      JSON.parse(screen.getByTestId("values-json").textContent ?? "{}")[
        "geometry.position"
      ],
    ).toEqual({ x: "-1.00", y: "-1.00" });

    fireEvent.doubleClick(pad);

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");
    expect(values["geometry.position"]).toEqual({ x: "0.48", y: "-0.34" });
    expect(screen.getByText("0.48, -0.34")).toBeTruthy();
  });

  it("locks vector pad movement to the dominant axis while shift is held", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                position: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Position",
                  target: "geometry.position",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const pad = screen.getByRole("button", { name: "Position X/Y pad" });

    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => undefined,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(pad, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(pad, {
      buttons: 1,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    });
    fireEvent.pointerMove(pad, {
      buttons: 1,
      clientX: 90,
      clientY: 70,
      pointerId: 1,
      shiftKey: true,
    });

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");
    expect(values["geometry.position"]).toEqual({ x: "0.80", y: "0.00" });
  });

  it("locks vector pad movement vertically when shift drag is y-dominant", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                position: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Position",
                  target: "geometry.position",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const pad = screen.getByRole("button", { name: "Position X/Y pad" });

    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => undefined,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(pad, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(pad, {
      buttons: 1,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    });
    fireEvent.pointerMove(pad, {
      buttons: 1,
      clientX: 70,
      clientY: 90,
      pointerId: 1,
      shiftKey: true,
    });

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");
    expect(values["geometry.position"]).toEqual({ x: "0.00", y: "0.80" });
  });

  it("renders vector pad values as compact rounded coordinates", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                center: {
                  defaultValue: {
                    x: "-0.07070312499999998",
                    y: "-0.00392795138",
                  },
                  label: "Center",
                  target: "geometry.center",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByText("-0.07, 0.00")).toBeTruthy();
    expect(screen.queryByText("-0.07070312499999998, -0.00392795138")).toBeNull();
  });

  it("prevents native text selection while dragging a vector pad", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                center: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Center",
                  target: "geometry.center",
                  type: "vector",
                },
              },
              title: "Geometry",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const pad = screen.getByRole("button", { name: "Center X/Y pad" });

    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => undefined,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(pad, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    const pointerDown = createEvent.pointerDown(pad, {
      buttons: 1,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    });

    fireEvent(pad, pointerDown);

    expect(pointerDown.defaultPrevented).toBe(true);
    expect(pad.className).toContain("select-none");
  });

  it("allows cartesian vector pads when a product intentionally uses y-up math", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                vector: {
                  coordinateMode: "cartesian",
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Vector",
                  target: "math.vector",
                  type: "vector",
                },
              },
              title: "Math",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);
    const pad = screen.getByRole("button", { name: "Vector X/Y pad" });

    expect(pad.getAttribute("data-vector-pad-coordinate-mode")).toBe("cartesian");
    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => undefined,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(pad, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(pad, {
      buttons: 1,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");
    expect(values["math.vector"]).toEqual({ x: "-1.00", y: "1.00" });
  });

  it("keeps explanatory label text in the native title instead of the visible label", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                gridDensity: {
                  defaultValue: "6",
                  label: "Grid Density (every Nth)",
                  options: [
                    { label: "Every 4th", value: "4" },
                    { label: "Every 6th", value: "6" },
                  ],
                  target: "grid.density",
                  type: "select",
                },
              },
              title: "Grid",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const label = container.querySelector('[data-slot="template-field-label-text"]');

    expect(label?.textContent).toBe("Grid Density");
    expect(label?.getAttribute("title")).toBe("Grid Density (every Nth)");
    expect(screen.queryByText("Grid Density (every Nth)")).toBeNull();
  });

  it("renders schema discrete sliders with Toolcraft variant and markers", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                grain: {
                  defaultValue: 3,
                  label: "Grain",
                  max: 5,
                  min: 0,
                  step: 1,
                  target: "shader.grain",
                  type: "slider",
                  variant: "discrete",
                },
              },
              title: "Texture",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const slider = container.querySelector<HTMLElement>(
      '[data-slot="slider"][data-variant="discrete"]',
    );
    const markers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="slider-marker"]'),
    );

    expect(slider).toBeTruthy();
    expect(markers).toHaveLength(4);

    for (const marker of markers) {
      expect(marker.className).toContain("group-hover/slider-control:opacity-100");
      expect(marker.className.split(/\s+/)).not.toContain("opacity-100");
    }

    fireEvent.pointerDown(slider as HTMLElement, { button: 0 });

    for (const marker of markers) {
      expect(marker.className.split(/\s+/)).toContain("opacity-100");
    }
  });

  it("renders one discrete slider marker for each fractional step", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                duration: {
                  defaultValue: 0.3,
                  label: "Duration",
                  markerCount: 3,
                  max: 0.5,
                  min: 0,
                  step: 0.1,
                  target: "animation.duration",
                  type: "slider",
                  variant: "discrete",
                },
              },
              title: "Timing",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const slider = container.querySelector<HTMLElement>(
      '[data-slot="slider"][data-variant="discrete"]',
    );
    const markers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="slider-marker"]'),
    );

    expect(slider).toBeTruthy();
    expect(markers).toHaveLength(4);
  });

  it("keeps stepped continuous sliders free of discrete markers", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 118,
                  label: "Reveal speed",
                  max: 150,
                  min: 0,
                  step: 1,
                  target: "animation.speed",
                  type: "slider",
                  unit: " cols/s",
                },
              },
              title: "Reveal",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(
      container.querySelector('[data-slot="slider"][data-variant="discrete"]'),
    ).toBeNull();
    expect(container.querySelectorAll('[data-slot="slider-marker"]')).toHaveLength(0);
    expect(container.textContent).toContain("118 cols/s");
  });

  it("keeps textual slider value labels non-editable", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                letterSpacing: {
                  defaultValue: 2,
                  label: "Letter spacing",
                  max: 4,
                  min: 0,
                  step: 1,
                  target: "text.letterSpacing",
                  type: "slider",
                  valueLabel: "Normal",
                },
              },
              title: "Text",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const valueLabel = screen
      .getAllByText("Normal")
      .find((node) => node.getAttribute("aria-hidden") !== "true");

    expect(screen.queryByRole("button", { name: "Edit Letter spacing value" })).toBeNull();
    expect(valueLabel).toBeTruthy();
    expect(valueLabel?.className).toContain("cursor-default");
    expect(valueLabel?.className).not.toContain("cursor-text");
  });

  it("keeps schema sliders stacked even when a layout group asks for an inline row", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fps: {
                  defaultValue: 17,
                  label: "FPS",
                  max: 30,
                  min: 1,
                  step: 1,
                  target: "animation.fps",
                  type: "slider",
                  unit: "fps",
                  variant: "discrete",
                },
                speed: {
                  defaultValue: 3.7,
                  label: "Speed",
                  max: 4,
                  min: 0.1,
                  step: 0.1,
                  target: "animation.speed",
                  type: "slider",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["fps", "speed"],
                  layout: "inline",
                },
              ],
              title: "Pattern Animation",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const fpsSlider = container.querySelector<HTMLElement>(
      '[data-slot="slider"][data-variant="discrete"]',
    );

    expect(container.querySelector('[data-control-layout="inline"]')).toBeNull();
    expect(fpsSlider).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="slider-marker"]').length).toBeGreaterThan(0);
    expect(container.textContent).toContain("17 fps");
    expect(container.textContent).toContain("3.7");
  });

  it("passes schema disabled state into slider controls", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 70,
                  disabled: true,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "shader.opacity",
                  type: "slider",
                },
              },
              title: "Output",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const field = screen.getByText("Opacity").closest('[data-slot="field"]');
    const slider = container.querySelector<HTMLElement>('[data-slot="slider"]');

    expect(field?.getAttribute("data-disabled")).toBe("true");
    expect(slider).toBeTruthy();
    expect(slider?.hasAttribute("data-disabled")).toBe(true);
  });

  it("disables sliders from dependent mode values", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillMode: {
                  defaultValue: "full",
                  label: "Fill mode",
                  options: [
                    { label: "Full", value: "full" },
                    { label: "Partial", value: "partial" },
                  ],
                  target: "distribution.fillMode",
                  type: "segmented",
                },
                fillAmount: {
                  defaultValue: 41,
                  disabledWhen: {
                    equals: "full",
                    target: "distribution.fillMode",
                  },
                  label: "Fill level",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "distribution.fillAmount",
                  type: "slider",
                  unit: "%",
                },
                clusterBias: {
                  defaultValue: 63,
                  disabledWhen: {
                    equals: "full",
                    target: "distribution.fillMode",
                  },
                  label: "Islands",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "distribution.clusterBias",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Distribution",
            },
          ],
          title: "Token Grid",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const fillLevelField = screen.getByText("Fill level").closest('[data-slot="field"]');
    const islandsField = screen.getByText("Islands").closest('[data-slot="field"]');

    expect(fillLevelField?.getAttribute("data-disabled")).toBe("true");
    expect(islandsField?.getAttribute("data-disabled")).toBe("true");
    expect(
      container.querySelectorAll<HTMLElement>('[data-slot="slider"][data-disabled]'),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Partial" }));

    await waitFor(() => {
      expect(fillLevelField?.getAttribute("data-disabled")).not.toBe("true");
      expect(islandsField?.getAttribute("data-disabled")).not.toBe("true");
    });
    expect(
      container.querySelectorAll<HTMLElement>('[data-slot="slider"][data-disabled]'),
    ).toHaveLength(0);
  });

  it("renders only controls that match the current visibleWhen mode", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                identityMode: {
                  defaultValue: "text",
                  label: "Identity",
                  options: [
                    { label: "Text", value: "text" },
                    { label: "Logo", value: "logo" },
                  ],
                  target: "coBrand.identityMode",
                  type: "segmented",
                },
                partnerName: {
                  defaultValue: "tRPC",
                  label: "Partner",
                  target: "coBrand.partnerName",
                  type: "text",
                  visibleWhen: {
                    equals: "text",
                    target: "coBrand.identityMode",
                  },
                },
                partnerLogo: {
                  defaultValue: "logo.svg",
                  label: "Partner logo",
                  target: "coBrand.partnerLogo",
                  type: "text",
                  visibleWhen: {
                    equals: "logo",
                    target: "coBrand.identityMode",
                  },
                },
              },
              title: "Partner Lockup",
            },
          ],
          title: "Cover Builder",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const partnerInput = screen.getByDisplayValue("tRPC");

    expect(screen.getByText("Partner")).toBeTruthy();
    expect(screen.queryByText("Partner logo")).toBeNull();

    fireEvent.change(partnerInput, { target: { value: "Databricks" } });
    fireEvent.blur(partnerInput);

    fireEvent.click(screen.getByRole("button", { name: "Logo" }));

    await waitFor(() => {
      expect(screen.queryByText("Partner")).toBeNull();
      expect(screen.getByText("Partner logo")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Databricks")).toBeTruthy();
      expect(screen.queryByText("Partner logo")).toBeNull();
    });
  });

  it("renders count-dependent controls through numeric visibleWhen conditions", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shadeCount: {
                  defaultValue: 2,
                  label: "Shades",
                  max: 5,
                  min: 1,
                  step: 1,
                  target: "shapes.shadeCount",
                  type: "slider",
                  variant: "discrete",
                },
                shade1: {
                  defaultValue: { hex: "#FFFFFF" },
                  label: "Shade 1",
                  target: "shapes.color1",
                  type: "color",
                },
                shade2: {
                  defaultValue: { hex: "#DDDDDD" },
                  label: "Shade 2",
                  target: "shapes.color2",
                  type: "color",
                  visibleWhen: {
                    greaterThanOrEqual: 2,
                    target: "shapes.shadeCount",
                  },
                },
                shade3: {
                  defaultValue: { hex: "#BBBBBB" },
                  label: "Shade 3",
                  target: "shapes.color3",
                  type: "color",
                  visibleWhen: {
                    greaterThanOrEqual: 3,
                    target: "shapes.shadeCount",
                  },
                },
              },
              title: "Shapes",
            },
          ],
          title: "Pattern Controls",
        },
      },
    });

    const { unmount } = renderControlsPanelWithSchema(schema);

    expect(screen.getByText("Shade 1")).toBeTruthy();
    expect(screen.getByText("Shade 2")).toBeTruthy();
    expect(screen.queryByText("Shade 3")).toBeNull();

    unmount();

    renderControlsPanelWithSchema(schema, {}, {
      values: {
        "shapes.shadeCount": 3,
      },
    });

    expect(screen.getByText("Shade 1")).toBeTruthy();
    expect(screen.getByText("Shade 2")).toBeTruthy();
    expect(screen.getByText("Shade 3")).toBeTruthy();
  });

  it("skips sections that do not match visibleWhen", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                template: {
                  defaultValue: "editorial",
                  label: "Template",
                  options: [
                    { label: "Editorial", value: "editorial" },
                    { label: "Code", value: "code" },
                  ],
                  target: "cover.templateId",
                  type: "segmented",
                },
              },
              title: "Cover Format",
            },
            {
              controls: {
                codeBody: {
                  defaultValue: "const value = true;",
                  label: "Code",
                  target: "code.body",
                  type: "code",
                },
              },
              title: "Code Sample",
              visibleWhen: {
                equals: "code",
                target: "cover.templateId",
              },
            },
          ],
          title: "Cover Builder",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.queryByText("Code Sample")).toBeNull();
    expect(screen.queryByDisplayValue("const value = true;")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    await waitFor(() => {
      expect(screen.getByText("Code Sample")).toBeTruthy();
      expect(screen.getByDisplayValue("const value = true;")).toBeTruthy();
    });
  });

  it("skips sections when every control inside is hidden by visibleWhen", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                identityMode: {
                  defaultValue: "text",
                  label: "Identity",
                  options: [
                    { label: "Text", value: "text" },
                    { label: "Logo", value: "logo" },
                  ],
                  target: "coBrand.identityMode",
                  type: "segmented",
                },
              },
              title: "Identity",
            },
            {
              controls: {
                logoScale: {
                  defaultValue: 80,
                  label: "Scale",
                  target: "coBrand.logoScale",
                  type: "slider",
                  visibleWhen: {
                    equals: "logo",
                    target: "coBrand.identityMode",
                  },
                },
                logoRadius: {
                  defaultValue: 12,
                  label: "Radius",
                  target: "coBrand.logoRadius",
                  type: "slider",
                  visibleWhen: {
                    equals: "logo",
                    target: "coBrand.identityMode",
                  },
                },
              },
              title: "Logo Options",
            },
          ],
          title: "Cover Builder",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.queryByText("Logo Options")).toBeNull();
    expect(screen.queryByText("Scale")).toBeNull();
    expect(screen.queryByText("Radius")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Logo" }));

    await waitFor(() => {
      expect(screen.getByText("Logo Options")).toBeTruthy();
      expect(screen.getByText("Scale")).toBeTruthy();
      expect(screen.getByText("Radius")).toBeTruthy();
    });
  });

  it("passes schema disabled state into range slider controls", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                band: {
                  defaultValue: [20, 80],
                  disabled: true,
                  label: "Band",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "shader.band",
                  type: "rangeSlider",
                },
              },
              title: "Output",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const field = screen.getByText("Band").closest('[data-slot="field"]');
    const slider = container.querySelector<HTMLElement>('[data-slot="slider"]');

    expect(field?.getAttribute("data-disabled")).toBe("true");
    expect(slider).toBeTruthy();
    expect(slider?.hasAttribute("data-disabled")).toBe(true);
  });

  it("commits common range slider value label separators", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                range: {
                  defaultValue: [20, 80],
                  label: "Range",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "shape.range",
                  type: "rangeSlider",
                  unit: "%",
                },
              },
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    for (const [draftValue, expectedValue, expectedLabel] of [
      ["0/1", '"shape.range":[0,1]', "0% – 1%"],
      ["3/5", '"shape.range":[3,5]', "3% – 5%"],
      ["1-6", '"shape.range":[1,6]', "1% – 6%"],
      ["2-3", '"shape.range":[2,3]', "2% – 3%"],
      ["4 - 5", '"shape.range":[4,5]', "4% – 5%"],
      ["30%-150%", '"shape.range":[30,100]', "30% – 100%"],
      ["30% - 90%", '"shape.range":[30,90]', "30% – 90%"],
      ["30 % - 90 %", '"shape.range":[30,90]', "30% – 90%"],
      ["6–7", '"shape.range":[6,7]', "6% – 7%"],
      ["7—8", '"shape.range":[7,8]', "7% – 8%"],
      ["8−9", '"shape.range":[8,9]', "8% – 9%"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: "Edit Range value" }));
      const editor = screen.getByRole("textbox", { name: "Range value" });
      editor.textContent = draftValue;
      fireEvent.blur(editor);

      expect(screen.getByTestId("values-json").textContent).toContain(expectedValue);
      expect(screen.getByRole("button", { name: "Edit Range value" }).textContent).toBe(
        expectedLabel,
      );
    }
  });

  it("does not place any schema slider in inline layout rows", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                range: {
                  defaultValue: [20, 80],
                  label: "Range",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "shape.range",
                  type: "rangeSlider",
                  unit: "%",
                },
                strength: {
                  defaultValue: 50,
                  label: "Strength",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "shape.strength",
                  type: "slider",
                  unit: "%",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["range", "strength"],
                  layout: "inline",
                },
              ],
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    expect(container.querySelector('[data-control-layout="inline"]')).toBeNull();
    expect(screen.getByText("Range")).toBeTruthy();
    expect(screen.getByText("Strength")).toBeTruthy();
  });

  it("steps manually edited slider values with arrow keys", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 10,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  step: 5,
                  target: "shape.opacity",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    fireEvent.click(screen.getByRole("button", { name: "Edit Opacity value" }));
    const editor = screen.getByRole("textbox", { name: "Opacity value" });

    fireEvent.keyDown(editor, { key: "ArrowUp" });
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"shape.opacity":15',
    );
    expect(editor.textContent).toBe("15%");

    fireEvent.keyDown(editor, { key: "ArrowDown" });
    expect(screen.getByTestId("values-json").textContent).toContain(
      '"shape.opacity":10',
    );
    expect(editor.textContent).toBe("10%");

    fireEvent.blur(editor);
    expect(screen.getByRole("button", { name: "Edit Opacity value" }).textContent).toBe(
      "10%",
    );
  });

  it("renders single-layer file uploads as a removable preview", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  accept: "PNG, SVG",
                  label: "Image",
                  target: "input.source",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema, undefined, {
      layers: [
        {
          id: "layer-1",
          kind: "layer",
          name: "material",
          visible: true,
        },
      ],
      mediaAssets: [
        {
          dataUrl:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' fill='%23777'/%3E%3C/svg%3E",
          fileName: "material.svg",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "image/svg+xml",
          position: { x: 0, y: 0 },
          size: { height: 64, unit: "px", width: 96 },
        },
      ],
      selectedLayerId: "layer-1",
    });

    expect(screen.getByRole("img", { name: "material.svg" })).toBeTruthy();
    const transformActions = container.querySelector(
      '[data-slot="actions-control"][aria-label="Image transforms"]',
    );
    const transformActionButtons = transformActions?.querySelector(
      '[data-slot="actions-control-buttons"]',
    );

    expect(transformActions).toBeTruthy();
    expect(transformActions?.parentElement?.style.gap).toBe("6px");
    expect(transformActionButtons?.className).toContain("grid-cols-3");
    expect(transformActionButtons?.getAttribute("data-actions-columns")).toBe("3");
    expect(screen.queryByRole("button", { name: "90° Left" })).toBeNull();

    for (const [name, visibleLabel] of [
      ["90° Right", "90°"],
      ["Flip horizontal", "Flip H"],
      ["Flip vertical", "Flip V"],
    ] as const) {
      const button = screen.getByRole("button", { name });

      expect(button).toBeTruthy();
      expect(button.textContent).toContain(visibleLabel);
    }
    expect(
      screen.queryByText("Click to upload an image"),
    ).toBeNull();
    const initialPreviewFrameStyle = container
      .querySelector('[data-slot="file-upload-preview-frame"]')
      ?.getAttribute("style");

    expect(initialPreviewFrameStyle).toBe(
      "aspect-ratio: 96 / 64; max-height: 196px; width: 100%;",
    );
    expect(screen.getByRole("img", { name: "material.svg" }).getAttribute("style")).toBe(
      "transform: translate(-50%, -50%);",
    );

    fireEvent.click(screen.getByRole("button", { name: "90° Right" }));
    expect(screen.getByTestId("media-transforms").textContent).toBe(
      '[{"rotationDeg":90}]',
    );
    expect(
      container.querySelector('[data-slot="file-upload-preview-frame"]')?.getAttribute("style"),
    ).toBe(initialPreviewFrameStyle);
    expect(screen.getByRole("img", { name: "material.svg" }).getAttribute("style")).toBe(
      "transform: translate(-50%, -50%) rotate(90deg); width: 66.6667%;",
    );

    fireEvent.click(screen.getByRole("button", { name: "Flip horizontal" }));
    expect(screen.getByTestId("media-transforms").textContent).toBe(
      '[{"rotationDeg":90,"flipHorizontal":true}]',
    );
    expect(screen.getByRole("img", { name: "material.svg" }).getAttribute("style")).toBe(
      "transform: translate(-50%, -50%) rotate(90deg) scale(-1, 1); width: 66.6667%;",
    );

    fireEvent.click(screen.getByRole("button", { name: "Flip vertical" }));
    expect(screen.getByTestId("media-transforms").textContent).toBe(
      '[{"rotationDeg":90,"flipHorizontal":true,"flipVertical":true}]',
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    expect(screen.getByTestId("media-count").textContent).toBe("0");
    expect(screen.queryByRole("img", { name: "material.svg" })).toBeNull();
    expect(screen.getByText("Click to upload an image")).toBeTruthy();
  });

  it("renders schema default media as a removable fileDrop attachment", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      media: {
        defaultAssets: [
          {
            dataUrl:
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' fill='%23777'/%3E%3C/svg%3E",
            fileName: "default-background.svg",
            id: "default-background",
            layerId: "default-background-layer",
            mimeType: "image/svg+xml",
            size: { height: 64, unit: "px", width: 96 },
            sourceTarget: "input.source",
          },
        ],
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  accept: "PNG, SVG",
                  label: "Image",
                  target: "input.source",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByRole("img", { name: "default-background.svg" })).toBeTruthy();
    expect(screen.getByTestId("media-ids").textContent).toBe("default-background");

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    expect(screen.getByTestId("media-count").textContent).toBe("0");
    expect(screen.queryByRole("img", { name: "default-background.svg" })).toBeNull();
    expect(screen.getByText("Click to upload an image")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset Input section" }));

    expect(screen.getByRole("img", { name: "default-background.svg" })).toBeTruthy();
    expect(screen.getByTestId("media-count").textContent).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));

    expect(screen.getByRole("img", { name: "default-background.svg" })).toBeTruthy();
    expect(screen.getByTestId("media-count").textContent).toBe("1");
  });

  it("keeps the current editable canvas size when uploading an image through fileDrop", async () => {
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 720, unit: "px", width: 1280 },
        upload: true,
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  label: "Image",
                  target: "input.source",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });
    const { container } = renderControlsPanelWithSchema(schema);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');

    expect(input).toBeTruthy();
    expect(screen.getByTestId("canvas-size").textContent).toBe("1280,720");

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["image"], "wide.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("media-count").textContent).toBe("1");
    });

    expect(screen.getByTestId("canvas-size").textContent).toBe("1280,720");
    expect(screen.getByTestId("media-sizes").textContent).toBe("1280x720");
  });

  it("removes single-layer file uploads from the canvas and returns the file control to empty", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  accept: "PNG, SVG",
                  label: "Image",
                  target: "input.source",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    render(
      <ToolcraftRoot
        initialState={{
          layers: [
            {
              id: "layer-1",
              kind: "layer",
              name: "material",
              visible: true,
            },
          ],
          mediaAssets: [
            {
              dataUrl:
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' fill='%23777'/%3E%3C/svg%3E",
              fileName: "material.svg",
              id: "media-1",
              layerId: "layer-1",
              mimeType: "image/svg+xml",
              position: { x: 0, y: 0 },
              size: { height: 64, unit: "px", width: 96 },
            },
          ],
          selectedLayerId: "layer-1",
        }}
        schema={schema}
      >
        <div style={{ height: 320, position: "relative", width: 320 }}>
          <CanvasShell />
        </div>
        <ControlsPanel framed={false} />
        <StateProbe />
      </ToolcraftRoot>,
    );

    expect(screen.getByRole("button", { name: "Select material.svg" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "material.svg" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    expect(screen.queryByRole("button", { name: "Select material.svg" })).toBeNull();
    expect(screen.queryAllByRole("img", { name: "material.svg" })).toHaveLength(0);
    expect(screen.getByText("Click to upload an image")).toBeTruthy();
    expect(screen.getByTestId("media-count").textContent).toBe("0");
  });

  it("renders multi-image file uploads as an add-last thumbnail grid", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  accept: "PNG, SVG",
                  label: "Images",
                  multiple: true,
                  target: "input.sources",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema, undefined, {
      layers: [
        { id: "layer-1", kind: "layer", name: "one", visible: true },
        { id: "layer-2", kind: "layer", name: "two", visible: true },
      ],
      mediaAssets: [
        {
          dataUrl:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' fill='%23777'/%3E%3C/svg%3E",
          fileName: "one.svg",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "image/svg+xml",
          position: { x: 0, y: 0 },
          size: { height: 96, unit: "px", width: 96 },
        },
        {
          dataUrl:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' fill='%23999'/%3E%3C/svg%3E",
          fileName: "two.svg",
          id: "media-2",
          layerId: "layer-2",
          mimeType: "image/svg+xml",
          position: { x: 0, y: 0 },
          size: { height: 96, unit: "px", width: 96 },
        },
      ],
      selectedLayerId: "layer-2",
    });

    expect(screen.getByRole("button", { name: "Add image files" })).toBeTruthy();
    const previewGrid = container.querySelector('[data-slot="file-upload-preview-grid"]');
    expect(previewGrid?.className).toContain("grid-cols-4");
    expect(previewGrid?.lastElementChild?.getAttribute("data-slot")).toBe(
      "file-upload-add-preview",
    );
    expect(screen.getByRole("img", { name: "one.svg" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "two.svg" })).toBeTruthy();
    expect(screen.getByTestId("media-ids").textContent).toBe("media-1,media-2");
    expect(screen.queryByRole("button", { name: "90° Left" })).toBeNull();

    const firstPreview = screen
      .getByRole("img", { name: "one.svg" })
      .closest<HTMLElement>('[data-slot="file-upload-preview-item"]');
    const secondPreview = screen
      .getByRole("img", { name: "two.svg" })
      .closest<HTMLElement>('[data-slot="file-upload-preview-item"]');

    if (!firstPreview || !secondPreview) {
      throw new Error("Expected multi-image previews to render");
    }

    expect(firstPreview.getAttribute("role")).toBe("button");
    expect(firstPreview.getAttribute("tabindex")).toBe("0");
    expect(firstPreview.className).toContain("cursor-grab");

    fireEvent.click(firstPreview);
    expect(firstPreview.getAttribute("data-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "90° Right" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "90° Right" }));
    expect(screen.getByTestId("media-transforms").textContent).toBe(
      '[{"rotationDeg":90},null]',
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove two.svg" }));

    expect(screen.getByTestId("media-count").textContent).toBe("1");
    expect(screen.queryByRole("img", { name: "two.svg" })).toBeNull();
  });

  it("renders arbitrary file uploads as a sortable file list", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  assetKind: "file",
                  label: "Files",
                  multiple: true,
                  target: "input.files",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema, undefined, {
      layers: [
        { id: "layer-1", kind: "layer", name: "one", visible: true },
        { id: "layer-2", kind: "layer", name: "two", visible: true },
      ],
      mediaAssets: [
        {
          assetKind: "file",
          dataUrl: "data:text/plain;base64,b25l",
          fileName: "one.txt",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "text/plain",
          position: { x: 0, y: 0 },
          sourceTarget: "input.files",
        },
        {
          assetKind: "file",
          dataUrl: "data:application/json;base64,e30=",
          fileName: "two.json",
          id: "media-2",
          layerId: "layer-2",
          mimeType: "application/json",
          position: { x: 0, y: 0 },
          sourceTarget: "input.files",
        },
      ],
      selectedLayerId: "layer-2",
    });

    const fileList = container.querySelector('[data-slot="file-upload-file-list"]');
    const fileRows = container.querySelectorAll('[data-slot="file-upload-file-item"]');
    const fileDividers = container.querySelectorAll('[data-slot="file-upload-file-divider"]');

    expect(fileList).toBeTruthy();
    expect(fileRows).toHaveLength(2);
    expect(fileDividers).toHaveLength(2);
    expect(screen.getByText("one.txt")).toBeTruthy();
    expect(screen.getByText("two.json")).toBeTruthy();
    expect(screen.getByText("one.txt").className).toContain("text-xs");
    expect(screen.getByText("one.txt").className).not.toContain("truncate");
    expect(screen.getByText("one.txt").className).toContain("mask-image");
    expect(screen.getByRole("button", { name: "Remove one.txt" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a new file" })).toBeTruthy();
    expect(fileRows[0]?.className).not.toContain("border-b");
    expect(fileRows[0]?.className).toContain("hover:bg");
    expect(fileDividers[0]?.className).toContain("var(--border)_5%");
    expect(fileRows[0]?.getAttribute("role")).toBe("button");
    expect(fileRows[0]?.getAttribute("tabindex")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "Remove two.json" }));

    expect(screen.getByTestId("media-count").textContent).toBe("1");
    expect(screen.queryByText("two.json")).toBeNull();
  });

  it("renders the arbitrary file uploader empty state", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  assetKind: "file",
                  label: "Files",
                  target: "input.files",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByText("Click to upload a file")).toBeTruthy();
    expect(screen.getByText("or drag it onto the canvas")).toBeTruthy();
    expect(screen.queryByText("Click to upload an image")).toBeNull();
  });

  it("keeps file upload deletion in the layers panel for multi-layer apps", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  accept: "PNG, SVG",
                  label: "Image",
                  target: "input.source",
                  type: "fileDrop",
                },
              },
              layout: "standalone",
              title: "Input",
            },
          ],
          title: "Generation Controls",
        },
        layers: true,
      },
    });

    renderControlsPanelWithSchema(schema, undefined, {
      layers: [
        {
          id: "layer-1",
          kind: "layer",
          name: "material",
          visible: true,
        },
      ],
      mediaAssets: [
        {
          dataUrl:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' fill='%23777'/%3E%3C/svg%3E",
          fileName: "material.svg",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "image/svg+xml",
          position: { x: 0, y: 0 },
          size: { height: 64, unit: "px", width: 96 },
        },
      ],
      selectedLayerId: "layer-1",
    });

    expect(screen.queryByRole("img", { name: "material.svg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove image" })).toBeNull();
    expect(screen.getByText("Click to upload an image")).toBeTruthy();
  });

  it("renders paired color controls as one compound color grid item", () => {
    renderControlsPanel();

    const fillInput = screen.getByLabelText("Fill hex");
    const colorControlList = fillInput.closest("[data-control-list]");
    const colorSection = fillInput.closest("section");

    expect(colorSection?.textContent).toContain("Fill & Stroke");
    expect(screen.getByLabelText("Stroke hex")).toBeTruthy();
    expect(colorControlList?.children).toHaveLength(1);
  });

  it("keeps an odd trailing plain color half-width in a color bank", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                accent1: {
                  defaultValue: { hex: "#9CE6FF" },
                  label: "Accent 1",
                  target: "accent.shade1",
                  type: "color",
                },
                accent2: {
                  defaultValue: { hex: "#FF7A90" },
                  label: "Accent 2",
                  target: "accent.shade2",
                  type: "color",
                },
                accent3: {
                  defaultValue: { hex: "#FFD166" },
                  label: "Accent 3",
                  target: "accent.shade3",
                  type: "color",
                },
                accent4: {
                  defaultValue: { hex: "#8BF38B" },
                  label: "Accent 4",
                  target: "accent.shade4",
                  type: "color",
                },
                accent5: {
                  defaultValue: { hex: "#BDA8FF" },
                  label: "Accent 5",
                  target: "accent.shade5",
                  type: "color",
                },
              },
              title: "Accent Shades",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const pairedColorRows = container.querySelectorAll('[data-slot="color-control-grid"]');
    const trailingColorButtonGroup = screen
      .getByLabelText("Accent 5 hex")
      .closest('[data-slot="button-group"]');
    const trailingColorWidthContainer = trailingColorButtonGroup?.parentElement;

    expect(pairedColorRows).toHaveLength(2);
    expect(trailingColorWidthContainer?.className).toContain("w-1/2");
    expect(trailingColorWidthContainer?.className).not.toContain("w-full");
  });

  it("omits visible color field labels only inside color-only sections", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillColor: {
                  defaultValue: { hex: "#C1FF00" },
                  label: "Fill",
                  target: "shape.fill",
                  type: "color",
                },
                strokeColor: {
                  defaultValue: { hex: "#FF6A00" },
                  label: "Stroke",
                  target: "shape.stroke",
                  type: "color",
                },
                shadowColor: {
                  defaultValue: { hex: "#000000", opacity: 45 },
                  label: "Shadow",
                  target: "shape.shadow",
                  type: "colorOpacity",
                },
              },
              title: "Appearance",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const labels = [...container.querySelectorAll("[data-control-field-label]")].map(
      (label) => label.textContent,
    );

    expect(labels).not.toContain("Fill");
    expect(labels).not.toContain("Stroke");
    expect(labels).not.toContain("Shadow");
    expect(screen.getByLabelText("Fill hex")).toBeTruthy();
    expect(screen.getByLabelText("Shadow opacity")).toBeTruthy();
  });

  it("shows color field labels inside mixed semantic sections", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
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
                  defaultValue: { hex: "#0EA5E9" },
                  label: "Color",
                  target: "mask.color",
                  type: "color",
                },
                glowColor: {
                  defaultValue: { hex: "#C1FF00", opacity: 72 },
                  label: "Glow",
                  target: "mask.glow",
                  type: "colorOpacity",
                },
              },
              title: "Mask",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const labels = [...container.querySelectorAll("[data-control-field-label]")].map(
      (label) => label.textContent,
    );

    expect(labels).toContain("Color");
    expect(labels).toContain("Glow");
    expect(screen.getByLabelText("Color hex")).toBeTruthy();
    expect(screen.getByLabelText("Glow opacity")).toBeTruthy();
  });

  it("renders color opacity as one compound color and opacity control", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                textColor: {
                  defaultValue: { hex: "#C1FF00", opacity: 72 },
                  label: "Text color",
                  target: "text.color",
                  type: "colorOpacity",
                },
              },
              title: "Typography",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByLabelText("Text color hex")).toBeTruthy();
    expect(screen.getByLabelText("Text color opacity")).toBeTruthy();
    expect((screen.getByLabelText("Text color opacity") as HTMLInputElement).value).toBe(
      "72",
    );

    const textColorOpacityInput = screen.getByLabelText(
      "Text color opacity",
    ) as HTMLInputElement;

    fireEvent.change(textColorOpacityInput, {
      target: { value: "55" },
    });
    fireEvent.blur(textColorOpacityInput);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("text-color-value").textContent ?? "{}")).toEqual({
        hex: "#C1FF00",
        opacity: 55,
      });
    });
  });

  it("applies color picker slider changes while dragging", async () => {
    const onChange = vi.fn();

    render(<StyleGuideColorPicker value="#C1FF00" onChange={onChange} />);

    const hueSlider = screen.getByRole("slider", { name: "Color hue" });
    Object.defineProperty(hueSlider, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 18,
        height: 18,
        left: 0,
        right: 360,
        top: 0,
        width: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(hueSlider, { clientX: 0 });
    fireEvent.pointerMove(window, { clientX: 180 });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith("#00ffff");
    });
  });

  it("keeps two color opacity controls stacked even when an inline row is requested", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillColor: {
                  defaultValue: { hex: "#0EA5E9", opacity: 82 },
                  label: "Fill",
                  target: "shape.fill",
                  type: "colorOpacity",
                },
                strokeColor: {
                  defaultValue: { hex: "#111827", opacity: 100 },
                  label: "Stroke",
                  target: "shape.stroke",
                  type: "colorOpacity",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["fillColor", "strokeColor"],
                  layout: "inline",
                },
              ],
              title: "Shape",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const inlineGroup = container.querySelector<HTMLElement>(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );
    const fillOpacityInput = screen.getByLabelText("Fill opacity");
    const strokeOpacityInput = screen.getByLabelText("Stroke opacity");

    expect(inlineGroup).toBeNull();
    expect(fillOpacityInput).toBeTruthy();
    expect(strokeOpacityInput).toBeTruthy();
  });

  it("keeps mixed plain color and color opacity controls stacked when opacity is present", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                backgroundColor: {
                  defaultValue: { hex: "#0E0E0E" },
                  label: "Background",
                  target: "background.color",
                  type: "color",
                },
                textColor: {
                  defaultValue: { hex: "#FFFFFF", opacity: 88 },
                  label: "Text",
                  target: "text.color",
                  type: "colorOpacity",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["backgroundColor", "textColor"],
                  layout: "inline",
                },
              ],
              title: "Colors",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const inlineGroup = container.querySelector<HTMLElement>(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );

    expect(inlineGroup).toBeNull();
    expect(screen.getByLabelText("Background hex")).toBeTruthy();
    expect(screen.getByLabelText("Text opacity")).toBeTruthy();
  });

  it("keeps mixed numeric and color opacity controls stacked even when an inline row is requested", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
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
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["maskSize", "maskColor"],
                  layout: "inline",
                },
              ],
              title: "Mask",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const inlineGroup = container.querySelector<HTMLElement>(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );

    expect(inlineGroup).toBeNull();
    expect(container.textContent).toContain("Mask size");
    expect(screen.getByLabelText("Color hex")).toBeTruthy();
    expect((screen.getByLabelText("Color opacity") as HTMLInputElement).value).toBe(
      "82",
    );
  });

  it("uses HSL as the default color field format with the Figma-style HSL surface", () => {
    const defaultModel = getColorSurfaceModel(DEFAULT_COLOR_FORMAT_MODE);

    expect(DEFAULT_COLOR_FORMAT_MODE).toBe("hsl");
    expect(defaultModel).toBe("hsl");
    expect(
      getColorSurfaceSliderConfig({
        colorModel: defaultModel,
        currentColorHex: "#336699",
        hueLabel: "Color hue",
        optimisticColor: { h: 210, s: 0.67, v: 0.6 },
      }),
    ).toEqual({
      label: "Color hue",
      max: 360,
      railBackground:
        "linear-gradient(90deg, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)",
      value: 210,
    });
  });

  it("matches Figma color surface models for editable color formats", () => {
    expect(getColorSurfaceModel("rgb")).toBe("hsb");
    expect(getColorSurfaceModel("hsl")).toBe("hsl");
    expect(getColorSurfaceModel("hsb")).toBe("hsb");
    expect(getColorSurfaceModel("hex")).toBe("hsb");

    const rgbStyle = getColorSurfaceStyle({
      colorModel: getColorSurfaceModel("rgb"),
      currentColorHex: "#336699",
      hueColor: "#0088FF",
    });
    const hslStyle = getColorSurfaceStyle({
      colorModel: getColorSurfaceModel("hsl"),
      currentColorHex: "#336699",
      hueColor: "#0088FF",
    });
    const hsbStyle = getColorSurfaceStyle({
      colorModel: "hsb",
      currentColorHex: "#336699",
      hueColor: "#0088FF",
    });

    expect(rgbStyle.backgroundColor).toBe("#0088FF");
    expect(String(hslStyle.backgroundImage)).toContain("hsl(210 100% 50%)");
    expect(hsbStyle.backgroundColor).toBe("#0088FF");

    expect(
      getColorSurfaceSliderConfig({
        colorModel: getColorSurfaceModel("rgb"),
        currentColorHex: "#336699",
        hueLabel: "Color hue",
        optimisticColor: { h: 210, s: 0.67, v: 0.6 },
      }),
    ).toEqual({
      label: "Color hue",
      max: 360,
      railBackground:
        "linear-gradient(90deg, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)",
      value: 210,
    });
    expect(
      getColorSurfaceSliderConfig({
        colorModel: getColorSurfaceModel("hsl"),
        currentColorHex: "#336699",
        hueLabel: "Color hue",
        optimisticColor: { h: 210, s: 0.67, v: 0.6 },
      }),
    ).toEqual({
      label: "Color hue",
      max: 360,
      railBackground:
        "linear-gradient(90deg, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)",
      value: 210,
    });

    expect(
      getColorSurfaceThumbPosition({
        colorModel: getColorSurfaceModel("rgb"),
        currentColorHex: "#336699",
        optimisticColor: { h: 210, s: 0.67, v: 0.6 },
      }),
    ).toEqual({ left: "67%", top: "40%" });
    expect(
      getColorSurfaceThumbPosition({
        colorModel: getColorSurfaceModel("hsl"),
        currentColorHex: "#336699",
        optimisticColor: { h: 210, s: 0.67, v: 0.6 },
      }),
    ).toEqual({ left: "50%", top: "60%" });
    expect(
      getColorSurfaceThumbPosition({
        colorModel: getColorSurfaceModel("hsl"),
        currentColorHex: "#000000",
        optimisticColor: { h: 210, s: 0.67, v: 0 },
        surfacePosition: { x: 0.72, y: 1 },
      }),
    ).toEqual({ left: "72%", top: "100%" });
  });

  it("keeps hue fixed while dragging inside HSB and HSL color surfaces", () => {
    const surfaceBounds = { height: 100, left: 0, top: 0, width: 100 };

    expect(
      getSurfaceHsvColor({
        clientX: 5,
        clientY: 95,
        currentColor: { h: 133, s: 0.85, v: 0.85 },
        surfaceBounds,
        surfaceModel: "hsb",
      }).h,
    ).toBe(133);
    expect(
      getSurfaceHsvColor({
        clientX: 5,
        clientY: 95,
        currentColor: { h: 133, s: 0.85, v: 0.85 },
        surfaceBounds,
        surfaceModel: "hsl",
      }).h,
    ).toBe(133);
  });

  it.each([
    ["linear", "Linear"],
    ["radial", "Radial"],
    ["angular", "Angular"],
    ["diamond", "Diamond"],
  ] as const)("preserves %s gradient type in the gradient select", (gradientType, label) => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                gradient: {
                  defaultValue: {
                    angle: 138,
                    gradientType,
                    stops: [
                      { color: "#111111", position: "0%" },
                      { color: "#14B8FF", position: "45%" },
                      { color: "#F472B6", position: "76%" },
                    ],
                  },
                  label: "Gradient",
                  target: "style.gradient",
                  type: "gradient",
                },
              },
              title: "Gradient",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);
    const gradientSelect = container.querySelector('[data-slot="select-trigger"]');

    expect(gradientSelect?.textContent).toContain(label);
  });

  it("commits gradient stop position inputs on blur or Enter with a separated percent suffix", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                gradient: {
                  defaultValue: {
                    angle: 90,
                    gradientType: "linear",
                    stops: [
                      { color: "#111111", position: "0%" },
                      { color: "#FFFFFF", position: "100%" },
                    ],
                  },
                  label: "Gradient",
                  target: "style.gradient",
                  type: "gradient",
                },
              },
              title: "Gradient",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const firstPositionInput = screen.getByLabelText(
      "Stop 1 position",
    ) as HTMLInputElement;
    const secondPositionInput = screen.getByLabelText(
      "Stop 2 position",
    ) as HTMLInputElement;
    const firstPositionGroup = firstPositionInput.closest('[data-slot="input-group"]');
    const firstOpacityInput = screen.getByLabelText("Stop 1 opacity");
    const stopsList = firstPositionInput.closest('[data-slot="gradient-stops-list"]');
    const gradientControlItem = stopsList?.closest(
      "[data-control-item-compound-context]",
    );
    const firstStopGrid = firstPositionInput.closest('[data-slot="field"]')
      ?.querySelector('[data-slot="gradient-stop-row-grid"]');

    expect(firstPositionInput.value).toBe("0");
    expect(firstPositionGroup?.textContent).toContain("%");
    expect(stopsList?.className).not.toContain("border-y");
    expect(gradientControlItem).toBeNull();
    expect(firstPositionInput.className.split(/\s+/)).toContain("pl-[5px]");
    expect(firstOpacityInput.className.split(/\s+/)).toContain("pl-[5px]");
    expect(firstStopGrid?.className).toContain("grid-cols-[3.5rem_minmax(0,1fr)_1.5rem]");

    fireEvent.change(firstPositionInput, { target: { value: "25" } });
    expect(JSON.parse(screen.getByTestId("gradient-value").textContent ?? "{}")).toMatchObject({
      stops: [
        { position: "0%" },
        { position: "100%" },
      ],
    });

    fireEvent.blur(firstPositionInput);
    expect(JSON.parse(screen.getByTestId("gradient-value").textContent ?? "{}")).toMatchObject({
      stops: [
        { position: "25%" },
        { position: "100%" },
      ],
    });

    fireEvent.change(secondPositionInput, { target: { value: "75" } });
    expect(JSON.parse(screen.getByTestId("gradient-value").textContent ?? "{}")).toMatchObject({
      stops: [
        { position: "25%" },
        { position: "100%" },
      ],
    });

    fireEvent.keyDown(secondPositionInput, { code: "Enter", key: "Enter" });
    expect(JSON.parse(screen.getByTestId("gradient-value").textContent ?? "{}")).toMatchObject({
      stops: [
        { position: "25%" },
        { position: "75%" },
      ],
    });
  });

  it("renders content-width dividers for sectioned compound controls only when a section has sibling controls", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                gradient: {
                  defaultValue: {
                    angle: 90,
                    gradientType: "linear",
                    stops: [
                      { color: "#111111", position: "0%" },
                      { color: "#FFFFFF", position: "100%" },
                    ],
                  },
                  label: "Gradient",
                  target: "style.gradient",
                  type: "gradient",
                },
                font: {
                  defaultValue: {
                    color: "#FFFFFF",
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "original",
                  },
                  label: "Font",
                  target: "typography.font",
                  type: "fontPicker",
                },
              },
              title: "Appearance",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const stopsList = screen
      .getByLabelText("Stop 1 position")
      .closest('[data-slot="gradient-stops-list"]');
    const gradientControlItem = stopsList?.closest(
      "[data-control-item-compound-context]",
    ) as HTMLElement | null | undefined;
    const fontControlItem = screen
      .getByText("Weight")
      .closest("[data-control-item-compound-context]") as HTMLElement | null;

    expect(stopsList?.className).not.toContain("border-y");
    expect(gradientControlItem?.dataset.controlItemCompoundDividerPlacement).toBe(
      "bottom",
    );
    expect(gradientControlItem?.className).not.toContain(
      "has-data-[control-section-divider=compound]:py-[18px]",
    );
    expect(gradientControlItem?.className).not.toContain(
      "has-data-[control-section-divider=compound]:pt-[18px]",
    );
    expect(gradientControlItem?.className).toContain(
      "has-data-[control-section-divider=compound]:pb-[18px]",
    );
    expect(gradientControlItem?.className).not.toContain(
      "has-data-[control-section-divider=compound]:before:inset-x-3",
    );
    expect(gradientControlItem?.className).toContain(
      "has-data-[control-section-divider=compound]:after:inset-x-3",
    );
    expect(fontControlItem?.dataset.controlItemCompoundDividerPlacement).toBe("top");
    expect(fontControlItem?.className).toContain(
      "has-data-[control-section-divider=compound]:pt-[18px]",
    );
    expect(fontControlItem?.className).not.toContain(
      "has-data-[control-section-divider=compound]:pb-[18px]",
    );
    expect(fontControlItem?.className).toContain(
      "has-data-[control-section-divider=compound]:before:inset-x-3",
    );
    expect(fontControlItem?.className).not.toContain(
      "has-data-[control-section-divider=compound]:after:inset-x-3",
    );
  });

  it("splits sectioned compound controls out of mixed inline layout groups", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                gradient: {
                  defaultValue: {
                    angle: 90,
                    gradientType: "linear",
                    stops: [
                      { color: "#111111", position: "0%" },
                      { color: "#FFFFFF", position: "100%" },
                    ],
                  },
                  label: "Gradient",
                  target: "style.gradient",
                  type: "gradient",
                },
                mode: {
                  defaultValue: "normal",
                  label: "Mode",
                  options: [
                    { label: "Normal", value: "normal" },
                    { label: "Screen", value: "screen" },
                  ],
                  target: "style.mode",
                  type: "select",
                },
              },
              layoutGroups: [
                {
                  controls: ["gradient", "mode"],
                  layout: "inline",
                },
              ],
              title: "Appearance",
            },
          ],
          title: "Generation Controls",
        },
      },
    });
    const { container } = renderControlsPanelWithSchema(schema);

    const inlineGroup = container.querySelector(
      '[data-control-layout="inline"][data-control-layout-group]',
    );
    const stopsList = screen
      .getByLabelText("Stop 1 position")
      .closest('[data-slot="gradient-stops-list"]');
    const gradientSection = stopsList?.closest("section");
    const modeSection = screen.getByText("Mode").closest("section");

    expect(inlineGroup).toBeNull();
    expect(stopsList?.closest("[data-control-item-compound-context]")).toBeNull();
    expect(gradientSection).not.toBe(modeSection);
  });

  it("binds control changes and reset actions to runtime state", () => {
    renderControlsPanel();

    const promptInput = screen.getByDisplayValue("Initial prompt");

    fireEvent.change(promptInput, { target: { value: "Updated prompt" } });
    expect(screen.getByTestId("prompt-value").textContent).toBe("Updated prompt");

    const enabledField = screen.getByText("Enabled").closest('[role="group"]');
    const enabledSwitch = enabledField?.querySelector<HTMLElement>('[role="switch"]');

    fireEvent.click(enabledSwitch as HTMLElement);
    expect(screen.getByTestId("enabled-value").textContent).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));

    expect(screen.getByTestId("prompt-value").textContent).toBe("Initial prompt");
    expect(screen.getByTestId("enabled-value").textContent).toBe("true");
  });

  it("resets only controls from the selected section header action", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                toneName: {
                  defaultValue: "Soft",
                  label: "Tone name",
                  target: "tone.name",
                  type: "text",
                },
              },
              title: "Tone",
            },
            {
              controls: {
                prompt: {
                  defaultValue: "Poster",
                  label: "Prompt",
                  target: "generation.prompt",
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
    const { container } = renderControlsPanelWithSchema(schema);

    fireEvent.change(screen.getByDisplayValue("Soft"), {
      target: { value: "Sharp" },
    });
    fireEvent.change(screen.getByDisplayValue("Poster"), {
      target: { value: "Banner" },
    });

    const toneHeader = screen
      .getByText("Tone")
      .closest<HTMLElement>('[data-slot="control-section-header"]');
    const headerButtons = toneHeader?.querySelectorAll("button");

    expect(headerButtons?.[0]?.getAttribute("data-control-section-reset-button")).toBe("");
    expect(headerButtons?.[1]?.getAttribute("data-control-section-collapse-button")).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Reset Tone section" }));

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["tone.name"]).toBe("Soft");
    expect(values["generation.prompt"]).toBe("Banner");
    expect(container.querySelector('[data-control-section-reset-button]')).toBeTruthy();
  });

  it("clears file upload previews from the selected section reset action", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                source: {
                  defaultValue: null,
                  label: "Image",
                  target: "media.source",
                  type: "fileDrop",
                },
              },
              title: "Source Image",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema, {}, {
      mediaAssets: [
        {
          dataUrl:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E",
          fileName: "source.svg",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "image/svg+xml",
          position: { x: 0, y: 0 },
          size: { height: 300, unit: "px", width: 400 },
          sourceTarget: "media.source",
        },
      ],
    });

    expect(screen.getByRole("img", { name: "source.svg" })).toBeTruthy();
    expect(screen.getByTestId("media-count").textContent).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Reset Source Image section" }));

    expect(screen.queryByRole("img", { name: "source.svg" })).toBeNull();
    expect(screen.getByTestId("media-count").textContent).toBe("0");
  });

  it("renders collection actions as add/remove controls for runtime item arrays", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                colors: {
                  defaultValue: [{ hex: "#DFFF1A" }, { hex: "#8CFF3A" }],
                  itemControl: {
                    defaultValue: { hex: "#C1FF00" },
                    label: "Color",
                    type: "color",
                  },
                  label: "Colors",
                  minItems: 1,
                  recommendedMaxItems: 2,
                  target: "bead.colors",
                  type: "collectionActions",
                },
              },
              title: "Bead Colors",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    const addButton = screen.getByRole("button", { name: "Add Color" });
    const removeButton = screen.getByRole("button", { name: "Remove Color" });
    const collectionHeader = container.querySelector(
      '[data-slot="collection-actions-control-header"]',
    );
    const colorGrid = container.querySelector(
      '[data-slot="collection-actions-items-grid"]',
    );

    expect(collectionHeader?.textContent).toContain("Colors");
    expect(collectionHeader?.lastElementChild?.contains(removeButton)).toBe(true);
    expect(collectionHeader?.lastElementChild?.contains(addButton)).toBe(true);
    expect(colorGrid).toBeTruthy();
    expect(colorGrid?.children).toHaveLength(2);
    expect(screen.queryByText("Color 1")).toBeNull();
    expect(screen.queryByText("Color 2")).toBeNull();

    fireEvent.click(addButton);
    fireEvent.click(addButton);

    let values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["bead.colors"]).toHaveLength(4);
    expect(screen.queryByText("Color 4")).toBeNull();
    expect(colorGrid?.children).toHaveLength(4);
    expect((addButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(removeButton);
    fireEvent.click(removeButton);
    fireEvent.click(removeButton);

    values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["bead.colors"]).toHaveLength(1);
    expect((removeButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders collection item controls beyond color lists", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                labels: {
                  defaultValue: ["Alpha"],
                  itemControl: {
                    defaultValue: "New label",
                    label: "Label",
                    type: "text",
                  },
                  minItems: 1,
                  target: "glyph.labels",
                  type: "collectionActions",
                },
              },
              title: "Glyph Labels",
            },
          ],
          title: "Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    fireEvent.click(screen.getByRole("button", { name: "Add Label" }));

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["glyph.labels"]).toEqual(["Alpha", "New label"]);
    expect(screen.getByDisplayValue("Alpha")).toBeTruthy();
    expect(screen.getByDisplayValue("New label")).toBeTruthy();
  });

  it("keeps a collection font picker color popover open while editing its color surface", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                textStyles: {
                  defaultValue: [
                    {
                      color: "#FFFFFF",
                      fontId: "inter",
                      fontSize: 16,
                      fontWeight: "400",
                      letterSpacing: "normal",
                      lineHeight: "normal",
                      opacity: 100,
                      textCase: "original",
                    },
                  ],
                  itemControl: {
                    defaultValue: {
                      color: "#FFFFFF",
                      fontId: "inter",
                      fontSize: 16,
                      fontWeight: "400",
                      letterSpacing: "normal",
                      lineHeight: "normal",
                      opacity: 100,
                      textCase: "original",
                    },
                    label: "Font",
                    type: "fontPicker",
                  },
                  label: "Text styles",
                  minItems: 1,
                  target: "text.styles",
                  type: "collectionActions",
                },
              },
              title: "Typography",
            },
          ],
          title: "Controls",
        },
      },
    });

    const { container } = renderControlsPanelWithSchema(schema);

    fireEvent.click(screen.getByRole("button", { name: "Pick Color" }));

    const surface = await waitFor(() => {
      const nextSurface = container.ownerDocument.body.querySelector<HTMLElement>(
        '[data-slot="style-guide-color-surface"]',
      );
      if (!nextSurface) {
        throw new Error("Expected color surface to be open.");
      }
      return nextSurface;
    });

    const surfaceRect = {
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => ({}),
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    } as DOMRect;
    Object.defineProperty(surface, "getBoundingClientRect", {
      configurable: true,
      value: () => surfaceRect,
    });

    fireEvent.pointerDown(surface, {
      buttons: 1,
      clientX: 72,
      clientY: 28,
      pointerId: 1,
    });

    expect(
      container.ownerDocument.body.querySelector('[data-slot="style-guide-color-surface"]'),
    ).toBeTruthy();

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["text.styles"][0].color).not.toBe("#FFFFFF");
  });

  it("commits canvas size controls to runtime state on blur or Enter", () => {
    const { container } = renderControlsPanel();

    const canvasSizeGroup = container.querySelector(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );

    expect(canvasSizeGroup).toBeTruthy();
    expect(canvasSizeGroup?.textContent).toContain("Canvas width");
    expect(canvasSizeGroup?.textContent).toContain("Canvas height");

    const widthInput = screen.getByDisplayValue("320") as HTMLInputElement;

    fireEvent.change(widthInput, { target: { value: "640" } });
    expect(screen.getByTestId("canvas-size").textContent).toBe("320,180");
    expect(widthInput.value).toBe("640");

    fireEvent.blur(widthInput);
    expect(screen.getByTestId("canvas-size").textContent).toBe("640,180");

    const heightInput = screen.getByDisplayValue("180") as HTMLInputElement;

    fireEvent.change(heightInput, { target: { value: "360" } });
    expect(screen.getByTestId("canvas-size").textContent).toBe("640,180");

    fireEvent.keyDown(heightInput, { code: "Enter", key: "Enter" });
    expect(screen.getByTestId("canvas-size").textContent).toBe("640,360");

    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));

    expect(screen.getByTestId("canvas-size").textContent).toBe("320,180");
  });

  it("renders editable-output aspect ratio controls with the current canvas preset", () => {
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 1080, unit: "px", width: 1440 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
      },
    });
    const { container } = renderControlsPanelWithSchema(schema);

    expect(screen.getByTestId("canvas-size").textContent).toBe("1440,1080");

    const aspectRatioControl = container.querySelector<HTMLElement>(
      '[data-slot="canvas-aspect-ratio-control"]',
    );

    expect(screen.getByText("Aspect ratio")).toBeTruthy();
    expect(aspectRatioControl?.textContent).toContain("4:3");
    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(values["canvas.aspectRatio"]).toEqual({
      height: 3,
      mode: "preset",
      value: "4:3",
      width: 4,
    });
    expect(values["canvas.size.width"]).toBe(1440);
    expect(values["canvas.size.height"]).toBe(1080);
  });

  it("switches editable-output aspect ratio to custom after manual size edits", () => {
    const schema = defineToolcraft({
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

    renderControlsPanelWithSchema(schema);

    const widthInput = screen.getByDisplayValue("1920") as HTMLInputElement;

    fireEvent.change(widthInput, { target: { value: "1600" } });
    fireEvent.blur(widthInput);

    expect(screen.getByTestId("canvas-size").textContent).toBe("1600,1080");
    expect(screen.getAllByText("Custom...").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("40")).toBeTruthy();
    expect(screen.getByDisplayValue("27")).toBeTruthy();
    expect(JSON.parse(screen.getByTestId("values-json").textContent ?? "{}")).toMatchObject({
      "canvas.aspectRatio": {
        height: 27,
        mode: "custom",
        value: "40:27",
        width: 40,
      },
      "canvas.size.height": 1080,
      "canvas.size.width": 1600,
    });
  });

  it("renders raster render scale as the last technical setup control", () => {
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
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
    renderControlsPanelWithSchema(schema);

    const values = JSON.parse(screen.getByTestId("values-json").textContent ?? "{}");

    expect(screen.getByText("Resolution scale")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(values["canvas.renderScale"]).toBe(2);
  });

  it("renders timeline extended mode as runtime panel state instead of product values", () => {
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
        size: { height: 1080, unit: "px", width: 1920 },
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

    renderControlsPanelWithSchema(schema, undefined, {
      timeline: { currentTimeSeconds: 2, expanded: true, isPlaying: true },
    });

    const setupText = screen.getByText("Timeline").closest("section")?.textContent ?? "";

    expect(setupText.indexOf("Resolution scale")).toBeLessThan(setupText.indexOf("Timeline"));
    const timelineField = screen.getByText("Timeline").closest('[role="group"]');
    const timelineSwitch = timelineField?.querySelector<HTMLElement>('[role="switch"]');

    expect(timelineSwitch?.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("timeline-panel-extended").textContent).toBe("undefined");
    expect(screen.getByTestId("timeline-panel-hidden").textContent).toBe("undefined");
    expect(screen.getByTestId("timeline-expanded").textContent).toBe("true");

    fireEvent.click(timelineSwitch as HTMLElement);

    expect(timelineSwitch?.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("timeline-panel-extended").textContent).toBe("true");
    expect(screen.getByTestId("timeline-panel-hidden").textContent).toBe("undefined");
    expect(screen.getByTestId("timeline-expanded").textContent).toBe("true");
    expect(JSON.parse(screen.getByTestId("values-json").textContent ?? "{}")).not.toHaveProperty(
      "panels.timeline.extended",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));

    expect(timelineSwitch?.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("timeline-panel-extended").textContent).toBe("true");
  });

  it("applies empty text input values while typing and reset restores defaults", () => {
    renderControlsPanel();

    const promptInput = screen.getByDisplayValue("Initial prompt") as HTMLInputElement;

    fireEvent.change(promptInput, { target: { value: "" } });
    expect(promptInput.value).toBe("");
    expect(screen.getByTestId("prompt-value").textContent).toBe("");

    fireEvent.change(promptInput, { target: { value: "Draft prompt" } });
    expect(screen.getByTestId("prompt-value").textContent).toBe("Draft prompt");

    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));

    expect(screen.getByDisplayValue("Initial prompt")).toBeTruthy();
    expect(screen.getByTestId("prompt-value").textContent).toBe("Initial prompt");
  });

  it("renders keyframe actions for timeline-expanded keyframe-capable controls", () => {
    renderControlsPanel(undefined, { timeline: { expanded: true, keyframeGroups: [] } });

    expect(screen.getByRole("button", { name: "Add Anchor keyframe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Opacity keyframe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Static opacity keyframe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Output Mix keyframe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Curves keyframe" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add Prompt keyframe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Blend keyframe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Channels keyframe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Enabled keyframe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Canvas width keyframe" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Add Opacity keyframe" })
        .closest("[data-control-field-label]"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Add Output Mix keyframe" })
        .closest("[data-control-field-label]"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Add Curves keyframe" })
        .closest("[data-control-field-label]"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add Opacity keyframe" }));

    expect(screen.getByTestId("timeline-expanded").textContent).toBe("true");
    const opacityKeyframeButton = screen.getByRole("button", {
      name: "Disable Opacity keyframes",
    });

    expect(opacityKeyframeButton.className).toContain(
      "!text-[color:var(--link)]",
    );
    expect(opacityKeyframeButton.className).toContain(
      "data-popup-open:!text-[color:var(--link)]",
    );
    expect(opacityKeyframeButton.className).toContain(
      "[&_svg]:!fill-[color:var(--link)]",
    );
    expect(opacityKeyframeButton.style.color).toBe("var(--link)");
    expect(screen.getByTestId("timeline-keyframes").textContent).toContain(
      '"controlId":"selectedLayer.opacity"',
    );
    expect(screen.getByTestId("timeline-keyframes").textContent).toContain(
      '"valueLabel":"75%"',
    );
    expect(screen.getByTestId("timeline-keyframes").textContent).toContain('"value":75');

    expect(screen.queryByRole("button", { name: "Add Prompt keyframe" })).toBeNull();
  });

  it("updates the selected control keyframe instead of the current playhead time", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                range: {
                  defaultValue: { end: "100%", start: "0%" },
                  label: "Range",
                  target: "shape.range",
                  type: "rangeInput",
                },
              },
            },
          ],
          title: "Controls",
        },
        timeline: true,
      },
    });

    renderControlsPanelWithSchema(schema, {}, {
      timeline: {
        currentTimeSeconds: 4,
        expanded: true,
        keyframeGroups: [
          {
            controlId: "shape.range",
            keyframes: [
              {
                controlId: "shape.range",
                controlLabel: "Range",
                id: "shape.range::2",
                timeSeconds: 2,
                value: { end: "100%", start: "0%" },
                valueLabel: "0% - 100%",
              },
            ],
            label: "Range",
          },
        ],
        selectedKeyframeId: "shape.range::2",
      },
    });

    fireEvent.change(screen.getByLabelText("Range start"), {
      target: { value: "25%" },
    });
    fireEvent.blur(screen.getByLabelText("Range start"));

    const keyframeGroups = JSON.parse(
      screen.getByTestId("timeline-keyframes").textContent ?? "[]",
    ) as Array<{
      keyframes: Array<{ id: string; timeSeconds: number; value: { end: string; start: string } }>;
    }>;

    expect(keyframeGroups[0]?.keyframes).toHaveLength(1);
    expect(keyframeGroups[0]?.keyframes[0]).toMatchObject({
      id: "shape.range::2",
      timeSeconds: 2,
      value: { end: "100%", start: "25%" },
    });
  });

  it("keeps keyframe actions hidden while the timeline is collapsed", () => {
    renderControlsPanel();

    expect(screen.getByTestId("timeline-expanded").textContent).toBe("false");
    expect(screen.queryByRole("button", { name: "Add Prompt keyframe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Opacity keyframe" })).toBeNull();
  });

  it("keeps keyframe actions hidden for playback-only timeline apps", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: createSchema().panels.controls,
        timeline: { mode: "playback" },
      },
    });

    renderControlsPanelWithSchema(schema, undefined, {
      timeline: { expanded: true, keyframeGroups: [] },
    });

    expect(screen.getByTestId("timeline-expanded").textContent).toBe("true");
    expect(screen.queryByRole("button", { name: "Add Prompt keyframe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Opacity keyframe" })).toBeNull();
  });

  it("suppresses control transitions when keyframe controls appear", async () => {
    const { container } = renderControlsPanel();
    const content = () =>
      container.querySelector('[data-slot="toolcraft-panel-content"]');

    await waitFor(() => {
      expect(content()?.getAttribute("data-toolcraft-controls-mounting")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Expand timeline" }));

    expect(content()?.getAttribute("data-toolcraft-controls-mounting")).toBe("true");
  });

  it("routes footer panel actions through the command bus", () => {
    renderControlsPanel();

    fireEvent.change(screen.getByDisplayValue("Initial prompt"), {
      target: { value: "Draft" },
    });
    fireEvent.blur(screen.getByDisplayValue("Draft"));
    expect(screen.getByTestId("prompt-value").textContent).toBe("Draft");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByTestId("prompt-value").textContent).toBe("Initial prompt");
  });

  it("routes app-specific footer panel actions through onPanelAction", () => {
    const handledActions: string[] = [];
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                footer: {
                  actions: [
                    {
                      icon: "download",
                      label: "Download image",
                      value: "download",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema, {
      onPanelAction: ({ action, state }) => {
        handledActions.push(`${action.value}:${state.schema.panels.controls?.title}`);
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Download image" }));

    expect(handledActions).toEqual(["download:Generation Controls"]);
  });

  it("renders runtime settings transfer as a headerless body section instead of sticky footer actions", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Initial prompt",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Prompt",
            },
            {
              actionGroup: "secondary",
              controls: {
                footer: {
                  actions: [
                    {
                      label: "Export PNG",
                      value: "export.png",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Generation Controls",
        },
      },
      settingsTransfer: true,
    });
    const { container } = renderControlsPanelWithSchema(schema);
    const scrollContent = container.querySelector(
      '[data-slot="toolcraft-panel-content"]',
    );
    const stickyFooter = container.querySelector(
      '[data-slot="toolcraft-panel-sticky-actions"]',
    );
    const firstSection = container.querySelector("section");
    const firstInlineGroup = firstSection?.querySelector(
      '[data-control-layout="inline"][data-control-layout-columns="2"]',
    );

    const transferButtons = screen
      .getAllByRole("button", { name: /Settings$/ })
      .map((button) => button.textContent);

    expect(transferButtons).toEqual(["Export Settings", "Import Settings"]);
    expect(schema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(
      [...container.querySelectorAll('[data-slot="panel-title"]')].map(
        (title) => title.textContent,
      ),
    ).not.toContain("Setup");
    expect(firstSection?.querySelector('[data-slot="panel-title"]')).toBeNull();
    expect(firstSection?.querySelector("[data-control-section-collapse-button]")).toBeNull();
    expect(firstSection?.querySelector('[data-slot="control-section-header"]')).toBeNull();
    expect(firstSection?.querySelector('[data-slot="panel-section-collapsible-body"]')).toBeNull();
    expect(firstSection?.getAttribute("data-collapsed")).toBeNull();
    expect(firstSection?.className).toContain("py-0");
    expect(firstSection?.querySelector("[data-control-list]")?.className).toContain("pt-2");
    expect(firstSection?.querySelector("[data-control-list]")?.className).toContain("pb-6");
    expect(firstInlineGroup?.textContent).toContain("Canvas width");
    expect(firstInlineGroup?.textContent).toContain("Canvas height");
    expect(firstSection?.textContent).toContain("Aspect ratio");
    expect(firstSection?.textContent).toContain("Canvas width");
    expect(firstSection?.textContent).toContain("Canvas height");
    expect(firstSection?.textContent).toContain("Export Settings");
    expect(firstSection?.textContent).toContain("Import Settings");
    expect((firstSection?.textContent ?? "").indexOf("Export Settings")).toBeLessThan(
      (firstSection?.textContent ?? "").indexOf("Import Settings"),
    );
    expect((firstSection?.textContent ?? "").indexOf("Import Settings")).toBeLessThan(
      (firstSection?.textContent ?? "").indexOf("Aspect ratio"),
    );
    expect((firstSection?.textContent ?? "").indexOf("Aspect ratio")).toBeLessThan(
      (firstSection?.textContent ?? "").indexOf("Canvas width"),
    );
    expect(scrollContent?.textContent).toContain("Import Settings");
    expect(scrollContent?.textContent).toContain("Export Settings");
    expect(stickyFooter?.textContent).toContain("Export PNG");
    expect(stickyFooter?.textContent).not.toContain("Import Settings");
  });

  it("keeps panelActions in the sticky footer even when the schema omits actionGroup", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
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
                  defaultValue: "Initial prompt",
                  label: "Prompt",
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Export",
            },
          ],
          title: "Generation Controls",
        },
      },
    });
    const { container } = renderControlsPanelWithSchema(schema);
    const stickyFooter = container.querySelector(
      '[data-slot="toolcraft-panel-sticky-actions"]',
    );
    const scrollContent = container.querySelector(
      '[data-slot="toolcraft-panel-content"]',
    );

    expect(stickyFooter?.textContent).toContain("Reset");
    expect(stickyFooter?.textContent).toContain("Apply");
    expect(stickyFooter?.className).toContain("before:h-px");
    expect(stickyFooter?.className).toContain("var(--accent)");
    expect(stickyFooter?.className).toContain(
      "before:scale-x-[var(--sticky-footer-progress,1)]",
    );
    expect(stickyFooter?.className).toContain("before:opacity-0");
    expect(stickyFooter?.className).toContain("before:transition-[opacity,transform]");
    expect(stickyFooter?.className).toContain(
      "data-[sticky-footer-active=true]:before:opacity-100",
    );
    expect(stickyFooter?.getAttribute("data-sticky-footer-active")).toBeNull();
    expect(stickyFooter?.querySelector('[data-toolcraft-section-actions]')).toBeTruthy();
    expect(stickyFooter?.querySelector('[data-slot="panel-title"]')).toBeNull();
    expect(stickyFooter?.querySelector("[data-control-section-collapse-button]")).toBeNull();
    expect(stickyFooter?.textContent).not.toContain("Export");
    expect(scrollContent?.textContent).toContain("Prompt");
    expect(scrollContent?.textContent).not.toContain("ResetApply");
  });

  it("renders titled body sections as 36px collapsible header rows", () => {
    const schema = createSchema();
    const { container } = renderControlsPanelWithSchema(schema);
    const basicTitle = screen.getByText("Basic");
    const header = basicTitle.closest('[data-slot="control-section-header"]');
    const section = basicTitle.closest("section");
    const controlList = section?.querySelector("[data-control-list]");
    const body = section?.querySelector('[data-slot="panel-section-collapsible-body"]');

    expect(header?.className).toContain("h-9");
    expect(header?.getAttribute("data-collapsible")).toBe("");
    expect(header?.getAttribute("aria-expanded")).toBe("true");
    expect(header?.getAttribute("role")).toBe("button");
    expect(body?.className).toContain("transition-[grid-template-rows,opacity]");
    expect(body?.className).toContain("grid-rows-[1fr]");
    expect(controlList?.className).toContain("pt-2");
    expect(controlList?.className).toContain("pb-6");
    expect(section?.textContent).toContain("Prompt");
    expect(section?.textContent).toContain("Opacity");

    fireEvent.click(header!);

    expect(section?.getAttribute("data-collapsed")).toBe("true");
    expect(header?.getAttribute("aria-expanded")).toBe("false");
    expect(body?.getAttribute("aria-hidden")).toBe("true");
    expect(body?.className).toContain("grid-rows-[0fr]");
    expect(section?.textContent).toContain("Basic");
    expect(section?.textContent).toContain("Prompt");

    fireEvent.transitionEnd(body!);

    expect(section?.textContent).not.toContain("Prompt");
    expect(section?.textContent).not.toContain("Opacity");

    fireEvent.keyDown(header!, { key: "Enter" });

    expect(section?.getAttribute("data-collapsed")).toBe("false");
    expect(header?.getAttribute("aria-expanded")).toBe("true");
    expect(section?.querySelector('[data-slot="panel-section-collapsible-body"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="control-section-header"]')).toBeTruthy();
  });

  it("suppresses child control transitions when a section re-expands", () => {
    const schema = createSchema();
    renderControlsPanelWithSchema(schema);
    const basicTitle = screen.getByText("Basic");
    const header = basicTitle.closest<HTMLElement>('[data-slot="control-section-header"]');
    const section = basicTitle.closest("section");
    const initialBody = section?.querySelector<HTMLElement>(
      '[data-slot="panel-section-collapsible-body"]',
    );

    fireEvent.click(header!);
    fireEvent.transitionEnd(initialBody!);
    fireEvent.click(header!);

    const expandedBody = section?.querySelector<HTMLElement>(
      '[data-slot="panel-section-collapsible-body"]',
    );
    const innerControls = expandedBody?.firstElementChild as HTMLElement | null;

    expect(expandedBody?.className).toContain("transition-[grid-template-rows,opacity]");
    expect(expandedBody?.className).toContain("grid-rows-[1fr]");
    expect(innerControls?.getAttribute("data-toolcraft-controls-mounting")).toBe("true");
  });

  it("persists ordinary section collapse state as a UI preference across remounts", () => {
    const schema = createSchema();
    const { unmount } = renderControlsPanelWithSchema(schema);
    const basicHeader = screen
      .getByText("Basic")
      .closest<HTMLElement>('[data-slot="control-section-header"]');

    fireEvent.click(basicHeader!);

    expect(basicHeader?.closest("section")?.getAttribute("data-collapsed")).toBe("true");

    unmount();
    cleanup();

    renderControlsPanelWithSchema(schema);

    const restoredSection = screen.getByText("Basic").closest("section");

    expect(restoredSection?.getAttribute("data-collapsed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));

    expect(screen.getByText("Basic").closest("section")?.getAttribute("data-collapsed")).toBe(
      "true",
    );
  });

  it("puts ordinary implicit panel section spacing on the control list layer", () => {
    const { container } = render(
      <Panel title="Master Controls">
        <FileDrop accept="PNG, JPEG" />
      </Panel>,
    );
    const section = container.querySelector("section");
    const controlList = section?.querySelector("[data-control-list]");

    expect(section?.className).toContain("py-0");
    expect(controlList?.className).toContain("pt-2");
    expect(controlList?.className).toContain("pb-6");
    expect(controlList?.textContent).toContain("Click to upload an image");
  });

  it("shows the sticky footer export indicator only while an async panel action is pending", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              actionGroup: "secondary",
              controls: {
                footer: {
                  actions: [
                    {
                      icon: "download-simple",
                      label: "Export PNG",
                      value: "export-png",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Generation Controls",
        },
      },
    });
    let resolveAction: (() => void) | undefined;
    const pendingAction = new Promise<void>((resolve) => {
      resolveAction = resolve;
    });
    let reportActionProgress: ((progress: number) => void) | undefined;
    const onPanelAction = vi.fn(({ reportProgress }) => {
      reportActionProgress = reportProgress;

      return pendingAction;
    });
    const { container } = renderControlsPanelWithSchema(schema, { onPanelAction });
    const stickyFooter = container.querySelector(
      '[data-slot="toolcraft-panel-sticky-actions"]',
    );
    const exportPngButton = screen.getByRole("button", { name: "Export PNG" });

    expect(stickyFooter?.getAttribute("data-sticky-footer-active")).toBeNull();
    expect(exportPngButton.querySelector('[data-icon-name="upload-simple"]')).toBeTruthy();

    fireEvent.click(exportPngButton);

    expect(onPanelAction).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(stickyFooter?.getAttribute("data-sticky-footer-active")).toBe("true");
    });
    expect(stickyFooter?.getAttribute("data-sticky-footer-progress")).toBeNull();

    act(() => {
      reportActionProgress?.(0.25);
    });

    await waitFor(() => {
      expect(stickyFooter?.getAttribute("data-sticky-footer-progress")).toBe("0.25");
      expect(
        (stickyFooter as HTMLElement | null)?.style.getPropertyValue(
          "--sticky-footer-progress",
        ),
      ).toBe("0.25");
    });

    act(() => {
      reportActionProgress?.(2);
    });

    await waitFor(() => {
      expect(stickyFooter?.getAttribute("data-sticky-footer-progress")).toBe("1");
    });

    await act(async () => {
      resolveAction?.();
      await pendingAction;
    });

    await waitFor(() => {
      expect(stickyFooter?.getAttribute("data-sticky-footer-active")).toBeNull();
    });
  });

  it("renders secondary footer actions as secondary buttons", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                footer: {
                  actions: [
                    {
                      label: "Copy PNG",
                      value: "copy",
                      variant: "secondary",
                    },
                    {
                      label: "Export PNG",
                      value: "export",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    expect(screen.getByRole("button", { name: "Copy PNG" }).getAttribute("data-variant")).toBe(
      "secondary",
    );
    expect(screen.getByRole("button", { name: "Export PNG" }).getAttribute("data-variant")).toBe(
      "default",
    );
  });

  it("spans the final odd footer action across the full action row", () => {
    const schema = defineToolcraft({
      canvas: { enabled: false },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                footer: {
                  actions: [
                    {
                      label: "Copy PNG",
                      value: "copy",
                      variant: "secondary",
                    },
                    {
                      label: "Export OG",
                      value: "export-og",
                      variant: "secondary",
                    },
                    {
                      label: "Export PNG",
                      value: "export",
                      variant: "default",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Generation Controls",
        },
      },
    });

    renderControlsPanelWithSchema(schema);

    const exportPngButton = screen.getByRole("button", { name: "Export PNG" });

    expect(exportPngButton.className).toContain("col-span-2");
  });

  it("uses the shared panel host when rendered as a floating panel", () => {
    const { container } = renderControlsPanel({ panelPlacement: "floating" });

    expect(container.querySelector('[data-panel-type="controls"]')).toBeTruthy();
    expect(container.querySelector('[data-snap-edges="left right"]')).toBeTruthy();
  });
});
