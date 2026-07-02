import { describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import { createToolcraftState } from "../state/create-template-state";
import { toolcraftReducer } from "../state/reducer";
import type { ToolcraftCommand, ToolcraftState } from "../state/types";
import {
  applyToolcraftSettingsPayload,
  createToolcraftSettingsPayload,
  parseToolcraftSettingsPayload,
} from "./settings-transfer";

function createSettingsSchema() {
  return defineToolcraft({
    canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
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
                target: "style.opacity",
                type: "slider",
              },
            },
            title: "Generation",
          },
        ],
        title: "Settings Test",
      },
      timeline: { mode: "playback" },
    },
    settingsTransfer: {
      appId: "Settings Test",
      enabled: true,
    },
  });
}

function reduceWithCommands(
  initialState: ToolcraftState,
  run: (dispatch: (command: ToolcraftCommand) => void) => void,
): ToolcraftState {
  let state = initialState;

  run((command) => {
    state = toolcraftReducer(state, command);
  });

  return state;
}

describe("settings transfer", () => {
  it("creates and parses a versioned app-specific payload", () => {
    const schema = createSettingsSchema();
    const state = createToolcraftState(schema, {
      values: {
        "generation.prompt": "Exported prompt",
        "panels.timeline.extended": true,
        "panels.timeline.visible": false,
        "style.opacity": 24,
      },
    });

    const payload = createToolcraftSettingsPayload(state);

    expect(payload).toMatchObject({
      appId: "settings-test",
      canvas: {
        size: { height: 720, unit: "px", width: 1280 },
      },
      source: "toolcraft-settings",
      values: {
        "generation.prompt": "Exported prompt",
        "style.opacity": 24,
      },
      version: 1,
    });
    expect(payload.values).not.toHaveProperty("panels.timeline.extended");
    expect(payload.values).not.toHaveProperty("panels.timeline.visible");
    expect(parseToolcraftSettingsPayload(schema, payload)).toEqual(payload);
    expect(
      parseToolcraftSettingsPayload(
        schema,
        { ...payload, appId: "other-app" },
      ),
    ).toBeNull();
  });

  it("applies imported values, canvas size, and timeline through runtime commands", () => {
    const schema = createSettingsSchema();
    const initialState = createToolcraftState(schema, {
      timeline: {
        currentTimeSeconds: 0,
        durationSeconds: 8,
        expanded: false,
        isLooping: true,
        isPlaying: true,
      },
      values: {
        "generation.prompt": "Initial prompt",
        "style.opacity": 75,
      },
    });
    const payload = {
      ...createToolcraftSettingsPayload(initialState),
      canvas: {
        size: { height: 900, unit: "px" as const, width: 1600 },
      },
      timeline: {
        currentTimeSeconds: 3,
        durationSeconds: 12,
        expanded: true,
        isLooping: false,
        isPlaying: false as const,
      },
      values: {
        "generation.prompt": "Imported prompt",
        "unknown.target": "Ignored",
      },
    };

    const state = reduceWithCommands(initialState, (dispatch) => {
      applyToolcraftSettingsPayload({ dispatch, state: initialState }, payload);
    });

    expect(state.values["generation.prompt"]).toBe("Imported prompt");
    expect(state.values["unknown.target"]).toBeUndefined();
    expect(state.values["canvas.aspectRatio"]).toEqual({
      height: 9,
      mode: "custom",
      value: "16:9",
      width: 16,
    });
    expect(state.canvas.size).toEqual({ height: 900, unit: "px", width: 1600 });
    expect(state.timeline).toMatchObject({
      currentTimeSeconds: 3,
      durationSeconds: 12,
      expanded: true,
      isLooping: false,
      isPlaying: false,
    });
    expect(state.history.undo).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: "settings.import",
          label: "Import settings",
        }),
      ]),
    );
  });
});
