import type { ReactNode } from "react";

export type AddableTriggerAction = "schedule" | "connection";

export type AddableTriggerDef = {
  id: string;
  groupId: string;
  groupLabel: string;
  label: string;
  description: string;
  action: AddableTriggerAction;
  /** Composio toolkit slug for connection triggers. */
  provider?: string;
  /** Event kind within the provider (e.g. message_posted). */
  kind?: string;
};

export type AddableTriggerGroup = {
  id: string;
  label: string;
  items: AddableTriggerDef[];
};

/** Addable triggers shown in the agent settings "Add trigger" sidebar (new only). */
export const ADDABLE_TRIGGER_GROUPS: AddableTriggerGroup[] = [
  {
    id: "schedule",
    label: "Schedule",
    items: [
      {
        id: "schedule:cron",
        groupId: "schedule",
        groupLabel: "Schedule",
        label: "On a schedule",
        description:
          "Run this agent on a recurring cron schedule (daily, weekly, and more).",
        action: "schedule",
      },
    ],
  },
  {
    id: "slack",
    label: "Slack",
    items: [
      {
        id: "slack:agent_mentioned",
        groupId: "slack",
        groupLabel: "Slack",
        label: "Agent mentioned",
        description:
          "Run when this agent is @mentioned in Slack via a dedicated user group handle.",
        action: "connection",
        provider: "slack",
        kind: "agent_mentioned",
      },
    ],
  },
];

export const ALL_ADDABLE_TRIGGERS: AddableTriggerDef[] =
  ADDABLE_TRIGGER_GROUPS.flatMap((group) => group.items);

/** Hidden from main (project) agent Add trigger — Slack @mention is inbound by default. */
export const SLACK_AGENT_MENTION_ADDABLE_TRIGGER_ID = "slack:agent_mentioned";

export function addTriggerExcludeIdsForSettingsTarget(
  settingsTarget: "main" | "agent",
  alreadyAdded: Iterable<string>,
): Set<string> {
  const excludeIds = new Set(alreadyAdded);
  if (settingsTarget === "main") {
    excludeIds.add(SLACK_AGENT_MENTION_ADDABLE_TRIGGER_ID);
  }
  return excludeIds;
}

export function findAddableTrigger(id: string): AddableTriggerDef | undefined {
  return ALL_ADDABLE_TRIGGERS.find((t) => t.id === id);
}

export function filterAddableTriggerGroups(
  groups: AddableTriggerGroup[],
  query: string,
  excludeIds: Set<string>,
): AddableTriggerGroup[] {
  const q = query.trim().toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (excludeIds.has(item.id)) return false;
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.groupLabel.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      }),
    }))
    .filter((group) => group.items.length > 0);
}
