import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { ToolcraftApp } from "./toolcraft-app";
import { ToolcraftRoot } from "./toolcraft-root";
import { LayersPanel } from "./layers-panel";
import { TimelinePanel } from "./timeline-panel";
import { ToolbarPanel } from "./toolbar-panel";

declare module "vitest" {
  interface Assertion<T = any> {
    toBeDisabled(): void;
  }
}

expect.extend({
  toBeDisabled(received: HTMLElement) {
    const pass =
      received.matches(":disabled") ||
      received.getAttribute("aria-disabled") === "true";

    return {
      message: () => `expected element ${pass ? "not " : ""}to be disabled`,
      pass,
    };
  },
});

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
});

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  window.localStorage.clear();
});

function createAssembledSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      size: { height: 180, unit: "px", width: 320 },
      sizing: { mode: "editable-output" },
      upload: true,
    },
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
              opacity: {
                defaultValue: 75,
                label: "Opacity",
                max: 100,
                min: 0,
                target: "selectedLayer.opacity",
                type: "slider",
                unit: "%",
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
        title: "Master Controls",
      },
      layers: true,
      timeline: true,
    },
  });
}

function renderAssembledEditor() {
  return render(
    <ToolcraftApp
      schema={createAssembledSchema()}
      style={{ height: 720, width: 960 }}
    />,
  );
}

describe("assembled Toolcraft template runtime", () => {
  it("imports media into shared runtime state and lets toolbar history undo and redo it", async () => {
    const { container } = renderAssembledEditor();

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const file = new File(["image"], "material.png", { type: "image/png" });

    fireEvent.drop(canvas, {
      clientX: 0,
      clientY: 0,
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Select material.png" }),
      ).toBeTruthy();
    });

    expect(
      container.querySelector<HTMLElement>(
        "[data-toolcraft-editable-canvas]",
      )?.style.width,
    ).toBe("320px");
    expect(
      (screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      screen.queryByRole("button", { name: "Select material.png" }),
    ).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));

    expect(
      screen.getByRole("button", { name: "Select material.png" }),
    ).toBeTruthy();
  });

  it("renders optional layers and timeline panels only when enabled by schema", () => {
    renderAssembledEditor();

    expect(screen.getByText("Layers")).toBeTruthy();
    const timelineField = screen.getByText("Timeline").closest('[role="group"]');
    const timelineSwitch = timelineField?.querySelector<HTMLElement>('[role="switch"]');

    fireEvent.click(timelineSwitch as HTMLElement);
    fireEvent.click(
      screen.getByRole("button", { name: "Expand timeline panel" }),
    );
    expect(screen.getByText("Duration:")).toBeTruthy();
    expect(
      screen.getByText("Add your first keyframe from the properties panel."),
    ).toBeTruthy();

    cleanup();

    render(
      <ToolcraftRoot
        schema={defineToolcraft({
          canvas: { enabled: true },
          panels: {},
        })}
      >
        <LayersPanel framed={false} />
        <TimelinePanel framed={false} />
      </ToolcraftRoot>,
    );

    expect(screen.queryByText("Layers")).toBeNull();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.queryByText("Dur:")).toBeNull();
  });

  it("uses schema-disabled toolbar features in assembled apps", () => {
    render(
      <ToolcraftRoot
        schema={defineToolcraft({
          canvas: { enabled: true },
          panels: {},
          toolbar: {
            history: false,
            radar: false,
            theme: false,
            zoom: false,
          },
        })}
      >
        <ToolbarPanel framed={false} />
      </ToolcraftRoot>,
    );

    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Redo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Center canvas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Light theme" })).toBeNull();
    expect(screen.queryByText("70%")).toBeNull();
  });

  it("keeps schema-only apps wired through the full shared runtime base", async () => {
    const { container } = renderAssembledEditor();

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const world = container.querySelector<HTMLElement>(
      "[data-toolcraft-canvas-world]",
    );
    const grid = container.querySelector("[data-toolcraft-canvas-grid]");
    const themeScope = container.querySelector<HTMLElement>(
      "[data-toolcraft-theme-scope]",
    );
    const toolbar = container.querySelector<HTMLElement>(
      "[data-toolcraft-inspect-toolbar]",
    );

    expect(canvas).toBeTruthy();
    expect(world).toBeTruthy();
    expect(grid).toBeNull();
    expect(
      container.querySelector<HTMLElement>(
        "[data-toolcraft-editable-canvas]",
      )?.style.width,
    ).toBe("320px");
    expect(screen.getByText("Master Controls")).toBeTruthy();
    expect(screen.getByText("Layers")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
    expect(screen.queryByText("Dur:")).toBeNull();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(toolbar?.textContent).toContain("100%");
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(themeScope?.dataset.toolcraftTheme).toBe("dark");

    const canvasWidthInput = screen.getByDisplayValue("320");

    fireEvent.change(canvasWidthInput, {
      target: { value: "384" },
    });
    expect(
      container.querySelector<HTMLElement>(
        "[data-toolcraft-editable-canvas]",
      )?.style.width,
    ).toBe("320px");

    fireEvent.blur(canvasWidthInput);
    expect(
      container.querySelector<HTMLElement>(
        "[data-toolcraft-editable-canvas]",
      )?.style.width,
    ).toBe("384px");

    fireEvent.change(screen.getByDisplayValue("Initial prompt"), {
      target: { value: "Updated prompt" },
    });
    expect(screen.getByDisplayValue("Updated prompt")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByDisplayValue("Initial prompt")).toBeTruthy();
    expect(
      container.querySelector<HTMLElement>(
        "[data-toolcraft-editable-canvas]",
      )?.style.width,
    ).toBe("320px");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("110%")).toBeTruthy();

    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 20,
      deltaY: -10,
    });
    expect(canvas.dispatchEvent(wheelEvent)).toBe(false);
    await waitFor(() => {
      expect(world?.style.transform).toContain("translate(-20px, 10px)");
    });

    fireEvent.click(screen.getByRole("button", { name: "Center canvas" }));
    expect(world?.style.transform).toContain("translate(0px, 0px)");

    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    expect(themeScope?.dataset.toolcraftTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    const file = new File(["image"], "ready.png", { type: "image/png" });
    fireEvent.drop(canvas, {
      clientX: 0,
      clientY: 0,
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Select ready.png" }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();

    const timelineField = screen.getByText("Timeline").closest('[role="group"]');
    const timelineSwitch = timelineField?.querySelector<HTMLElement>('[role="switch"]');
    fireEvent.click(timelineSwitch as HTMLElement);
    fireEvent.click(
      screen.getByRole("button", { name: "Expand timeline panel" }),
    );
    expect(screen.getByText("Duration:")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add Opacity keyframe" }),
    ).toBeTruthy();
  });
});
