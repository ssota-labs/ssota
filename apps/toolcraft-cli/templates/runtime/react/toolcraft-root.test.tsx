import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraft } from "./use-toolcraft";

const previousToolcraftNamespace = ["creative", "apps", "kit"].join("-");

function Probe() {
  const { dispatch, state } = useToolcraft();

  return (
    <button
      type="button"
      onClick={() =>
        dispatch({
          target: "selectedLayer.opacity",
          type: "controls.setValue",
          value: 50,
        })
      }
    >
      {String(state.values["selectedLayer.opacity"])}
    </button>
  );
}

function ResetProbe() {
  const { dispatch, state } = useToolcraft();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          dispatch({
            target: "selectedLayer.opacity",
            type: "controls.setValue",
            value: 50,
          })
        }
      >
        {String(state.values["selectedLayer.opacity"])}
      </button>
      <button type="button" onClick={() => dispatch({ type: "controls.reset" })}>
        Reset
      </button>
    </div>
  );
}

function PanelPersistenceProbe() {
  const { dispatch, state } = useToolcraft();

  return (
    <button
      type="button"
      onClick={() =>
        dispatch({
          offset: { x: 72, y: -24 },
          panelId: "controls",
          type: "panels.setOffset",
        })
      }
    >
      {state.panels.controls.offset.x},{state.panels.controls.offset.y}
    </button>
  );
}

function createPersistentSchema() {
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
    persistence: {
      include: ["values", "panels"],
      key: "toolcraft:root-test:state:v1",
      storage: "localStorage",
      version: 1,
    },
  });
}

function createHistorySchema(history = true) {
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
    toolbar: { history },
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ToolcraftRoot", () => {
  it("provides editor state and dispatch to children", async () => {
    render(
      <ToolcraftRoot
        schema={defineToolcraft({
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
        })}
      >
        <Probe />
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "75" }));

    expect(await screen.findByRole("button", { name: "50" })).toBeTruthy();
  });

  it("restores persisted values before first render", () => {
    const schema = createPersistentSchema();

    window.localStorage.setItem(
      "toolcraft:root-test:state:v1",
      JSON.stringify({
        state: { values: { "selectedLayer.opacity": 33 } },
        version: 1,
      }),
    );

    render(
      <ToolcraftRoot schema={schema}>
        <Probe />
      </ToolcraftRoot>,
    );

    expect(screen.getByRole("button", { name: "33" })).toBeTruthy();
  });

  it("migrates persisted values from the previous storage namespace", () => {
    const schema = createPersistentSchema();
    const previousStorageKey = `${previousToolcraftNamespace}:root-test:state:v1`;

    window.localStorage.setItem(
      previousStorageKey,
      JSON.stringify({
        state: { values: { "selectedLayer.opacity": 44 } },
        version: 1,
      }),
    );

    render(
      <ToolcraftRoot schema={schema}>
        <Probe />
      </ToolcraftRoot>,
    );

    expect(screen.getByRole("button", { name: "44" })).toBeTruthy();
    expect(window.localStorage.getItem("toolcraft:root-test:state:v1")).toBe(
      JSON.stringify({
        state: { values: { "selectedLayer.opacity": 44 } },
        version: 1,
      }),
    );
    expect(window.localStorage.getItem(previousStorageKey)).toBeNull();
  });

  it("persists runtime values and reset results through schema policy", async () => {
    const schema = createPersistentSchema();

    render(
      <ToolcraftRoot schema={schema}>
        <ResetProbe />
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "75" }));

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem("toolcraft:root-test:state:v1") ?? "{}"),
      ).toMatchObject({
        state: { values: { "selectedLayer.opacity": 50 } },
        version: 1,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem("toolcraft:root-test:state:v1") ?? "{}"),
      ).toMatchObject({
        state: { values: { "selectedLayer.opacity": 75 } },
        version: 1,
      });
    });
  });

  it("restores dragged panel offsets from the app persistence policy before first render", async () => {
    const schema = createPersistentSchema();
    const firstRender = render(
      <ToolcraftRoot schema={schema}>
        <PanelPersistenceProbe />
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "0,0" }));

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem("toolcraft:root-test:state:v1") ?? "{}"),
      ).toMatchObject({
        state: { panels: { controls: { offset: { x: 72, y: -24 } } } },
        version: 1,
      });
    });

    firstRender.unmount();

    render(
      <ToolcraftRoot schema={schema}>
        <PanelPersistenceProbe />
      </ToolcraftRoot>,
    );

    expect(screen.getByRole("button", { name: "72,-24" })).toBeTruthy();
  });

  it("binds runtime undo and redo to keyboard shortcuts when history is enabled", async () => {
    render(
      <ToolcraftRoot schema={createHistorySchema()}>
        <Probe />
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "75" }));
    expect(await screen.findByRole("button", { name: "50" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "z", metaKey: true });
    expect(screen.getByRole("button", { name: "75" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "z", metaKey: true, shiftKey: true });
    expect(screen.getByRole("button", { name: "50" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    expect(screen.getByRole("button", { name: "75" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "y", ctrlKey: true });
    expect(screen.getByRole("button", { name: "50" })).toBeTruthy();
  });

  it("does not hijack undo shortcuts while the user is typing into editable controls", async () => {
    render(
      <ToolcraftRoot schema={createHistorySchema()}>
        <div>
          <Probe />
          <input aria-label="Text value" defaultValue="hello" />
          <span
            aria-label="Editable value"
            contentEditable
            role="textbox"
            suppressContentEditableWarning
          >
            editable
          </span>
        </div>
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "75" }));
    expect(await screen.findByRole("button", { name: "50" })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Text value" }), {
      key: "z",
      metaKey: true,
    });
    expect(screen.getByRole("button", { name: "50" })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Editable value" }), {
      key: "z",
      metaKey: true,
    });
    expect(screen.getByRole("button", { name: "50" })).toBeTruthy();
  });

  it("does not register history shortcuts when toolbar history is disabled", async () => {
    render(
      <ToolcraftRoot schema={createHistorySchema(false)}>
        <Probe />
      </ToolcraftRoot>,
    );

    fireEvent.click(screen.getByRole("button", { name: "75" }));
    expect(await screen.findByRole("button", { name: "50" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "z", metaKey: true });
    expect(screen.getByRole("button", { name: "50" })).toBeTruthy();
  });
});
