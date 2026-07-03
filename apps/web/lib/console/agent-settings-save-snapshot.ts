import type { AgentTrigger, ToolBundle } from "@ssota/contracts";
import type { AgentSettingsDraft } from "@/components/console/agent-settings-dialogs";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { mergeToolBundles } from "@/lib/console/agent-tool-catalog";

export type AgentSettingsSaveSnapshot = {
  instructionsJson: string;
  toolBundles: ToolBundle[];
  allowedTriggers: AgentTrigger[];
  model: string;
  scriptToolIds: string[];
  linkedWorkerAgentIds: string[];
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
): AgentTrigger[] {
  const allowedTriggers: AgentTrigger[] = Array.from(
    new Set<AgentTrigger>([...draft.allowedTriggers, "chat"]),
  );
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

/** Serializable snapshot of what Save would persist. */
export function buildAgentSettingsSaveSnapshot(
  draft: AgentSettingsDraft,
  agentSchedules: AgentScheduleSummary[],
): AgentSettingsSaveSnapshot {
  const scheduleEnabled = resolveScheduleEnabled(draft, agentSchedules);
  return {
    instructionsJson: JSON.stringify(draft.instructions),
    toolBundles: resolveToolBundlesForSave(draft),
    allowedTriggers: resolveAllowedTriggersForSave(draft, agentSchedules),
    model: draft.model,
    scriptToolIds: sortStrings(draft.scriptToolIds),
    linkedWorkerAgentIds: sortStrings(draft.linkedWorkerAgentIds),
    enabledConnectorProviders: sortStrings(draft.enabledConnectorProviders),
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
    left.instructionsJson === right.instructionsJson &&
    JSON.stringify(left.toolBundles) === JSON.stringify(right.toolBundles) &&
    JSON.stringify(left.allowedTriggers) ===
      JSON.stringify(right.allowedTriggers) &&
    left.model === right.model &&
    JSON.stringify(left.scriptToolIds) === JSON.stringify(right.scriptToolIds) &&
    JSON.stringify(left.linkedWorkerAgentIds) ===
      JSON.stringify(right.linkedWorkerAgentIds) &&
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
): boolean {
  const current = buildAgentSettingsSaveSnapshot(draft, agentSchedules);
  const saved = buildAgentSettingsSaveSnapshot(savedDraft, agentSchedules);
  return !agentSettingsSnapshotsEqual(current, saved);
}
