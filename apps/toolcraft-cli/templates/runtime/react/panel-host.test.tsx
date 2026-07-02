import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { ToolcraftRoot } from "./toolcraft-root";
import { ToolcraftPanelHost, PanelHost } from "./panel-host";
import { useToolcraft } from "./use-toolcraft";

function PanelOffsetReader() {
  const { dispatch, state } = useToolcraft();

  return (
    <>
      <button
        onClick={() =>
          dispatch({
            offset: { x: 40, y: 80 },
            panelId: "toolbar",
            type: "panels.setOffset",
          })
        }
        type="button"
      >
        Move toolbar
      </button>
      <span data-testid="toolbar-offset">
        {state.panels.toolbar.offset.x},{state.panels.toolbar.offset.y}
      </span>
      <ToolcraftPanelHost panelType="toolbar">
        <div>Toolbar</div>
      </ToolcraftPanelHost>
    </>
  );
}

describe("PanelHost", () => {
  it("renders default placement attributes for a panel type", () => {
    const { container } = render(
      <PanelHost panelType="toolbar">
        <div>Toolbar</div>
      </PanelHost>,
    );

    const host = container.querySelector("[data-slot='toolcraft-runtime-panel-host']");

    expect(host?.getAttribute("data-panel-type")).toBe("toolbar");
    expect(host?.getAttribute("data-drag-mode")).toBe("panel");
    expect(host?.getAttribute("data-snap-edges")).toBe("top bottom");
  });

  it("resets a panel on double click", () => {
    const handleReset = vi.fn();
    const { container } = render(
      <PanelHost onResetPosition={handleReset} panelType="toolbar">
        <div>Toolbar</div>
      </PanelHost>,
    );

    const host = container.querySelector("[data-slot='toolcraft-runtime-panel-host']");

    expect(host).not.toBeNull();
    fireEvent.doubleClick(host as Element);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it("does not reset when double clicking an ignored child control", () => {
    const handleReset = vi.fn();
    render(
      <PanelHost onResetPosition={handleReset} panelType="toolbar">
        <button type="button">Zoom</button>
      </PanelHost>,
    );

    fireEvent.doubleClick(screen.getByRole("button", { name: "Zoom" }));

    expect(handleReset).not.toHaveBeenCalled();
  });

  it("lets the runtime reset stored panel offsets", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });
    const { container } = render(
      <ToolcraftRoot schema={schema}>
        <PanelOffsetReader />
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Move toolbar" }));
    expect(screen.getByTestId("toolbar-offset").textContent).toBe("40,80");

    const host = container.querySelector("[data-slot='toolcraft-runtime-panel-host']");

    expect(host).not.toBeNull();
    fireEvent.doubleClick(host as Element);

    expect(screen.getByTestId("toolbar-offset").textContent).toBe("0,0");
  });
});
