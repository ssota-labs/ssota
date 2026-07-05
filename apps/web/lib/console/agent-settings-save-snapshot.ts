import type { AgentTrigger, ToolBundle, AgentConnectorBinding } from "@ssota/contracts";
import { deriveEnabledConnectorProviders } from "@ssota/contracts";
import type { AgentSettingsDraft } from "@/components/console/agent-settings-dialogs";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { mergeToolBundles } from "@/lib/console/agent-tool-catalog";
import { normalizeConnectorBindingForSnapshot } from "@/lib/console/agent-connector-bindings";

export type AgentSettingsSaveSnapshot = {
  name: string;
  description: string;
  instructionsJson: string;
  toolBundles: ToolBundle[];
  allowedTriggers: AgentTrigger[];
  model: string;
  linkedWorkerIds: string[];
  linkedWorkerAgentIds: string[];
  connectorBindingsJson: string;
  enabledConnectorProviders: string[];
  connectionTriggersJson: string;
  scheduleEnabledJson: string;
  boundSkillIds: string[];
};

function sortStrings(values: string[]): string[] {
  return [...values].sort();
}

function sortTriggers(values: AgentTrigger[]): AgentTrigger[] {
  return [...values].sort();
}

/** Mirrors handleSave normalization for allowedTriggers. */
export function resolveAllowedTriggersForSave(
  draft: AgentSettingsDraft,
  agentSchedules: AgentScheduleSummary[],
  settingsTarget: "main" | "agent" = "agent",
): AgentTrigger[] {
  const allowedTriggers: AgentTrigger[] = Array.from(
    new Set<AgentTrigger>([...draft.allowedTriggers, "chat"]),
  ).filter((trigger) => settingsTarget !== "main" || trigger !== "task");
  if (agentSchedules.length > 0 && !allowedTriggers.includes("schedule")) {
    allowedTriggers.push("schedule");
  }
  if (
    draft.connectionTriggers.some((trigger) => trigger.enabled) &&
    !allowedTriggers.includes("chatbot")
  ) {
    allowedTriggers.push("chatbot");
  }
  return sortTriggers(allowedTriggers);
}

export function resolveToolBundlesForSave(draft: AgentSettingsDraft): ToolBundle[] {
  const bundles = mergeToolBundles(draft.toolBundles);
  if (
    draft.linkedWorkerAgentIds.length > 0 &&
    !bundles.includes("delegate")
  ) {
    bundles.push("delegate");
  }
  return [...bundles].sort() as ToolBundle[];
}

function resolveScheduleEnabled(
  draft: AgentSettingsDraft,
  agentSchedules: AgentScheduleSummary[],
): Record<string, boolean> {
  return Object.fromEntries(
    agentSchedules.map((schedule) => [
      schedule.id,
      draft.scheduleEnabledById[schedule.id] ?? schedule.enabled,
    ]),
  );
}

function stableConnectionTriggersJson(
  triggers: AgentSettingsDraft["connectionTriggers"],
): string {
  const sorted = [...triggers].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(sorted);
}

function stableScheduleEnabledJson(
  scheduleEnabled: Record<string, boolean>,
): string {
  const sortedEntries = Object.entries(scheduleEnabled).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return JSON.stringify(Object.fromEntries(sortedEntries));
}

function stableConnectorBindingsJson(
  bindings: AgentConnectorBinding[],
): string {
  const sorted = [...bindings]
    .map(normalizeConnectorBindingForSnapshot)
    .sort((a, b) => {
      const keyA = `${a.scope}:${a.connectionId}`;
      const keyB = `${b.scope}:${b.connectionId}`;
      return keyA.localeCompare(keyB);
    });
  return JSON.stringify(sorted);
}

export function resolveConnectorBindingsForSave(
  draft: AgentSettingsDraft,
): AgentConnectorBinding[] {
  return [...draft.connectorBindings]
    .map(normalizeConnectorBindingForSnapshot)
    .sort((a, b) => {
      const keyA = `${a.scope}:${a.connectionId}`;
      const keyB = `${b.scope}:${b.connectionId}`;
      return keyA.localeCompare(keyB);
    });
}

/** Serializable snapshot of what Save would persist. */
export function buildAgentSettingsSaveSnapshot(
  draft: AgentSettingsDraft,
  agentSchedules: AgentScheduleSummary[],
  settingsTarget: "main" | "agent" = "agent",
): AgentSettingsSaveSnapshot {
  const scheduleEnabled = resolveScheduleEnabled(draft, agentSchedules);
  const connectorBindings = resolveConnectorBindingsForSave(draft);
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    instructionsJson: JSON.stringify(draft.instructions),
    toolBundles: resolveToolBundlesForSave(draft),
    allowedTriggers: resolveAllowedTriggersForSave(
      draft,
      agentSchedules,
      settingsTarget,
    ),
    model: draft.model,
    linkedWorkerIds: sortStrings(draft.linkedWorkerIds),
    linkedWorkerAgentIds: sortStrings(draft.linkedWorkerAgentIds),
    connectorBindingsJson: stableConnectorBindingsJson(connectorBindings),
    enabledConnectorProviders: deriveEnabledConnectorProviders({
      connectorBindings,
    }),
    connectionTriggersJson: stableConnectionTriggersJson(
      draft.connectionTriggers,
    ),
    scheduleEnabledJson: stableScheduleEnabledJson(scheduleEnabled),
    boundSkillIds: sortStrings(draft.boundSkillIds),
  };
}

export function agentSettingsSnapshotsEqual(
  left: AgentSettingsSaveSnapshot,
  right: AgentSettingsSaveSnapshot,
): boolean {
  return (
    left.name === right.name &&
    left.description === right.description &&
    left.instructionsJson === right.instructionsJson &&
    JSON.stringify(left.toolBundles) === JSON.stringify(right.toolBundles) &&
    JSON.stringify(left.allowedTriggers) ===
      JSON.stringify(right.allowedTriggers) &&
    left.model === right.model &&
    JSON.stringify(left.linkedWorkerIds) === JSON.stringify(right.linkedWorkerIds) &&
    JSON.stringify(left.linkedWorkerAgentIds) ===
      JSON.stringify(right.linkedWorkerAgentIds) &&
    left.connectorBindingsJson === right.connectorBindingsJson &&
    JSON.stringify(left.enabledConnectorProviders) ===
      JSON.stringify(right.enabledConnectorProviders) &&
    left.connectionTriggersJson === right.connectionTriggersJson &&
    left.scheduleEnabledJson === right.scheduleEnabledJson &&
    JSON.stringify(left.boundSkillIds) === JSON.stringify(right.boundSkillIds)
  );
}

export function isAgentSettingsDraftDirty(
  draft: AgentSettingsDraft,
  savedDraft: AgentSettingsDraft,
  agentSchedules: AgentScheduleSummary[],
  settingsTarget: "main" | "agent" = "agent",
): boolean {
  const current = buildAgentSettingsSaveSnapshot(
    draft,
    agentSchedules,
    settingsTarget,
  );
  const saved = buildAgentSettingsSaveSnapshot(
    savedDraft,
    agentSchedules,
    settingsTarget,
  );
  return !agentSettingsSnapshotsEqual(current, saved);
}
