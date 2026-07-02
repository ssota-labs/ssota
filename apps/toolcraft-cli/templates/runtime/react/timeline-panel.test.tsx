import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { ToolcraftTimelinePanelSchema } from "../schema/types";
import type { ToolcraftInitialState } from "../state/types";
import { ToolcraftRoot } from "./toolcraft-root";
import { TimelinePanel } from "./timeline-panel";
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
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createSchema(timeline: ToolcraftTimelinePanelSchema = true) {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      timeline,
    },
  });
}

function StateProbe() {
  const { state } = useToolcraft();

  return (
    <>
      <span data-testid="timeline-playing">{String(state.timeline.isPlaying)}</span>
      <span data-testid="timeline-looping">{String(state.timeline.isLooping)}</span>
      <span data-testid="timeline-time">{String(state.timeline.currentTimeSeconds)}</span>
      <span data-testid="timeline-expanded">{String(state.timeline.expanded)}</span>
    </>
  );
}

function renderTimelinePanel(
  props: Partial<React.ComponentProps<typeof TimelinePanel>> = {},
  initialState?: ToolcraftInitialState,
  timeline?: ToolcraftTimelinePanelSchema,
) {
  return render(
    <ToolcraftRoot initialState={initialState} schema={createSchema(timeline)}>
      <TimelinePanel framed={false} {...props} />
      <StateProbe />
    </ToolcraftRoot>,
  );
}

function renderUploadDependentTimelinePanel(
  initialState?: ToolcraftInitialState,
) {
  const schema = defineToolcraft({
    canvas: {
      enabled: true,
      sizing: { mode: "intrinsic-media" },
      upload: true,
    },
    panels: {
      timeline: { mode: "playback" },
    },
  });

  return render(
    <ToolcraftRoot initialState={initialState} schema={schema}>
      <TimelinePanel framed={false} />
      <StateProbe />
    </ToolcraftRoot>,
  );
}

