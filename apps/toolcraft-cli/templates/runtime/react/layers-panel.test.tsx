import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { ToolcraftLayer, ToolcraftMediaAsset } from "../state/types";
import { ToolcraftRoot } from "./toolcraft-root";
import { LayersPanel } from "./layers-panel";
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
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  window.localStorage.clear();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "elementFromPoint");
});

function createSchema() {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      layers: true,
    },
  });
}

const seededLayers: ToolcraftLayer[] = [
  {
    collapsed: false,
    displayName: "Scene Group",
    id: "group-1",
    kind: "group" as const,
    name: "scene-group",
    visible: true,
  },
  {
    displayName: "Layer 1",
    id: "layer-1",
    kind: "layer" as const,
    name: "layer-1",
    parentGroupId: "group-1",
    visible: true,
  },
  {
    displayName: "Layer 2",
    id: "layer-2",
    kind: "layer" as const,
    name: "layer-2",
    visible: true,
  },
];

function StateProbe() {
  const { state } = useToolcraft();

  return (
    <>
      <span data-testid="selected-layer">{state.selectedLayerId}</span>
      <span data-testid="layer-count">{state.layers.length}</span>
      <span data-testid="layer-1-visible">
        {String(state.layers.find((layer) => layer.id === "layer-1")?.visible)}
      </span>
      <span data-testid="group-collapsed">
        {String(state.layers.find((layer) => layer.id === "group-1")?.collapsed)}
      </span>
      <span data-testid="layer-tree">
        {state.layers
          .map((layer) => `${layer.id}:${layer.parentGroupId ?? "root"}`)
          .join("|")}
      </span>
    </>
  );
}

function renderLayersPanel(
  props: Partial<React.ComponentProps<typeof LayersPanel>> = {},
  layers = seededLayers,
  mediaAssets: ToolcraftMediaAsset[] = [
    {
      dataUrl: "data:image/png;base64,test",
      fileName: "layer-1.png",
      id: "media-1",
      layerId: "layer-1",
      mimeType: "image/png",
      position: { x: 0, y: 0 },
      size: { height: 768, unit: "px", width: 1024 },
    },
  ],
) {
  return render(
    <ToolcraftRoot
      initialState={{
        layers,
        mediaAssets,
        selectedLayerId: "layer-1",
      }}
      schema={createSchema()}
    >
      <LayersPanel framed={false} {...props} />
      <StateProbe />
    </ToolcraftRoot>,
  );
}

