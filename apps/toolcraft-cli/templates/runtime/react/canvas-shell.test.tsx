import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { CanvasShell } from "./canvas-shell";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraft } from "./use-toolcraft";

afterEach(() => {
  cleanup();
});

function createSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      size: { width: 300, height: 200, unit: "px" },
      upload: true,
    },
    panels: {},
  });
}

function createIntrinsicMediaSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      sizing: { mode: "intrinsic-media" },
      upload: true,
    },
    panels: {},
  });
}

function createUploadDefaultSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      upload: true,
    },
    panels: {},
  });
}

function CanvasStateProbe() {
  const { state } = useToolcraft();

  return (
    <>
      <span data-testid="canvas-offset">
        {state.canvas.offset.x},{state.canvas.offset.y}
      </span>
      <span data-testid="canvas-zoom">{state.canvas.zoom}</span>
      <span data-testid="media-count">{state.mediaAssets.length}</span>
      <span data-testid="media-size">
        {state.mediaAssets[0]?.size?.width ?? 0},{state.mediaAssets[0]?.size?.height ?? 0}
      </span>
      <span data-testid="media-targets">
        {state.mediaAssets.map((asset) => asset.sourceTarget ?? "none").join(",")}
      </span>
      <span data-testid="media-kinds">
        {state.mediaAssets.map((asset) => asset.assetKind ?? "image").join(",")}
      </span>
    </>
  );
}

