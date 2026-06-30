"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarBlankIcon,
  ChatsCircleIcon,
  ClockIcon,
  CpuIcon,
  FileTextIcon,
  ListChecksIcon,
  PlusIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { AgentDefinition, AgentTrigger } from "@ssota/contracts";
import { blockNoteContentToText } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Switch } from "@ssota/ui/components/ui/switch";
import { updateAgentDefinitionAction } from "@/app/actions";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { ScheduleSheetPanel } from "@/components/schedules/schedule-sheet-panel";
import {
  AgentSettingCard,
  AgentSettingEmpty,
  AgentSettingItem,
  AgentSettingItems,
} from "@/components/console/agent-setting-card";
import {
  AgentSettingsDialogs,
  type AgentSettingsDialogKind,
  type AgentSettingsDraft,
} from "@/components/console/agent-settings-dialogs";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorDef } from "@/lib/connect/connectors";
import {
  TRIGGER_LABELS,
  mergeToolBundles,
} from "@/lib/console/agent-tool-catalog";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/lib/chat/models";
import { describeRecurrence, cronToRecurrence } from "@/lib/schedules/recurrence";

type AgentSettingsSheetProps = {
  definition: AgentDefinition;
  teamspaceId: string;
  accountId: string;
  scriptToolIds: string[];
  scriptTools: Array<{ id: string; key: string; name: string }>;
  workers: AgentDefinition[];
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  schedules: AgentScheduleSummary[];
  onClose: () => void;
};

const CARD_TRIGGER_TYPES: AgentTrigger[] = ["chatbot", "task"];

const TRIGGER_ICONS: Partial<Record<AgentTrigger, typeof ChatsCircleIcon>> = {
  chatbot: ChatsCircleIcon,
  task: ListChecksIcon,
  schedule: CalendarBlankIcon,
};

function buildDraft(
  definition: AgentDefinition,
  scriptToolIds: string[],
  schedules: AgentScheduleSummary[],
): AgentSettingsDraft {
  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );
  return {
    instructions: definition.instructions,
    toolBundles: mergeToolBundles(definition.toolBundles),
    allowedTriggers: definition.runPolicy.allowedTriggers ?? [],
    model: definition.runPolicy.model ?? DEFAULT_MODEL_ID,
    scriptToolIds,
    linkedWorkerAgentIds: definition.runPolicy.linkedWorkerAgentIds ?? [],
    enabledConnectorProviders:
      definition.runPolicy.enabledConnectorProviders ?? [],
    scheduleEnabledById: Object.fromEntries(
      agentSchedules.map((s) => [s.id, s.enabled]),
    ),
  };
}