describe("LayersPanel", () => {
  it("renders grouped runtime layers", () => {
    const { container } = renderLayersPanel();

    expect(screen.getByText("Layers")).toBeTruthy();
    expect(screen.getByText("Scene Group")).toBeTruthy();
    expect(screen.getByText("Layer 1")).toBeTruthy();
    expect(screen.getByText("Layer 2")).toBeTruthy();
    expect(container.querySelector('[data-layer-row-icon="image"]')).toBeTruthy();
  });

  it("selects and toggles visible layers through runtime state", () => {
    const { container } = renderLayersPanel();

    fireEvent.click(screen.getByRole("option", { name: "Layer 2" }));
    expect(screen.getByTestId("selected-layer").textContent).toBe("layer-2");

    fireEvent.click(screen.getByRole("button", { name: "Hide Layer 1" }));
    expect(screen.getByTestId("layer-1-visible").textContent).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Show Layer 1" }));
    expect(screen.getByTestId("layer-1-visible").textContent).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Hide Scene Group" }));

    expect(container.querySelector('[data-layer-id="group-1"]')?.getAttribute("data-visible")).toBe(
      "false",
    );
    expect(container.querySelector('[data-layer-id="layer-1"]')?.getAttribute("data-visible")).toBe(
      "false",
    );
    expect(
      container
        .querySelector('[data-layer-id="group-1"] [data-layer-row-icon="group"]')
        ?.getAttribute("class"),
    ).toContain("opacity-30");
    expect(
      container
        .querySelector('[data-layer-id="group-1"] [data-layer-row-icon="group"]')
        ?.getAttribute("class"),
    ).not.toContain("opacity-60");
    expect(
      container
        .querySelector('[data-layer-id="group-1"] [data-layer-row-icon="group"]')
        ?.getAttribute("class"),
    ).not.toContain("group-hover/layer-row-icon-hit:opacity-100");
    expect(
      container
        .querySelector('[data-layer-id="layer-1"] [data-layer-row-icon="image"]')
        ?.getAttribute("class"),
    ).toContain("opacity-30");
    expect(
      container
        .querySelector('[data-layer-id="layer-1"] [data-layer-row-icon="image"]')
        ?.getAttribute("class"),
    ).not.toContain("opacity-60");
    expect(
      container.querySelector('[data-layer-id="layer-1"] [data-layer-actions]')?.getAttribute(
        "data-visible",
      ),
    ).toBe("false");
    expect(
      container
        .querySelector('[data-layer-id="layer-1"] [aria-label="Hide Layer 1"] svg')
        ?.getAttribute("style"),
    ).toContain("opacity: 0.3");
  });

  it("dims all nested descendant icons when a parent group is hidden", () => {
    const nestedLayers: ToolcraftLayer[] = [
      {
        collapsed: false,
        displayName: "Scene Group",
        id: "group-1",
        kind: "group",
        name: "scene-group",
        visible: true,
      },
      {
        collapsed: false,
        displayName: "Nested Group",
        id: "group-2",
        kind: "group",
        name: "nested-group",
        parentGroupId: "group-1",
        visible: true,
      },
      {
        displayName: "Layer 1",
        id: "layer-1",
        kind: "layer",
        name: "layer-1",
        parentGroupId: "group-2",
        visible: true,
      },
    ];
    const { container } = renderLayersPanel({}, nestedLayers, []);

    fireEvent.click(screen.getByRole("button", { name: "Hide Scene Group" }));

    expect(container.querySelector('[data-layer-id="group-2"]')?.getAttribute("data-visible")).toBe(
      "false",
    );
    expect(container.querySelector('[data-layer-id="layer-1"]')?.getAttribute("data-visible")).toBe(
      "false",
    );
    expect(
      container
        .querySelector('[data-layer-id="group-2"] [data-layer-row-icon="group"]')
        ?.getAttribute("class"),
    ).toContain("opacity-30");
    expect(
      container
        .querySelector('[data-layer-id="layer-1"] [data-layer-row-icon="layer"]')
        ?.getAttribute("class"),
    ).toContain("opacity-30");
  });

  it("renames layers on double click", () => {
    renderLayersPanel();

    fireEvent.doubleClick(screen.getByRole("option", { name: "Layer 1" }));
    const input = screen.getByLabelText("Layer name for Layer 1");

    fireEvent.change(input, { target: { value: "Updated Layer" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("Updated Layer")).toBeTruthy();
  });

  it("adds and deletes layers", () => {
    renderLayersPanel({ groupCreation: false });

    fireEvent.click(screen.getByRole("button", { name: "Add layer" }));
    expect(screen.getByTestId("layer-count").textContent).toBe("4");
    expect(screen.getByText("Layer 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete Layer 3" }));
    expect(screen.getByTestId("layer-count").textContent).toBe("3");
  });

  it("drags layers into groups and keeps the moved layer under the group", () => {
    const { container } = renderLayersPanel();
    const groupRow = container.querySelector<HTMLElement>('[data-layer-id="group-1"]');
    const layerRow = container.querySelector<HTMLElement>('[data-layer-id="layer-2"]');

    expect(groupRow).toBeTruthy();
    expect(layerRow).toBeTruthy();

    vi.spyOn(groupRow as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 32,
      height: 32,
      left: 0,
      right: 240,
      toJSON: () => ({}),
      top: 0,
      width: 240,
      x: 0,
      y: 0,
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => groupRow),
    });

    fireEvent.pointerDown(layerRow as HTMLElement, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(layerRow as HTMLElement, {
      clientX: 12,
      clientY: 16,
      pointerId: 1,
    });
    fireEvent.pointerUp(layerRow as HTMLElement, { pointerId: 1 });

    expect(screen.getByTestId("layer-tree").textContent).toBe(
      "group-1:root|layer-2:group-1|layer-1:group-1",
    );
  });

  it("opens closed groups after dropping a layer into them", () => {
    const collapsedLayers = [
      { ...seededLayers[0]!, collapsed: true },
      seededLayers[1]!,
      seededLayers[2]!,
    ];
    const { container } = renderLayersPanel({}, collapsedLayers);
    const groupRow = container.querySelector<HTMLElement>('[data-layer-id="group-1"]');
    const layerRow = container.querySelector<HTMLElement>('[data-layer-id="layer-2"]');

    expect(groupRow).toBeTruthy();
    expect(layerRow).toBeTruthy();
    expect(screen.queryByText("Layer 1")).toBeNull();

    vi.spyOn(groupRow as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 32,
      height: 32,
      left: 0,
      right: 240,
      toJSON: () => ({}),
      top: 0,
      width: 240,
      x: 0,
      y: 0,
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => groupRow),
    });

    fireEvent.pointerDown(layerRow as HTMLElement, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(layerRow as HTMLElement, {
      clientX: 12,
      clientY: 16,
      pointerId: 1,
    });
    fireEvent.pointerUp(layerRow as HTMLElement, { pointerId: 1 });

    expect(screen.getByTestId("group-collapsed").textContent).toBe("false");
    expect(screen.getByTestId("layer-tree").textContent).toBe(
      "group-1:root|layer-2:group-1|layer-1:group-1",
    );
    expect(screen.getByText("Layer 1")).toBeTruthy();
  });

  it("highlights group targets and suppresses ordinary row hover during drag", () => {
    const layers = [
      ...seededLayers,
      {
        displayName: "Layer 3",
        id: "layer-3",
        kind: "layer" as const,
        name: "layer-3",
        visible: true,
      },
    ];
    const { container } = renderLayersPanel({}, layers);
    const groupRow = container.querySelector<HTMLElement>('[data-layer-id="group-1"]');
    const dragRow = container.querySelector<HTMLElement>('[data-layer-id="layer-2"]');
    const idleRow = container.querySelector<HTMLElement>('[data-layer-id="layer-3"]');

    expect(groupRow).toBeTruthy();
    expect(dragRow).toBeTruthy();
    expect(idleRow).toBeTruthy();

    vi.spyOn(groupRow as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 32,
      height: 32,
      left: 0,
      right: 240,
      toJSON: () => ({}),
      top: 0,
      width: 240,
      x: 0,
      y: 0,
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => groupRow),
    });

    fireEvent.pointerDown(dragRow as HTMLElement, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(dragRow as HTMLElement, {
      clientX: 12,
      clientY: 16,
      pointerId: 1,
    });

    const groupSurface = groupRow?.querySelector<HTMLElement>('[data-layer-row-surface]');
    const idleSurface = idleRow?.querySelector<HTMLElement>('[data-layer-row-surface]');
    const idleActions = idleRow?.querySelector<HTMLElement>("[data-layer-actions]");

    expect(groupSurface?.className).toContain("border-[color:var(--accent)]");
    expect(groupRow?.dataset.dropTarget).toBe("true");
    expect(groupRow?.dataset.reorderDragging).toBe("true");
    expect(idleRow?.dataset.reorderDragging).toBe("true");
    expect(groupSurface?.className).toContain(
      "bg-[color:color-mix(in_oklab,var(--accent)_15%,transparent)]",
    );
    expect(idleSurface?.className).not.toContain("hover:bg");
    expect(idleActions?.className).not.toContain("group-hover/layer");
  });

  it("uses pointer depth to drag layers out of nested groups", () => {
    const nestedLayers = [
      seededLayers[0],
      seededLayers[1],
      { ...seededLayers[2], parentGroupId: "group-1" },
      {
        displayName: "Layer 3",
        id: "layer-3",
        kind: "layer" as const,
        name: "layer-3",
        visible: true,
      },
    ];
    const { container } = renderLayersPanel({}, nestedLayers);
    const sourceRow = container.querySelector<HTMLElement>('[data-layer-id="layer-1"]');
    const targetRow = container.querySelector<HTMLElement>('[data-layer-id="layer-2"]');

    expect(sourceRow).toBeTruthy();
    expect(targetRow).toBeTruthy();

    vi.spyOn(targetRow as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 64,
      height: 32,
      left: 0,
      right: 240,
      toJSON: () => ({}),
      top: 32,
      width: 240,
      x: 0,
      y: 32,
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => targetRow),
    });

    fireEvent.pointerDown(sourceRow as HTMLElement, {
      button: 0,
      clientX: 40,
      clientY: 16,
      pointerId: 1,
    });
    fireEvent.pointerMove(sourceRow as HTMLElement, {
      clientX: 0,
      clientY: 60,
      pointerId: 1,
    });
    fireEvent.pointerUp(sourceRow as HTMLElement, { pointerId: 1 });

    expect(screen.getByTestId("layer-tree").textContent).toBe(
      "group-1:root|layer-2:group-1|layer-1:root|layer-3:root",
    );
  });

  it("collapses groups and uses the shared panel host when floating", () => {
    const { container } = renderLayersPanel({ panelPlacement: "floating" });

    expect(container.querySelector('[data-panel-type="layers"]')).toBeTruthy();
    expect(container.querySelector('[data-snap-edges="left right"]')).toBeTruthy();

    const groupToggle = container.querySelector('[data-layer-row-icon-hit-area="group"]');

    expect(groupToggle).toBeTruthy();
    fireEvent.click(groupToggle as Element);

    expect(screen.getByTestId("group-collapsed").textContent).toBe("true");
    expect(screen.queryByText("Layer 1")).toBeNull();
  });
});
