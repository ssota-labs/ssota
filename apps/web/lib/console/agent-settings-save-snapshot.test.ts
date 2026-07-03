import { describe, expect, it } from "vitest";
import type { AgentSettingsDraft } from "@/components/console/agent-settings-dialogs";
import {
  buildAgentSettingsSaveSnapshot,
  isAgentSettingsDraftDirty,
  resolveAllowedTriggersForSave,
} from "./agent-settings-save-snapshot";

const baseDraft = (): AgentSettingsDraft => ({
  instructions: [{ type: "paragraph", content: "Hello" }],
  toolBundles: ["graph.read"],
  allowedTriggers: ["chat", "task"],
  model: "auto",
  scriptToolIds: [],
  linkedWorkerAgentIds: [],
  enabledConnectorProviders: [],
  scheduleEnabledById: {},
  connectionTriggers: [],
  boundSkillIds: [],
});

describe("agent-settings-save-snapshot", () => {
  it("is not dirty when draft matches saved baseline", () => {
    const draft = baseDraft();
    expect(isAgentSettingsDraftDirty(draft, baseDraft(), [])).toBe(false);
  });

  it("is dirty when task trigger is toggled", () => {
    const saved = baseDraft();
    const draft: AgentSettingsDraft = {
      ...saved,
      allowedTriggers: ["chat"],
    };
    expect(isAgentSettingsDraftDirty(draft, saved, [])).toBe(true);
  });

  it("forces schedule trigger when schedules exist", () => {
    const draft: AgentSettingsDraft = {
      ...baseDraft(),
      allowedTriggers: ["chat", "task"],
    };
    const triggers = resolveAllowedTriggersForSave(draft, [
      {
        id: "sched-1",
        agentDefinitionId: "agent-1",
        cronExpression: "0 9 * * 1-5",
        timezone: "UTC",
        enabled: true,
      },
    ]);
    expect(triggers).toContain("schedule");
  });

  it("normalizes equivalent drafts to the same snapshot", () => {
    const left = buildAgentSettingsSaveSnapshot(baseDraft(), []);
    const right = buildAgentSettingsSaveSnapshot(
      { ...baseDraft(), allowedTriggers: ["task", "chat"] },
      [],
    );
    expect(left.allowedTriggers).toEqual(right.allowedTriggers);
  });
});