export function AgentSettingsSheet({
  definition,
  teamspaceId,
  accountId,
  scriptToolIds: initialScriptToolIds,
  scriptTools,
  workers,
  connectors,
  connections,
  schedules,
  onClose,
}: AgentSettingsSheetProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() =>
    buildDraft(definition, initialScriptToolIds, schedules),
  );
  const [openDialog, setOpenDialog] = useState<AgentSettingsDialogKind | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(buildDraft(definition, initialScriptToolIds, schedules));
  }, [definition, initialScriptToolIds, schedules]);

  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );

  const instructionPreview = useMemo(() => {
    const text = blockNoteContentToText(draft.instructions).trim();
    if (!text) return null;
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }, [draft.instructions]);

  const toggleTrigger = (trigger: AgentTrigger, enabled: boolean) => {
    const next = new Set(draft.allowedTriggers);
    if (enabled) next.add(trigger);
    else next.delete(trigger);
    patchDraft({ allowedTriggers: [...next] });
  };

  const toggleScheduleEnabled = (scheduleId: string, enabled: boolean) => {
    patchDraft({
      scheduleEnabledById: {
        ...draft.scheduleEnabledById,
        [scheduleId]: enabled,
      },
    });
  };

  const modelLabel =
    MODEL_OPTIONS.find((m) => m.id === draft.model)?.label ?? "Auto";

  const modelProvider =
    MODEL_OPTIONS.find((m) => m.id === draft.model)?.provider ?? "";

  const connectedProviders = useMemo(() => {
    const map = new Map<string, ConnectorConnection[]>();
    for (const c of connections.user) {
      const list = map.get(c.connector) ?? [];
      list.push(c);
      map.set(c.connector, list);
    }
    for (const c of connections.org) {
      const list = map.get(c.connector) ?? [];
      list.push(c);
      map.set(c.connector, list);
    }
    return map;
  }, [connections]);

  const linkedScriptTools = scriptTools.filter((t) =>
    draft.scriptToolIds.includes(t.id),
  );

  const enabledConnectors = connectors.filter((c) =>
    draft.enabledConnectorProviders.includes(c.provider),
  );

  const patchDraft = (patch: Partial<AgentSettingsDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const bundles = mergeToolBundles(draft.toolBundles);
      if (draft.linkedWorkerAgentIds.length > 0 && !bundles.includes("delegate")) {
        bundles.push("delegate");
      }

      await updateAgentDefinitionAction(teamspaceId, {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        instructions: draft.instructions,
        isMain: definition.isMain,
        referenceOnly: definition.referenceOnly,
        toolBundles: bundles,
        runPolicy: {
          ...definition.runPolicy,
          model: draft.model,
          allowedTriggers: draft.allowedTriggers,
          linkedWorkerAgentIds: draft.linkedWorkerAgentIds,
          enabledConnectorProviders: draft.enabledConnectorProviders,
        },
        scriptToolIds: draft.scriptToolIds,
      });

      const schedulePatches = agentSchedules.filter(
        (schedule) =>
          draft.scheduleEnabledById[schedule.id] !== undefined &&
          draft.scheduleEnabledById[schedule.id] !== schedule.enabled,
      );
      await Promise.all(
        schedulePatches.map((schedule) =>
          fetch(`/api/schedules/${schedule.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamspaceId,
              accountId,
              enabled: draft.scheduleEnabledById[schedule.id],
            }),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to update schedule (${res.status})`);
            }
          }),
        ),
      );
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <ScheduleSheetPanel
        title="Settings"
        subtitle={definition.name}
        sheetSize="inspector"
        onClose={onClose}
        footer={
          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={handleSave}
            data-testid="agent-settings-save"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        }
      >
        <div
          className="space-y-3"
          data-testid="agent-settings-sheet"
        >
          <AgentSettingCard
            title="Triggers"
            description="When should this agent run?"
            testId="agent-settings-triggers-card"
            onOpen={() => setOpenDialog("triggers")}
            footer={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2"
                data-testid="agent-triggers-add-schedule"
                onClick={() => setOpenDialog("add-schedule")}
              >
                <PlusIcon className="size-3.5" aria-hidden />
                Add schedule
              </Button>
            }
          >
            <AgentSettingItems>
              {CARD_TRIGGER_TYPES.map((trigger) => {
                const Icon = TRIGGER_ICONS[trigger] ?? ChatsCircleIcon;
                const enabled = draft.allowedTriggers.includes(trigger);
                return (
                  <AgentSettingItem
                    key={trigger}
                    icon={<Icon className="size-3.5 text-muted-foreground" />}
                    title={TRIGGER_LABELS[trigger]}
                    trailing={
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          toggleTrigger(trigger, checked)
                        }
                        data-testid={`agent-trigger-${trigger}`}
                        aria-label={TRIGGER_LABELS[trigger]}
                      />
                    }
                  />
                );
              })}
              {agentSchedules.map((schedule) => {
                const rec = cronToRecurrence(
                  schedule.cronExpression,
                  schedule.timezone,
                );
                const label = rec
                  ? describeRecurrence(rec)
                  : schedule.cronExpression;
                const enabled =
                  draft.scheduleEnabledById[schedule.id] ?? schedule.enabled;
                return (
                  <AgentSettingItem
                    key={schedule.id}
                    icon={
                      <ClockIcon className="size-3.5 text-muted-foreground" />
                    }
                    title={label}
                    subtitle="Cron schedule"
                    trailing={
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          toggleScheduleEnabled(schedule.id, checked)
                        }
                        data-testid={`agent-schedule-${schedule.id}`}
                        aria-label={label}
                      />
                    }
                  />
                );
              })}
            </AgentSettingItems>
          </AgentSettingCard>

          <AgentSettingCard
            title="Instructions"
            description="What should the agent do every time it runs?"
            testId="agent-settings-instructions-card"
            onOpen={() => setOpenDialog("instructions")}
          >
            {instructionPreview ? (
              <AgentSettingItems>
                <AgentSettingItem
                  icon={
                    <FileTextIcon className="size-3.5 text-muted-foreground" />
                  }
                  title="Current instructions"
                  subtitle={instructionPreview}
                />
              </AgentSettingItems>
            ) : (
              <AgentSettingEmpty>No instructions yet</AgentSettingEmpty>
            )}
          </AgentSettingCard>

          <AgentSettingCard
            title="Tools and access"
            description="Composio connectors and TypeScript scripts for this agent."
            testId="agent-settings-tools-card"
            onOpen={() => setOpenDialog("tools")}
          >
            {enabledConnectors.length === 0 && linkedScriptTools.length === 0 ? (
              <AgentSettingEmpty>
                No connectors or scripts selected yet
              </AgentSettingEmpty>
            ) : (
              <AgentSettingItems>
                {enabledConnectors.map((connector) => {
                  const connected = connectedProviders.has(connector.provider);
                  const count =
                    connectedProviders.get(connector.provider)?.length ?? 0;
                  return (
                    <AgentSettingItem
                      key={connector.provider}
                      icon={
                        <ConnectorBrandIcon
                          provider={connector.provider}
                          className="size-3.5"
                        />
                      }
                      title={connector.label}
                      subtitle={
                        connected ? "Composio connector" : "Enabled — not connected"
                      }
                      trailing={
                        connected
                          ? count > 1
                            ? `${count} accounts`
                            : "Connected"
                          : "Pending"
                      }
                    />
                  );
                })}
                {linkedScriptTools.map((tool) => (
                  <AgentSettingItem
                    key={tool.id}
                    icon={
                      <WrenchIcon className="size-3.5 text-muted-foreground" />
                    }
                    title={tool.name}
                    subtitle={tool.key}
                    trailing="TypeScript"
                  />
                ))}
              </AgentSettingItems>
            )}
          </AgentSettingCard>

          <AgentSettingCard
            title="Model"
            description="Default model for agent runs."
            testId="agent-settings-model-card"
            onOpen={() => setOpenDialog("model")}
          >
            <AgentSettingItems>
              <AgentSettingItem
                icon={<CpuIcon className="size-3.5 text-muted-foreground" />}
                title={modelLabel}
                subtitle={modelProvider || "Default model"}
              />
            </AgentSettingItems>
          </AgentSettingCard>
        </div>
      </ScheduleSheetPanel>

      <AgentSettingsDialogs
        definition={definition}
        draft={draft}
        onDraftChange={patchDraft}
        workers={workers}
        scriptTools={scriptTools}
        connectors={connectors}
        connections={connections}
        schedules={schedules}
        teamspaceId={teamspaceId}
        accountId={accountId}
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
      />
    </>
  );
}