describe("CanvasShell", () => {
  function mockCanvasRect(canvas: HTMLElement): void {
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      bottom: 600,
      height: 600,
      left: 0,
      right: 800,
      toJSON: () => ({}),
      top: 0,
      width: 800,
      x: 0,
      y: 0,
    });
  }

  it("renders the editable canvas at the schema size", () => {
    const { container } = render(
      <ToolcraftRoot schema={createSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    const editableCanvas = container.querySelector<HTMLElement>(
      "[data-toolcraft-editable-canvas]",
    );

    expect(editableCanvas?.style.width).toBe("300px");
    expect(editableCanvas?.style.height).toBe("200px");
  });

  it("does not render a fixed editable canvas for explicit intrinsic media sizing", () => {
    const { container } = render(
      <ToolcraftRoot schema={createIntrinsicMediaSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    expect(container.querySelector("[data-toolcraft-editable-canvas]")).toBeNull();
  });

  it("renders the canvas slot inside the editable canvas when custom app content is provided", () => {
    const { container } = render(
      <ToolcraftRoot schema={createUploadDefaultSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell>
            <div data-testid="custom-canvas-renderer" />
          </CanvasShell>
        </div>
      </ToolcraftRoot>,
    );

    const editableCanvas = container.querySelector<HTMLElement>(
      "[data-toolcraft-editable-canvas]",
    );
    const slot = container.querySelector<HTMLElement>(
      "[data-toolcraft-canvas-slot]",
    );

    expect(editableCanvas).toBeTruthy();
    expect(slot?.parentElement).toBe(editableCanvas);
    expect(screen.getByTestId("custom-canvas-renderer")).toBeTruthy();
  });

  it("does not render decorative canvas background dots", () => {
    const { container } = render(
      <ToolcraftRoot schema={createSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    const pattern = container.querySelector<HTMLElement>("[data-toolcraft-canvas-grid]");
    const world = container.querySelector<HTMLElement>("[data-toolcraft-canvas-world]");

    expect(world).toBeTruthy();
    expect(pattern).toBeNull();
  });

  it("moves and scales the canvas world without decorative background dots", () => {
    const { container } = render(
      <ToolcraftRoot
        initialState={{
          canvas: {
            offset: { x: 12, y: -8 },
            size: { height: 200, unit: "px", width: 300 },
            zoom: 150,
          },
        }}
        schema={createSchema()}
      >
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    const pattern = container.querySelector<HTMLElement>("[data-toolcraft-canvas-grid]");
    const world = container.querySelector<HTMLElement>("[data-toolcraft-canvas-world]");

    expect(pattern).toBeNull();
    expect(world?.style.transform).toBe("translate(-50%, -50%) translate(12px, -8px) scale(1.5)");
  });

  it("keeps minimum zoom world transform without decorative background dots", () => {
    const { container } = render(
      <ToolcraftRoot
        initialState={{
          canvas: {
            offset: { x: 3200, y: -2400 },
            size: { height: 200, unit: "px", width: 300 },
            zoom: 25,
          },
        }}
        schema={createSchema()}
      >
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    const pattern = container.querySelector<HTMLElement>("[data-toolcraft-canvas-grid]");
    const world = container.querySelector<HTMLElement>("[data-toolcraft-canvas-world]");

    expect(pattern).toBeNull();
    expect(world?.style.transform).toBe(
      "translate(-50%, -50%) translate(3200px, -2400px) scale(0.25)",
    );
  });

  it("updates runtime canvas offset while panning", () => {
    render(
      <ToolcraftRoot schema={createSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });

    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 25, clientY: 45, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(screen.getByTestId("canvas-offset").textContent).toBe("15,25");
  });

  it("pans the canvas from a two finger wheel gesture", async () => {
    render(
      <ToolcraftRoot schema={createSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 8,
      deltaY: -12,
    });

    expect(canvas.dispatchEvent(wheelEvent)).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(screen.getByTestId("canvas-offset").textContent).toBe("-8,12");
    });
    expect(screen.getByTestId("canvas-zoom").textContent).toBe("100");
  });

  it("zooms the canvas world from a trackpad pinch around the pointer", async () => {
    render(
      <ToolcraftRoot schema={createSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const world = canvas.querySelector("[data-toolcraft-canvas-world]") as HTMLElement;
    mockCanvasRect(canvas);

    expect(world.style.transform).toBe("translate(-50%, -50%) translate(0px, 0px) scale(1)");

    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 600,
      clientY: 300,
      ctrlKey: true,
      deltaY: -100,
    });

    expect(canvas.dispatchEvent(wheelEvent)).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(screen.getByTestId("canvas-zoom").textContent).toBe("150");
    });
    expect(world.style.transform).toContain("translate(-100px");
    expect(world.style.transform).toContain("scale(1.5)");
  });

  it("prevents panel pinch gestures without moving the canvas viewport", async () => {
    render(
      <ToolcraftRoot schema={createSchema()}>
        <div
          data-slot="toolcraft-runtime-app"
          style={{ height: 640, position: "relative", width: 640 }}
        >
          <CanvasShell />
          <button data-testid="panel-overlay" type="button">
            Panel overlay
          </button>
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const overlay = screen.getByTestId("panel-overlay");
    mockCanvasRect(canvas);

    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 600,
      clientY: 300,
      ctrlKey: true,
      deltaY: -100,
    });

    expect(overlay.dispatchEvent(wheelEvent)).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(screen.getByTestId("canvas-zoom").textContent).toBe("100");
    expect(screen.getByTestId("canvas-offset").textContent).toBe("0,0");
    expect(overlay.closest("[data-toolcraft-canvas-world]")).toBeNull();

    const scrollEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 80,
    });

    expect(overlay.dispatchEvent(scrollEvent)).toBe(true);
    expect(scrollEvent.defaultPrevented).toBe(false);
    expect(screen.getByTestId("canvas-zoom").textContent).toBe("100");
    expect(screen.getByTestId("canvas-offset").textContent).toBe("0,0");
  });

  it("prevents browser pinch zoom when canvas zoom is already clamped", () => {
    render(
      <ToolcraftRoot
        initialState={{
          canvas: {
            offset: { x: 0, y: 0 },
            size: { height: 200, unit: "px", width: 300 },
            zoom: 400,
          },
        }}
        schema={createSchema()}
      >
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    mockCanvasRect(canvas);

    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 600,
      clientY: 300,
      ctrlKey: true,
      deltaY: -100,
    });

    expect(canvas.dispatchEvent(wheelEvent)).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(screen.getByTestId("canvas-zoom").textContent).toBe("400");
    expect(screen.getByTestId("canvas-offset").textContent).toBe("0,0");
  });

  it("imports dropped images using editable canvas size", async () => {
    render(
      <ToolcraftRoot schema={createSchema()}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

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
      expect(screen.getByTestId("media-count").textContent).toBe("1");
    });

    expect(screen.getByTestId("media-size").textContent).toBe("300,200");
    expect(screen.getByRole("button", { name: "Select material.png" })).toBeTruthy();
  });

  it("routes canvas drops to image and file upload targets by asset kind", async () => {
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { width: 300, height: 200, unit: "px" },
        upload: true,
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                files: {
                  assetKind: "file",
                  label: "Files",
                  multiple: true,
                  target: "source.files",
                  type: "fileDrop",
                },
                image: {
                  label: "Image",
                  target: "source.image",
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

    render(
      <ToolcraftRoot schema={schema}>
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
          <CanvasStateProbe />
        </div>
      </ToolcraftRoot>,
    );

    const canvas = screen.getByRole("application", { name: "Canvas viewport" });
    const imageFile = new File(["image"], "material.png", { type: "image/png" });
    const textFile = new File(["notes"], "notes.txt", { type: "text/plain" });

    fireEvent.drop(canvas, {
      clientX: 0,
      clientY: 0,
      dataTransfer: {
        files: [imageFile, textFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("media-count").textContent).toBe("2");
    });

    expect(screen.getByTestId("media-targets").textContent?.split(",").sort()).toEqual([
      "source.files",
      "source.image",
    ]);
    expect(screen.getByTestId("media-kinds").textContent?.split(",").sort()).toEqual([
      "file",
      "image",
    ]);
    expect(screen.getByRole("button", { name: "Select material.png" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Select notes.txt" })).toBeNull();
  });

  it("hides media when a parent layer group is hidden", () => {
    render(
      <ToolcraftRoot
        initialState={{
          layers: [
            {
              collapsed: false,
              displayName: "Scene Group",
              id: "group-1",
              kind: "group",
              name: "scene-group",
              visible: false,
            },
            {
              displayName: "Layer 1",
              id: "layer-1",
              kind: "layer",
              name: "layer-1",
              parentGroupId: "group-1",
              visible: true,
            },
          ],
          mediaAssets: [
            {
              dataUrl: "data:image/png;base64,test",
              fileName: "material.png",
              id: "media-1",
              layerId: "layer-1",
              mimeType: "image/png",
              position: { x: 0, y: 0 },
              size: { height: 200, unit: "px", width: 300 },
            },
          ],
          selectedLayerId: "layer-1",
        }}
        schema={createSchema()}
      >
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    expect(screen.queryByRole("button", { name: "Select material.png" })).toBeNull();
  });

  it("renders uploaded canvas images with cover crop and runtime transforms", () => {
    render(
      <ToolcraftRoot
        initialState={{
          layers: [
            {
              displayName: "Layer 1",
              id: "layer-1",
              kind: "layer",
              name: "layer-1",
              visible: true,
            },
          ],
          mediaAssets: [
            {
              dataUrl: "data:image/png;base64,test",
              fileName: "material.png",
              id: "media-1",
              layerId: "layer-1",
              mimeType: "image/png",
              position: { x: 48, y: -24 },
              size: { height: 200, unit: "px", width: 300 },
              transform: { flipHorizontal: true, rotationDeg: 90 },
            },
          ],
          selectedLayerId: "layer-1",
        }}
        schema={createSchema()}
      >
        <div style={{ height: 640, position: "relative", width: 640 }}>
          <CanvasShell />
        </div>
      </ToolcraftRoot>,
    );

    const mediaButton = screen.getByRole("button", { name: "Select material.png" });
    const mediaImage = screen.getByRole("img", { name: "material.png" });

    expect(mediaButton.className).toContain("inset-0");
    expect(mediaImage.className).toContain("object-cover");
    expect(mediaImage.getAttribute("style")).toContain("rotate(90deg) scale(-1.5, 1.5)");
  });
});
