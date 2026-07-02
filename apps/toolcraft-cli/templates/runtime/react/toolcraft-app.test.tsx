import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { ToolcraftCustomControlRendererProps } from "./control-renderers";
import { ToolcraftApp } from "./toolcraft-app";
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
    window.setTimeout(
      () => callback(performance.now()),
      16,
    )) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame ??= ((handle: number) =>
    window.clearTimeout(handle)) as typeof window.cancelAnimationFrame;
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  window.localStorage.clear();
});

function createSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      size: { height: 180, unit: "px", width: 320 },
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
            },
            title: "Basic",
          },
        ],
        title: "Controls",
      },
      layers: true,
      timeline: true,
    },
  });
}

function createCustomControlSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      size: { height: 180, unit: "px", width: 320 },
    },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              power: {
                defaultValue: 10,
                label: "Power",
                target: "generation.power",
                type: "customPower",
              },
            },
            title: "Custom",
          },
        ],
        title: "Controls",
      },
    },
  });
}

function CanvasSlotProbe(): React.JSX.Element {
  const { state } = useToolcraft();

  return (
    <span data-testid="canvas-slot-probe">
      {state.canvas.size.width}:{state.mediaAssets.length}
    </span>
  );
}

function CustomValueProbe(): React.JSX.Element {
  const { state } = useToolcraft();

  return (
    <span data-testid="custom-value-probe">
      {String(state.values["generation.power"])}
    </span>
  );
}

function TimelineTimeProbe(): React.JSX.Element {
  const { state } = useToolcraft();

  return (
    <span data-testid="timeline-time">
      {state.timeline.currentTimeSeconds.toFixed(3)}
    </span>
  );
}

