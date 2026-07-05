import { describe, expect, it } from "vitest";
import {
  SLACK_AGENT_MENTION_ADDABLE_TRIGGER_ID,
  addTriggerExcludeIdsForSettingsTarget,
  filterAddableTriggerGroups,
  ADDABLE_TRIGGER_GROUPS,
} from "./agent-trigger-catalog";

describe("addTriggerExcludeIdsForSettingsTarget", () => {
  it("hides Slack agent mention for main agent settings", () => {
    const excludeIds = addTriggerExcludeIdsForSettingsTarget("main", []);
    const groups = filterAddableTriggerGroups(
      ADDABLE_TRIGGER_GROUPS,
      "",
      excludeIds,
    );

    expect(excludeIds.has(SLACK_AGENT_MENTION_ADDABLE_TRIGGER_ID)).toBe(true);
    expect(groups.some((group) => group.id === "slack")).toBe(false);
  });

  it("keeps Slack agent mention for runnable agent settings", () => {
    const excludeIds = addTriggerExcludeIdsForSettingsTarget("agent", []);
    const groups = filterAddableTriggerGroups(
      ADDABLE_TRIGGER_GROUPS,
      "",
      excludeIds,
    );

    expect(excludeIds.has(SLACK_AGENT_MENTION_ADDABLE_TRIGGER_ID)).toBe(false);
    expect(groups.some((group) => group.id === "slack")).toBe(true);
  });
});
