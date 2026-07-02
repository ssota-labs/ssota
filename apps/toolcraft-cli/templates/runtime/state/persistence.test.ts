import { describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { createToolcraftState } from "./create-template-state";
import {
  createToolcraftPersistenceSnapshot,
  mergeToolcraftInitialState,
  parseToolcraftPersistenceSnapshot,
} from "./persistence";

function createPersistentSchema() {
  return defineToolcraft({
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
              opacity: {
                defaultValue: 75,
                target: "selectedLayer.opacity",
                type: "slider",
              },
              prompt: {
                defaultValue: "Describe the effect",
                target: "generation.prompt",
                type: "text",
              },
            },
          },
        ],
        title: "Controls",
      },
      layers: true,
      timeline: { mode: "keyframes" },
    },
    persistence: {
      include: ["values", "canvas", "panels", "timeline", "layers"],
      key: "toolcraft:persistence-test:state:v1",
      storage: "localStorage",
      version: 1,
    },
  });
}

describe("Toolcraft template state persistence", () => {
  it("serializes only allowed runtime slices and schema control values", () => {
    const schema = createPersistentSchema();
    const state = createToolcraftState(schema, {
      canvas: {
        offset: { x: 12, y: -8 },
        zoom: 82,
      },
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
          dataUrl: "data:image/png;base64,AAAA",
          fileName: "source.png",
          id: "media-1",
          layerId: "layer-1",
          mimeType: "image/png",
          position: { x: 0, y: 0 },
          size: { height: 64, unit: "px", width: 64 },
        },
      ],
      panels: {
        controls: { offset: { x: 20, y: 10 } },
        timeline: { hidden: true },
      },
      selectedLayerId: "layer-1",
      timeline: {
        currentTimeSeconds: 2,
        durationSeconds: 10,
        expanded: true,
        keyframeGroups: [
          {
            controlId: "selectedLayer.opacity",
            keyframes: [
              {
                controlId: "selectedLayer.opacity",
                controlLabel: "Opacity",
                id: "keyframe-1",
                timeSeconds: 2,
                value: 75,
                valueLabel: "75%",
              },
            ],
            label: "Opacity",
          },
        ],
      },
      values: {
        "generation.prompt": "Persisted prompt",
        "legacy.target": "remove me",
        "selectedLayer.opacity": 42,
      },
    });

    const snapshot = createToolcraftPersistenceSnapshot(state, schema.persistence);

    expect(snapshot).toMatchObject({
      state: {
        canvas: {
          offset: { x: 12, y: -8 },
          size: { height: 720, unit: "px", width: 1280 },
          zoom: 82,
        },
        layers: [
          {
            id: "layer-1",
            name: "layer-1",
            visible: true,
          },
        ],
        panels: {
          controls: { offset: { x: 20, y: 10 } },
          timeline: { hidden: true },
        },
        selectedLayerId: "layer-1",
        timeline: {
          currentTimeSeconds: 2,
          durationSeconds: 10,
          expanded: true,
        },
        values: {
          "generation.prompt": "Persisted prompt",
          "selectedLayer.opacity": 42,
        },
      },
      version: 1,
    });
    expect(
      snapshot?.state.timeline?.keyframeGroups?.[0]?.keyframes[0]?.value,
    ).toBe(75);
    expect(snapshot?.state).not.toHaveProperty("mediaAssets");
    expect(snapshot?.state.values).not.toHaveProperty("legacy.target");
  });

  it("persists media state when the app opts into media persistence", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      media: {
        defaultAssets: [
          {
            dataUrl: "data:image/png;base64,AAAA",
            fileName: "background.png",
            id: "default-background",
            layerId: "default-background-layer",
            mimeType: "image/png",
            sourceTarget: "media.background",
          },
        ],
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                background: {
                  defaultValue: null,
                  target: "media.background",
                  type: "fileDrop",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
      persistence: {
        include: ["values", "panels", "media"],
        key: "toolcraft:media-persistence-test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });
    const state = createToolcraftState(schema, { mediaAssets: [] });
    const snapshot = createToolcraftPersistenceSnapshot(state, schema.persistence);
    const parsed = parseToolcraftPersistenceSnapshot(
      schema,
      JSON.stringify(snapshot),
    );

    expect(snapshot?.state.mediaAssets).toEqual([]);
    expect(parsed?.mediaAssets).toEqual([]);
    expect(createToolcraftState(schema, parsed).mediaAssets).toEqual([]);
  });

  it("parses matching versions and ignores stale targets or invalid versions", () => {
    const schema = createPersistentSchema();
    const rawValue = JSON.stringify({
      state: {
        panels: {
          timeline: { hidden: true },
        },
        values: {
          "generation.prompt": "Restored prompt",
          "legacy.target": "remove me",
          "selectedLayer.opacity": 55,
        },
      },
      version: 1,
    });

    expect(parseToolcraftPersistenceSnapshot(schema, rawValue)).toEqual({
      panels: {
        timeline: { hidden: true },
      },
      values: {
        "generation.prompt": "Restored prompt",
        "selectedLayer.opacity": 55,
      },
    });
    expect(
      parseToolcraftPersistenceSnapshot(
        schema,
        JSON.stringify({ state: { values: { "generation.prompt": "Old" } }, version: 2 }),
      ),
    ).toBeUndefined();
    expect(parseToolcraftPersistenceSnapshot(schema, "not json")).toBeUndefined();
  });

  it("lets explicit initial state override persisted state", () => {
    expect(
      mergeToolcraftInitialState(
        {
          canvas: {
            offset: { x: 10, y: 20 },
            zoom: 80,
          },
          panels: {
            controls: { offset: { x: 4, y: 8 } },
          },
          values: {
            "generation.prompt": "Persisted",
          },
        },
        {
          canvas: {
            zoom: 95,
          },
          panels: {
            controls: { collapsed: true },
          },
          values: {
            "generation.prompt": "Explicit",
          },
        },
      ),
    ).toEqual({
      canvas: {
        offset: { x: 10, y: 20 },
        zoom: 95,
      },
      panels: {
        controls: { collapsed: true, offset: { x: 4, y: 8 } },
      },
      values: {
        "generation.prompt": "Explicit",
      },
    });
  });
});