describe("TimelinePanel", () => {
  it("stays collapsed by default in the runtime contract", () => {
    renderTimelinePanel();

    expect(screen.getByTestId("timeline-expanded").textContent).toBe("false");
    expect(screen.getByText("Dur:")).toBeTruthy();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.queryByText("Add your first keyframe from the properties panel.")).toBeNull();
  });

  it("renders compact presentation as playback-only transport", () => {
    renderTimelinePanel({ variant: "compact" });

    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Disable loop" })).toBeNull();
    expect(screen.queryByText("Dur:")).toBeNull();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.queryByRole("slider", { name: "Playback position" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pause playback" }));

    expect(screen.getByTestId("timeline-playing").textContent).toBe("false");
  });

  it("renders timeline state and dispatches playback commands", () => {
    renderTimelinePanel();

    expect(screen.getByText("8s")).toBeTruthy();
    expect(screen.getByText("Dur:")).toBeTruthy();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.getByTestId("timeline-playing").textContent).toBe("true");
    expect(screen.getByTestId("timeline-looping").textContent).toBe("true");
    expect(screen.getByTestId("timeline-expanded").textContent).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Pause playback" }));
    expect(screen.getByTestId("timeline-playing").textContent).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Disable loop" }));
    expect(screen.getByTestId("timeline-looping").textContent).toBe("false");
  });

  it("keeps timeline playhead handles easy to grab without changing visual size", () => {
    const { container } = renderTimelinePanel();

    const compactHandle = container.querySelector<HTMLElement>(
      '[data-slot="timeline-playback-handle"]',
    );

    expect(compactHandle?.className).toContain("size-2");
    expect(compactHandle?.className).toContain("before:inset-[-4px]");

    fireEvent.click(screen.getByRole("button", { name: "Expand timeline panel" }));

    const expandedHitArea = container.querySelector<HTMLElement>(
      '[data-slot="timeline-expanded-playhead-hit-area"]',
    );
    const expandedHandle = container.querySelector<HTMLElement>(
      '[data-slot="timeline-expanded-playhead-handle"]',
    );

    expect(expandedHandle?.className).toContain("size-[9px]");
    expect(expandedHitArea?.getAttribute("style")).toContain("width: 15px;");
  });

  it("edits timeline duration from the highlighted duration value in collapsed and expanded states", () => {
    const { container } = renderTimelinePanel();

    const durationDisplay = container.querySelector<HTMLElement>(
      '[data-slot="timeline-duration-display"]',
    );

    expect(durationDisplay?.className).toContain("!cursor-text");
    expect(durationDisplay?.className).toContain("group-hover/timeline-panel-header:bg");
    expect(durationDisplay?.className).toContain("var(--foreground)_8%");
    expect(durationDisplay?.className).toContain("px-1");
    expect(container.querySelector('[data-slot="timeline-duration-edit-trigger"]')).toBeNull();
    expect(screen.queryByRole("textbox", { name: "timeline duration" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit timeline duration" }));

    const editor = screen.getByRole("textbox", { name: "timeline duration" });

    expect(editor.className).toContain("var(--foreground)_8%");
    expect(editor.className).toContain("px-1");
    expect(editor.className).toContain("!cursor-text");
    expect(screen.queryByRole("button", { name: "Edit timeline duration" })).toBeNull();

    editor.textContent = "12s";
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(screen.getByText("12s")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand timeline panel" }));

    const expandedDurationDisplay = container.querySelector<HTMLElement>(
      '[data-slot="timeline-duration-display"]',
    );

    expect(expandedDurationDisplay?.className).toContain("!cursor-text");
    expect(expandedDurationDisplay?.className).toContain("group-hover/timeline-panel-header:bg");
    expect(expandedDurationDisplay?.className).toContain("var(--foreground)_8%");

    fireEvent.click(screen.getByRole("button", { name: "Edit timeline duration" }));

    const expandedEditor = screen.getByRole("textbox", { name: "timeline duration" });

    expect(expandedEditor.className).toContain("var(--foreground)_8%");
    expect(expandedEditor.className).toContain("!cursor-text");
  });

  it("replays from the beginning when play is pressed at the non-looping end", () => {
    renderTimelinePanel(
      {},
      {
        timeline: {
          currentTimeSeconds: 8,
          isLooping: false,
          isPlaying: false,
        },
      },
      { mode: "playback" },
    );

    expect(screen.getByTestId("timeline-time").textContent).toBe("8");

    fireEvent.click(screen.getByRole("button", { name: "Play playback" }));

    expect(screen.getByTestId("timeline-time").textContent).toBe("0");
    expect(screen.getByTestId("timeline-playing").textContent).toBe("true");
  });

  it("persists expanded state in the shared runtime timeline", () => {
    renderTimelinePanel();

    fireEvent.click(screen.getByRole("button", { name: "Expand timeline panel" }));

    expect(screen.getByTestId("timeline-expanded").textContent).toBe("true");
    expect(screen.getByText("Duration:")).toBeTruthy();
    expect(screen.getByText("Add your first keyframe from the properties panel.")).toBeTruthy();
    expect(screen.queryByText("Dur:")).toBeNull();
  });

  it("renders playback-only timelines without an expanded keyframe editor", () => {
    const { container } = renderTimelinePanel(
      {},
      {
        timeline: {
          expanded: true,
          keyframeGroups: [
            {
              controlId: "selectedLayer.opacity",
              keyframes: [
                {
                  controlId: "selectedLayer.opacity",
                  controlLabel: "Opacity",
                  id: "selectedLayer.opacity::4",
                  timeSeconds: 4,
                  valueLabel: "75%",
                },
              ],
              label: "Opacity",
            },
          ],
        },
      },
      { mode: "playback" },
    );

    expect(screen.getByText("Dur:")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Expand timeline panel" })).toBeNull();
    expect(screen.queryByText("Duration:")).toBeNull();
    expect(screen.queryByText("Opacity")).toBeNull();
    expect(screen.queryByText("Add your first keyframe from the properties panel.")).toBeNull();
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
    expect(
      container.querySelector('[data-slot="timeline-panel"] > [data-panel-id="timeline"]')
        ?.className,
    ).toContain("pr-3");
  });

  it("keeps upload-dependent playback inert until source media exists", () => {
    renderUploadDependentTimelinePanel({
      timeline: {
        currentTimeSeconds: 4,
        isPlaying: true,
      },
    });

    const playButton = screen.getByRole("button", { name: "Play playback" });

    expect((playButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("timeline-playing").textContent).toBe("false");
    expect(screen.getByTestId("timeline-time").textContent).toBe("0");

    fireEvent.click(playButton);

    expect(screen.getByTestId("timeline-playing").textContent).toBe("false");
    expect(screen.getByTestId("timeline-time").textContent).toBe("0");
  });

  it("keeps upload-dependent playback available when source media exists", () => {
    renderUploadDependentTimelinePanel({
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

    expect(
      (screen.getByRole("button", { name: "Pause playback" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByTestId("timeline-playing").textContent).toBe("true");
  });

  it("delegates the whole timeline window size to motion during expand and collapse", () => {
    const { container } = renderTimelinePanel({ panelPlacement: "floating" });
    const timelinePanel = container.querySelector<HTMLElement>('[data-slot="timeline-panel"]');

    expect(timelinePanel?.style.width).toBe("256px");
    expect(timelinePanel?.style.height).toBe("36px");

    fireEvent.click(screen.getByRole("button", { name: "Expand timeline panel" }));

    expect(timelinePanel?.getAttribute("data-expanded-height")).toBe("110");

    fireEvent.click(screen.getByRole("button", { name: "Collapse timeline panel" }));

    expect(timelinePanel?.getAttribute("data-expanded-height")).toBeNull();
  });

  it("points the expand toggle down when collapsed and up when expanded", () => {
    const { container } = renderTimelinePanel();

    const getArrowIcon = () => container.querySelector('[data-slot="primitive-arrow-icon"]');

    expect(getArrowIcon()?.classList.contains("rotate-180")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Expand timeline panel" }));

    expect(getArrowIcon()?.classList.contains("rotate-180")).toBe(true);
  });

  it("uses the shared panel host when floating", () => {
    const { container } = renderTimelinePanel({ panelPlacement: "floating" });

    expect(container.querySelector('[data-panel-type="timeline"]')).toBeTruthy();
    expect(container.querySelector('[data-snap-edges="top bottom"]')).toBeTruthy();
  });

  it("moves the expanded floating timeline from the stable host position before narrowing", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.matches('[data-slot="toolcraft-runtime-app"]')) {
        return {
          bottom: 720,
          height: 720,
          left: 0,
          right: 960,
          toJSON: () => ({}),
          top: 0,
          width: 960,
          x: 0,
          y: 0,
        };
      }

      if (this.matches('[data-panel-type="controls"]')) {
        return {
          bottom: 560,
          height: 560,
          left: 10,
          right: 40,
          toJSON: () => ({}),
          top: 10,
          width: 30,
          x: 10,
          y: 10,
        };
      }

      if (this.matches('[data-panel-type="layers"]')) {
        return {
          bottom: 560,
          height: 560,
          left: 760,
          right: 950,
          toJSON: () => ({}),
          top: 10,
          width: 190,
          x: 760,
          y: 10,
        };
      }

      if (
        this.matches('[data-slot="toolcraft-runtime-panel-host"]') &&
        this.matches('[data-panel-type="timeline"]')
      ) {
        return {
          bottom: 128,
          height: 118,
          left: 136,
          right: 824,
          toJSON: () => ({}),
          top: 10,
          width: 688,
          x: 136,
          y: 10,
        };
      }

      if (this.matches('[data-slot="timeline-panel"]')) {
        return {
          bottom: 128,
          height: 118,
          left: 99,
          right: 787,
          toJSON: () => ({}),
          top: 10,
          width: 688,
          x: 99,
          y: 10,
        };
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      };
    });

    const { container } = render(
      <ToolcraftRoot
        initialState={{ timeline: { expanded: true } }}
        schema={createSchema()}
      >
        <div data-slot="toolcraft-runtime-app">
          <div data-panel-type="controls" />
          <div data-panel-type="layers" />
          <TimelinePanel framed={false} panelPlacement="floating" />
        </div>
      </ToolcraftRoot>,
    );

    const timelinePanel = container.querySelector<HTMLElement>('[data-slot="timeline-panel"]');

    await waitFor(() => {
      expect(timelinePanel?.getAttribute("data-responsive-offset-x")).toBe("-74");
      expect(timelinePanel?.getAttribute("data-responsive-width")).toBeNull();
    });
  });

  it("narrows expanded floating timeline after it reaches both side panels", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.matches('[data-slot="toolcraft-runtime-app"]')) {
        return {
          bottom: 720,
          height: 720,
          left: 0,
          right: 960,
          toJSON: () => ({}),
          top: 0,
          width: 960,
          x: 0,
          y: 0,
        };
      }

      if (this.matches('[data-panel-type="layers"]')) {
        return {
          bottom: 560,
          height: 560,
          left: 10,
          right: 250,
          toJSON: () => ({}),
          top: 10,
          width: 240,
          x: 10,
          y: 10,
        };
      }

      if (this.matches('[data-panel-type="controls"]')) {
        return {
          bottom: 560,
          height: 560,
          left: 650,
          right: 950,
          toJSON: () => ({}),
          top: 10,
          width: 300,
          x: 650,
          y: 10,
        };
      }

      if (this.matches('[data-slot="timeline-panel"]')) {
        return {
          bottom: 128,
          height: 118,
          left: 136,
          right: 824,
          toJSON: () => ({}),
          top: 10,
          width: 688,
          x: 136,
          y: 10,
        };
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      };
    });

    const { container } = render(
      <ToolcraftRoot
        initialState={{ timeline: { expanded: true } }}
        schema={createSchema()}
      >
        <div data-slot="toolcraft-runtime-app">
          <div data-panel-type="layers" />
          <div data-panel-type="controls" />
          <TimelinePanel framed={false} panelPlacement="floating" />
        </div>
      </ToolcraftRoot>,
    );

    const timelinePanel = container.querySelector<HTMLElement>('[data-slot="timeline-panel"]');

    await waitFor(() => {
      expect(timelinePanel?.getAttribute("data-responsive-offset-x")).toBe("-30");
      expect(timelinePanel?.getAttribute("data-responsive-width")).toBe("380");
    });
  });

  it("keeps the expanded floating timeline inside the side-panel corridor immediately after resize", async () => {
    let isNarrow = false;

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.matches('[data-slot="toolcraft-runtime-app"]')) {
        return {
          bottom: 720,
          height: 720,
          left: 0,
          right: isNarrow ? 1024 : 1440,
          toJSON: () => ({}),
          top: 0,
          width: isNarrow ? 1024 : 1440,
          x: 0,
          y: 0,
        };
      }

      if (this.matches('[data-panel-type="layers"]')) {
        return {
          bottom: 560,
          height: 560,
          left: 10,
          right: 250,
          toJSON: () => ({}),
          top: 10,
          width: 240,
          x: 10,
          y: 10,
        };
      }

      if (this.matches('[data-panel-type="controls"]')) {
        return {
          bottom: 560,
          height: 560,
          left: isNarrow ? 714 : 1130,
          right: isNarrow ? 1014 : 1430,
          toJSON: () => ({}),
          top: 10,
          width: 300,
          x: isNarrow ? 714 : 1130,
          y: 10,
        };
      }

      if (
        this.matches('[data-slot="toolcraft-runtime-panel-host"]') &&
        this.matches('[data-panel-type="timeline"]')
      ) {
        return {
          bottom: 128,
          height: 118,
          left: isNarrow ? 384 : 592,
          right: isNarrow ? 640 : 848,
          toJSON: () => ({}),
          top: 10,
          width: 256,
          x: isNarrow ? 384 : 592,
          y: 10,
        };
      }

      if (this.matches('[data-slot="timeline-panel"]')) {
        return {
          bottom: 128,
          height: 118,
          left: isNarrow ? 384 : 592,
          right: isNarrow ? 640 : 848,
          toJSON: () => ({}),
          top: 10,
          width: 256,
          x: isNarrow ? 384 : 592,
          y: 10,
        };
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      };
    });

    const { container } = render(
      <ToolcraftRoot
        initialState={{ timeline: { expanded: true } }}
        schema={createSchema()}
      >
        <div data-slot="toolcraft-runtime-app">
          <div data-panel-type="layers" />
          <div data-panel-type="controls" />
          <TimelinePanel framed={false} panelPlacement="floating" />
        </div>
      </ToolcraftRoot>,
    );

    const timelinePanel = container.querySelector<HTMLElement>('[data-slot="timeline-panel"]');

    await waitFor(() => {
      expect(timelinePanel?.getAttribute("data-responsive-width")).toBeNull();
      expect(timelinePanel?.getAttribute("data-responsive-offset-x")).toBeNull();
    });

    isNarrow = true;
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(timelinePanel?.getAttribute("data-responsive-width")).toBe("444");
      expect(timelinePanel?.getAttribute("data-responsive-offset-x")).toBe("-30");
    });
  });

  it("keeps the selected keyframe row highlighted", () => {
    const selectedKeyframeId = "selectedLayer.opacity::4";
    const { container } = renderTimelinePanel(
      {},
      {
        timeline: {
          expanded: true,
          keyframeGroups: [
            {
              controlId: "selectedLayer.opacity",
              keyframes: [
                {
                  controlId: "selectedLayer.opacity",
                  controlLabel: "Opacity",
                  id: selectedKeyframeId,
                  timeSeconds: 4,
                  valueLabel: "75%",
                },
              ],
              label: "Opacity",
            },
          ],
          selectedKeyframeId,
        },
      },
    );

    expect(container.querySelector('[data-slot="timeline-keyframe-row"]')?.className).toContain(
      "bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)]",
    );
  });

  it("pauses playback when dragging a keyframe", () => {
    const keyframeId = "selectedLayer.opacity::4";
    const { container } = renderTimelinePanel(
      {},
      {
        timeline: {
          expanded: true,
          isPlaying: true,
          keyframeGroups: [
            {
              controlId: "selectedLayer.opacity",
              keyframes: [
                {
                  controlId: "selectedLayer.opacity",
                  controlLabel: "Opacity",
                  id: keyframeId,
                  timeSeconds: 4,
                  valueLabel: "75%",
                },
              ],
              label: "Opacity",
            },
          ],
        },
      },
    );
    const track = container.querySelector<HTMLElement>('[data-slot="timeline-keyframe-track"]');
    const keyframeButton = screen.getByRole("button", { name: "Opacity keyframe at 4.00s" });

    expect(track).toBeTruthy();
    expect(screen.getByTestId("timeline-playing").textContent).toBe("true");

    fireEvent.pointerDown(keyframeButton, {
      button: 0,
      clientX: 100,
      clientY: 12,
      pointerId: 1,
    });
    fireEvent.pointerMove(keyframeButton, {
      clientX: 100,
      clientY: 400,
      pointerId: 1,
    });

    expect(screen.getByTestId("timeline-playing").textContent).toBe("false");
  });
});
