import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { CanvasShell } from "./canvas-shell";
import { ToolcraftRoot } from "./toolcraft-root";
import { TOOLCRAFT_THEME_PREFERENCE_STORAGE_KEY } from "./theme-runtime";
import { ToolbarPanel } from "./toolbar-panel";
import { useToolcraft } from "./use-toolcraft";

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  window.localStorage.clear();
});

function createSchema() {
  return defineToolcraft({
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
  });
}

function StateProbe() {
  const { dispatch, state } = useToolcraft();

  return (
    <>
      <button
        onClick={() =>
          dispatch({
            offset: { x: 24, y: 48 },
            type: "canvas.setOffset",
          })
        }
        type="button"
      >
        Move canvas
      </button>
      <button
        onClick={() =>
          dispatch({
            target: "selectedLayer.opacity",
            type: "controls.setValue",
            value: 25,
          })
        }
        type="button"
      >
        Change value
      </button>
      <span data-testid="canvas-offset">
        {state.canvas.offset.x},{state.canvas.offset.y}
      </span>
      <span data-testid="opacity-value">
        {String(state.values["selectedLayer.opacity"])}
      </span>
    </>
  );
}

function renderToolbar() {
  return render(
    <ToolcraftRoot schema={createSchema()}>
      <div style={{ height: 320, position: "relative", width: 640 }}>
        <CanvasShell />
        <ToolbarPanel framed={false} />
        <StateProbe />
      </div>
    </ToolcraftRoot>,
  );
}

describe("ToolbarPanel", () => {
  it("dispatches zoom commands", () => {
    renderToolbar();

    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("90%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("110%")).toBeTruthy();
  });

  it("resets zoom from the zoom label double click", () => {
    renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("110%")).toBeTruthy();

    fireEvent.doubleClick(screen.getByText("110%"));

    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("centers the canvas through the radar command", () => {
    renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Move canvas" }));
    expect(screen.getByTestId("canvas-offset").textContent).toBe("24,48");

    fireEvent.click(screen.getByRole("button", { name: "Center canvas" }));

    expect(screen.getByTestId("canvas-offset").textContent).toBe("0,0");
  });

  it("binds undo and redo to runtime history", () => {
    renderToolbar();

    const undoButton = screen.getByRole("button", { name: "Undo" });
    const redoButton = screen.getByRole("button", { name: "Redo" });

    expect((undoButton as HTMLButtonElement).disabled).toBe(true);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Change value" }));
    expect(screen.getByTestId("opacity-value").textContent).toBe("25");
    expect((undoButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(undoButton);
    expect(screen.getByTestId("opacity-value").textContent).toBe("75");
    expect((redoButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(redoButton);
    expect(screen.getByTestId("opacity-value").textContent).toBe("25");
  });

  it("toggles the scoped editor theme through the shared runtime", () => {
    const { container } = renderToolbar();

    const lightButton = screen.getByRole("button", { name: "Light theme" });
    const themeScope = container.querySelector<HTMLElement>(
      "[data-toolcraft-theme-scope]",
    );

    expect(lightButton.querySelector('[data-icon="theme-light"]')).toBeTruthy();
    expect(themeScope?.dataset.toolcraftTheme).toBe("dark");
    expect(themeScope?.style.colorScheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("");

    fireEvent.click(lightButton);

    expect(themeScope?.dataset.toolcraftTheme).toBe("light");
    expect(themeScope?.style.colorScheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("");
    expect(
      window.localStorage.getItem(TOOLCRAFT_THEME_PREFERENCE_STORAGE_KEY),
    ).toBe("light");
    expect(screen.getByRole("button", { name: "Dark theme" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Dark theme" })
        .querySelector('[data-icon="theme-dark"]'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(themeScope?.dataset.toolcraftTheme).toBe("dark");
    expect(themeScope?.style.colorScheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("");
    expect(
      window.localStorage.getItem(TOOLCRAFT_THEME_PREFERENCE_STORAGE_KEY),
    ).toBe("dark");
  });

  it("uses toolbar feature defaults from the app schema", () => {
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
    expect(screen.queryByRole("button", { name: "Center canvas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Light theme" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
  });
});