describe("ToolcraftApp", () => {
  it("renders enabled runtime surfaces from the app schema", () => {
    const { container } = render(<ToolcraftApp schema={createSchema()} />);

    expect(
      screen.getByRole("application", { name: "Canvas viewport" }),
    ).toBeTruthy();
    expect(screen.getByText("Controls")).toBeTruthy();
    expect(screen.getByText("Layers")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
    expect(
      container.querySelector('[data-toolcraft-timeline-panel-variant="compact"]'),
    ).toBeTruthy();
    expect(screen.queryByText("Dur:")).toBeNull();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Redo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Center canvas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Light theme" })).toBeTruthy();
    expect(
      container.querySelector('[data-slot="toolcraft-runtime-app"]'),
    ).toBeTruthy();
    expect(
      container.querySelector<HTMLElement>('[data-slot="toolcraft-runtime-app"]')
        ?.style.minWidth,
    ).toBe("1024px");
    expect(
      container.querySelector('[data-panel-type="controls"]'),
    ).toBeTruthy();
    expect(container.querySelector('[data-panel-type="layers"]')).toBeTruthy();
    expect(
      container.querySelector('[data-panel-type="timeline"]'),
    ).toBeTruthy();
    expect(container.querySelector('[data-panel-type="toolbar"]')).toBeTruthy();
  });

  it("switches the timeline panel between compact and extended through the runtime setup toggle", () => {
    const { container } = render(<ToolcraftApp schema={createSchema()} />);

    expect(container.querySelector('[data-panel-type="timeline"]')).toBeTruthy();
    expect(
      container.querySelector('[data-toolcraft-timeline-panel-variant="compact"]'),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
    expect(screen.queryByText("Dur:")).toBeNull();

    const timelineField = screen.getByText("Timeline").closest('[role="group"]');
    const timelineSwitch = timelineField?.querySelector<HTMLElement>('[role="switch"]');

    expect(timelineSwitch?.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(timelineSwitch as HTMLElement);

    expect(container.querySelector('[data-panel-type="timeline"]')).toBeTruthy();
    expect(
      container.querySelector('[data-toolcraft-timeline-panel-variant="extended"]'),
    ).toBeTruthy();
    expect(container.querySelector('[data-toolcraft-timeline-panel-hidden="true"]')).toBeNull();
    expect(screen.getByText("Dur:")).toBeTruthy();
    expect(screen.getByText(/\d+(?:\.\d+)? \/ 8s/)).toBeTruthy();
    expect(timelineSwitch?.getAttribute("aria-checked")).toBe("true");
  });

  it("keeps timeline playback running while the panel is hidden", () => {
    vi.useFakeTimers();
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 180, unit: "px", width: 320 },
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
        timeline: { mode: "playback" },
      },
      persistence: {
        include: ["panels", "timeline"],
        key: "toolcraft:timeline-hidden-test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });

    window.localStorage.setItem(
      "toolcraft:timeline-hidden-test:state:v1",
      JSON.stringify({
        state: {
          panels: {
            timeline: { hidden: true },
          },
          timeline: {
            currentTimeSeconds: 0,
            durationSeconds: 8,
            expanded: false,
            isLooping: true,
            isPlaying: true,
          },
        },
        version: 1,
      }),
    );

    const { container } = render(
      <ToolcraftApp canvasContent={<TimelineTimeProbe />} schema={schema} />,
    );

    expect(
      container.querySelector('[data-toolcraft-timeline-panel-hidden="true"]'),
    ).toBeTruthy();
    expect(screen.getByTestId("timeline-time").textContent).toBe("0.000");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(Number(screen.getByTestId("timeline-time").textContent)).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("does not render disabled optional panels or toolbar features", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
      toolbar: {
        history: false,
        radar: false,
        theme: false,
        zoom: false,
      },
    });
    const { container } = render(<ToolcraftApp schema={schema} />);

    expect(
      screen.getByRole("application", { name: "Canvas viewport" }),
    ).toBeTruthy();
    expect(screen.queryByText("Controls")).toBeNull();
    expect(screen.queryByText("Layers")).toBeNull();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.queryByText("Dur:")).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Center canvas" })).toBeNull();
    expect(container.querySelector('[data-panel-type="toolbar"]')).toBeNull();
  });

  it("renders app-specific canvas content inside the shared runtime canvas slot", () => {
    const { container } = render(
      <ToolcraftApp
        canvasContent={<CanvasSlotProbe />}
        renderDefaultCanvasMedia={false}
        schema={createSchema()}
      />,
    );

    const editableCanvas = container.querySelector<HTMLElement>(
      "[data-toolcraft-editable-canvas]",
    );
    const canvasSlot = container.querySelector<HTMLElement>(
      "[data-toolcraft-canvas-slot]",
    );

    expect(editableCanvas).toBeTruthy();
    expect(canvasSlot?.parentElement).toBe(editableCanvas);
    expect(screen.getByTestId("canvas-slot-probe").textContent).toBe("320:0");
  });

  it("lets app-specific canvas renderers replace default media rendering while keeping upload state", async () => {
    render(
      <ToolcraftApp
        canvasContent={<CanvasSlotProbe />}
        renderDefaultCanvasMedia={false}
        schema={createSchema()}
      />,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const file = new File(["image"], "shader-input.png", {
      type: "image/png",
    });

    fireEvent.drop(canvas, {
      clientX: 0,
      clientY: 0,
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("canvas-slot-probe").textContent).toBe("320:1");
    });
    expect(
      screen.queryByRole("button", { name: "Select shader-input.png" }),
    ).toBeNull();
  });

  it("preserves reset, upload, and toolbar history without manual shell wiring", async () => {
    render(<ToolcraftApp schema={createSchema()} />);

    fireEvent.change(screen.getByDisplayValue("Initial prompt"), {
      target: { value: "Updated prompt" },
    });
    expect(screen.getByDisplayValue("Updated prompt")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset controls" }));
    expect(screen.getByDisplayValue("Initial prompt")).toBeTruthy();

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

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      screen.queryByRole("button", { name: "Select material.png" }),
    ).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("routes app-specific sticky footer actions from the assembled app shell", () => {
    const handledActions: string[] = [];
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                footer: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export image",
                      value: "export",
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
          title: "Controls",
        },
      },
    });

    render(
      <ToolcraftApp
        onPanelAction={({ action }) => {
          handledActions.push(action.value);
        }}
        schema={schema}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export image" }));

    expect(handledActions).toEqual(["export"]);
  });

  it("renders registered custom controls through the shared runtime setter", async () => {
    function CustomPowerControl({
      name,
      setValue,
      value,
    }: ToolcraftCustomControlRendererProps): React.JSX.Element {
      return (
        <button type="button" onClick={() => setValue(42)}>
          {name}: {String(value)}
        </button>
      );
    }

    render(
      <ToolcraftApp
        canvasContent={<CustomValueProbe />}
        controlRenderers={{
          customPower: CustomPowerControl,
        }}
        schema={createCustomControlSchema()}
      />,
    );

    expect(screen.getByRole("button", { name: "Power: 10" })).toBeTruthy();
    expect(screen.getByTestId("custom-value-probe").textContent).toBe("10");

    fireEvent.click(screen.getByRole("button", { name: "Power: 10" }));

    await waitFor(() => {
      expect(screen.getByTestId("custom-value-probe").textContent).toBe("42");
    });
  });
});
