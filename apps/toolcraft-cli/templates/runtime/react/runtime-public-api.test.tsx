import type * as React from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { CanvasShell } from "./canvas-shell";
import { ControlsPanel } from "./controls-panel";
import { ToolcraftApp } from "./toolcraft-app";
import { ToolcraftRoot } from "./toolcraft-root";
import { LayersPanel } from "./layers-panel";
import { PanelContainer, PanelHost, PanelStage } from "./panel-host";
import { TimelinePanel } from "./timeline-panel";
import { ToolbarPanel } from "./toolbar-panel";

const runtimePublicApiSchema = defineToolcraft({
  canvas: { enabled: true },
  panels: {},
});

describe("Toolcraft template runtime public API", () => {
  it("keeps app assembly props narrow", () => {
    expectTypeOf<
      keyof React.ComponentProps<typeof ToolcraftApp>
    >().toEqualTypeOf<
      | "canvasContent"
      | "className"
      | "controlRenderers"
      | "onPanelAction"
      | "renderDefaultCanvasMedia"
      | "schema"
      | "style"
    >();
    expectTypeOf<
      keyof React.ComponentProps<typeof ToolcraftRoot>
    >().toEqualTypeOf<"children" | "initialState" | "schema">();
  });

  it("keeps runtime panel props focused on host integration", () => {
    type RuntimePanelKeys =
      | "className"
      | "framed"
      | "onPanelStateChange"
      | "panelPlacement"
      | "panelState";
    type ControlsPanelKeys = RuntimePanelKeys | "controlRenderers" | "onPanelAction";

    expectTypeOf<
      keyof React.ComponentProps<typeof ControlsPanel>
    >().toEqualTypeOf<ControlsPanelKeys>();
    expectTypeOf<
      keyof React.ComponentProps<typeof TimelinePanel>
    >().toEqualTypeOf<RuntimePanelKeys | "defaultExpanded" | "variant">();
    expectTypeOf<
      keyof React.ComponentProps<typeof ToolbarPanel>
    >().toEqualTypeOf<RuntimePanelKeys>();
    expectTypeOf<
      keyof React.ComponentProps<typeof LayersPanel>
    >().toEqualTypeOf<RuntimePanelKeys | "groupCreation">();
  });

  it("keeps shell and panel host props separate", () => {
    expectTypeOf<
      keyof React.ComponentProps<typeof CanvasShell>
    >().toEqualTypeOf<"children" | "renderDefaultMedia">();
    expectTypeOf<React.ComponentProps<typeof PanelHost>>().toHaveProperty(
      "panelType",
    );
    expectTypeOf<React.ComponentProps<typeof PanelContainer>>().toHaveProperty(
      "placement",
    );
    expectTypeOf<React.ComponentProps<typeof PanelStage>>().toHaveProperty(
      "children",
    );
  });

  it("rejects hidden runtime wiring props at compile time", () => {
    expect(<ToolcraftApp schema={runtimePublicApiSchema} />).toBeTruthy();
    expect(<CanvasShell />).toBeTruthy();
    expect(<ToolbarPanel />).toBeTruthy();

    const appWithInitialStateProps: React.ComponentProps<
      typeof ToolcraftApp
    > = {
      // @ts-expect-error Runtime state seeding belongs to ToolcraftRoot, not the app shell.
      initialState: {},
      schema: runtimePublicApiSchema,
    };
    const appWithChildrenProps: React.ComponentProps<typeof ToolcraftApp> =
      {
        // @ts-expect-error ToolcraftApp is assembled from schema and does not accept children.
        children: "Child",
        schema: runtimePublicApiSchema,
      };
    const appWithToolbarThemeToggleProps: React.ComponentProps<
      typeof ToolcraftApp
    > = {
      schema: runtimePublicApiSchema,
      // @ts-expect-error Toolbar theme visibility belongs to schema.toolbar.theme.
      toolbarThemeToggle: false,
    };
    const appWithCanvasSlotProps: React.ComponentProps<typeof ToolcraftApp> =
      {
        canvasContent: <div />,
        onPanelAction: ({ action }) => {
          void action.value;
        },
        renderDefaultCanvasMedia: false,
        schema: runtimePublicApiSchema,
      };
    const canvasWithSlotProps: React.ComponentProps<typeof CanvasShell> = {
      children: <div />,
      renderDefaultMedia: false,
    };
    // @ts-expect-error Canvas upload belongs to schema.canvas.upload.
    const canvasWithUpload = <CanvasShell upload />;
    // @ts-expect-error CanvasShell is a runtime-owned shell, not a styled wrapper.
    const styledCanvas = <CanvasShell className="custom" />;
    // @ts-expect-error Toolbar history visibility belongs to schema.toolbar.history.
    const toolbarWithHistory = <ToolbarPanel history />;
    // @ts-expect-error Toolbar theme visibility belongs to schema.toolbar.theme.
    const toolbarWithThemeToggle = <ToolbarPanel themeToggle={false} />;

    expect(appWithInitialStateProps).toBeTruthy();
    expect(appWithChildrenProps).toBeTruthy();
    expect(appWithToolbarThemeToggleProps).toBeTruthy();
    expect(appWithCanvasSlotProps).toBeTruthy();
    expect(canvasWithSlotProps).toBeTruthy();
    expect(canvasWithUpload).toBeTruthy();
    expect(styledCanvas).toBeTruthy();
    expect(toolbarWithHistory).toBeTruthy();
    expect(toolbarWithThemeToggle).toBeTruthy();
  });
});
